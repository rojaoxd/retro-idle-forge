
# Object Builder no /dev/objects

Objetivo: transformar `/dev/objects` numa réplica fiel do **Object Builder** oficial e reduzir ~80% do trabalho manual de cadastrar sprites via dois importadores: **.obd** (arquivo nativo do OB) e **sheet PNG com fundo magenta** (export do OB).

## 1. Redesign da UI (réplica fiel)

Estrutura em 3 colunas + abas de categoria no topo, igual ao OB:

```text
┌─ Abas: [Items] [Outfits] [Effects] [Missiles] ────────────────────────┐
│ ┌─ Lista ─┐ ┌─ Aparência / Propriedades ─────────┐ ┌─ Sprite Pool ─┐ │
│ │  100    │ │ [Textura] [Propriedades]           │ │   0  1  2  3  │ │
│ │  101 ✓  │ │                                    │ │   4  5  6  7  │ │
│ │  102    │ │      ← preview 2x/4x →             │ │   ...         │ │
│ │  103    │ │   (anim + direção + pattern)       │ │               │ │
│ │  104 ✓  │ │                                    │ │  drag → grid  │ │
│ │  ...    │ │  W:1 H:1 Layers:1 PX:1 PY:1 F:1    │ │               │ │
│ │ ‹ 102 › │ │  [Exibir Tamanho Exato] [Grades]   │ │  ‹ pag › nav  │ │
│ └─────────┘ └────────────────────────────────────┘ └───────────────┘ │
│ [+] [dup] [del] [import .obd] [import PNG] [export .obd]              │
└───────────────────────────────────────────────────────────────────────┘
```

Aba **Textura** = composição (drop de sprites por célula/frame/pattern) + toggles "Exibir Tamanho Exato" e "Exibir Grades".
Aba **Propriedades** = todas as flags do `.dat` agrupadas (Collision, Behavior, Ground, Height, Light, Misc) igual OB, com editores condicionais (Light aparece só se `hasLight`).

Categoria vem de `object_kind`:
- Items → `item | ground | container | weapon | armor | fluid | splash | deco | wall`
- Outfits → `creature` (com `pattern_x=4` p/ direções, `pattern_y` p/ addons, animações)
- Effects → `effect`
- Missiles → `effect` com flag `isMissile` (nova flag no `flags` JSON)

Numeração por ID: exibimos o `client_id` (100, 101…) igual OB, atribuído automaticamente por categoria (próximo livre).

Preview central: canvas com controles de **direção** (setas ‹ ›), **frame de animação** (barra 1/N) e **pattern layers**, replicando os widgets do OB.

## 2. Importador de sheet PNG (magenta → alpha)

Fluxo "Import PNG" abre modal:

1. Upload da imagem (ex.: `outfit1_35.png`, `outfit_2.png`).
2. Auto-detecta grid: usuário confirma **cell size** (default 32), **columns/rows** (calculado por `img.w/32`).
3. Cliente:
   - Carrega em `<canvas>`, varre pixels e substitui `#FF00FF` (tolerância ±2) por alpha 0.
   - Corta em N sub-imagens 32×32, faz hash SHA-1 de cada tile.
   - Deduplica tiles idênticos (comum em outfits com frames repetidos).
4. Upload das tiles para bucket `game-sprites` (uma imagem por sprite) via server fn `importSpriteSheet`.
5. Cria linhas em `game_sprites` (uma por tile único) e devolve `sprite_id[]` na ordem do grid.
6. Se o usuário estiver editando um objeto (ex.: outfit 2×1×4 direções × 3 frames), a UI **auto-preenche o grid de composição** mapeando linha/coluna → `(frame, pattern_x, cell_x, cell_y)` seguindo a convenção do Tibia:
   ```text
   ordem por sprite: cell_y → cell_x → layer → pattern_x → pattern_y → pattern_z → frame
   ```

Isso já cobre 80% do caso de uso — mesmo sem OBD, colar o PNG que o OB exporta cria sprites + monta o objeto.

## 3. Importador .obd (parser binário completo)

O `.obd` é um dump binário de **uma** ThingType do `.dat` do Tibia (protocolo 7.x–10.x) + sprites embutidos como blocos RGBA/RLE do `.spr`. Layout:

```text
[u16 version] [u8 category] [ThingType attributes...] [u8 0xFF end]
[u8 width][u8 height][u8 layers][u8 patternX][u8 patternY][u8 patternZ][u8 frames]
[for each sprite]:
  [u32 sprite_id? / inline flag]
  [u16 spriteDataLen] [spriteDataLen bytes: transparent RLE 32×32 RGBA]
```

Implementação:

- Novo módulo `src/lib/dev/obd/parser.ts` (client-side, roda no browser).
  - `parseObd(buffer, version): ParsedObd` — decodifica atributos (loop de opcodes 0x00–0xFF conforme versão), lê dimensões e frames, chama `decodeSprite()` para cada bloco (RLE do Tibia: alterna pixels transparentes e pixels coloridos até completar 1024 px).
  - `decodeSprite(bytes): Uint8ClampedArray` — 32×32×4 RGBA, magenta já resolvido (blocos transparentes explícitos).
- Opcode → flag map por versão (começamos 10.98, que é o mais usado). Tabela em `parser.opcodes.ts`.
- UI: botão "Import .obd" pede o arquivo + confirma versão do cliente (dropdown 7.6/8.6/10.98).
- Após parse: mostra **preview** do objeto reconstituído e um diff das flags detectadas → botão "Criar objeto".
- Ao confirmar, chama `importObd` (server fn) que:
  1. Sobe cada sprite 32×32 decodificado como PNG no bucket.
  2. Insere `game_sprites` + `game_object_sprites` (composição completa com frames/patterns).
  3. Insere `game_objects` com `object_kind` derivado da categoria OB, `client_id` livre, e `flags` do parser.

Se um `.obd` de um cliente diferente aparecer e nosso mapa de opcodes falhar, o parser lança erro claro ("versão X não suportada, use import PNG") e o usuário cai no fluxo 2.

## 4. Exportador .obd (bônus curto)

Depois que o parser existir, `exportObd(objectId)` re-encoda: escreve opcodes conhecidos das `flags`, dimensões, e re-encoda cada tile RGBA do sprite como bloco RLE. Botão "Export .obd" na toolbar. Escopo mínimo: só a versão 10.98.

## 5. Ajustes de schema/servidor

- Sem migration nova para categorias: outfit → `creature` (conforme resposta).
- Sim, uma migration curta:
  - Coluna `client_id` já existe. Vamos adicionar índice único por `(object_kind, client_id)` p/ evitar colisão entre importações e habilitar "próximo ID livre por categoria".
  - Índice `game_sprites(sha1)` novo (coluna `sha1 text unique nullable`) para deduplicar tiles ao importar sheets.
- Server functions novas em `src/lib/dev/objects.functions.ts`:
  - `nextClientId(kind)` — usa `MAX(client_id)+1` filtrando por kind.
  - `importSpriteSheet({ tiles: {sha1, base64Png}[] })` — insere sprites deduplicados, retorna `sprite_id[]`.
  - `importObd({ parsed, spriteIds, spriteMap })` — cria objeto + composição.

## 6. Detalhes técnicos

- **Fluxo do magenta**: canvas 2D, `getImageData`, loop `if r>250 && g<8 && b>250 → a=0`. Salva como PNG (`canvas.toBlob`).
- **Deduplicação**: hash `crypto.subtle.digest('SHA-1', pngBytes)` client-side.
- **Preview animado**: `requestAnimationFrame` com `frame_duration_ms` do objeto.
- **Direções (outfits)**: mapeamento `pattern_x = [N,E,S,W]`. UI mostra 4 setas.
- **Encoding OB**: os opcodes variam por versão; começamos 10.98 e documentamos em `parser.opcodes.ts` (fonte: OTTools/ObjectBuilder).
- **Segurança**: todas as server fns já passam por `assertAdmin`; mantemos.

## Ordem de implementação

1. Migration (`client_id` unique por kind, `sha1` em `game_sprites`).
2. UI redesign com abas + preview animado + Propriedades espelhando .dat.
3. Importador PNG (magenta + dedupe + auto-fill do grid).
4. Parser .obd + `importObd` (versão 10.98).
5. Exportador .obd (10.98) e botão na toolbar.

Se o parser .obd falhar com o seu arquivo, o import PNG já resolve o caso — não fica ninguém sem saída.
