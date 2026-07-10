## Etapa 1 — Corrigir o crash da página `/dev/objects`

O pacote `lzma` usa `__dirname` (Node-only). Trocar por **`lzma-web`** (WASM, browser-first).

- Remover `lzma` do package.json, instalar `lzma-web`.
- Ajustar `src/lib/dev/obd/parser.ts` pra usar `new LZMA().decompress(bytes)` (Promise).
- Remover shim `src/types/lzma.d.ts` (o novo pacote traz types).

Depois disso a página volta e o import `.obd` continua funcionando.

## Etapa 2 — Importador completo Tibia 7.4 (`.dat` + `.spr`)

Como a versão é a 7.4, os arquivos são **pequenos** (100KB + 9.6MB) e cabem inteiros na memória do browser. Sem streaming, sem chunking — bem mais simples.

### Formato Tibia 7.4 (referência técnica)

**Tibia.spr:**
```
u32 signature (0x41B9EA86 pra 7.4)
u16 spriteCount
u32[] spriteOffsets  (spriteCount entradas)
Em cada offset:
  u8[3]  color key (RGB transparente — ignorar)
  u16    dataSize
  u8[]   RLE data: [transparentPixels u16][coloredPixels u16][RGB bytes...] repete
```

**Tibia.dat:**
```
u32 signature (0x41BF619C pra 7.4)
u16 itemsCount    (IDs 100..100+count-1)
u16 outfitsCount  (IDs 1..count)
u16 effectsCount  (IDs 1..count)
u16 missilesCount (IDs 1..count)

Para cada ThingType, em ordem (items → outfits → effects → missiles):
  opcodes até 0xFF (terminator):
    0x00 Ground (speed u16)
    0x01 GroundBorder
    0x02 OnBottom / 0x03 OnTop
    0x04 Container
    0x05 Stackable
    0x06 ForceUse
    0x07 MultiUse
    0x08 Writable (max u16)
    0x09 WritableOnce (max u16)
    0x0A FluidContainer
    0x0B Splash
    0x0C BlockSolid
    0x0D BlockProjectile
    0x0E BlockPathfind
    0x0F Pickupable
    0x10 Hangable
    0x11 HookSouth
    0x12 HookEast
    0x13 Rotatable
    0x14 Light (level u16, color u16)
    0x15 DontHide
    0x16 FloorChange
    0x17 HasOffset (offsetX u16, offsetY u16)
    0x18 HasElevation (elevation u16)
    0x19 LyingCorpse
    0x1A AnimateAlways
    0x1B MinimapColor (color u16)
    0x1C LensHelp (opt u16)
    0x1D FullGround
    0x1E IgnoreLook
    0x1F Cloth (slot u16)
    0xFF LastFlag (fim)
  Depois: u8 width, u8 height, [u8 exactSize se w>1||h>1],
          u8 layers, u8 patternX, u8 patternY, u8 patternZ, u8 frames
          u16[] spriteIds (w*h*layers*pX*pY*pZ*frames entradas)
```

**Tibia.pic:** gráficos de UI (splash art, painéis, fonte bitmap). **Não usado no gameplay** — deixamos de fora do v1, mas fica registrado como fonte pra futuros temas visuais.

### Implementação

**Novos arquivos:**
- `src/lib/dev/tibia/sprReader.ts` — parseia header + tabela de offsets; expõe `getSprite(id) → Uint8Array RGBA 32×32` (RLE decoder, transparência via magenta chroma-key ou pixels não escritos).
- `src/lib/dev/tibia/datReader.ts` — parseia todos ThingTypes 7.4 com a tabela de opcodes acima; devolve `{ items[], outfits[], effects[], missiles[] }` com todas flags + geometria + sprite IDs.

**Servidor (`src/lib/dev/tibia.functions.ts`):**
- `importTibiaBatch({ sprites, objects, batchIndex, batchTotal })` — recebe batches (~200 objetos por vez) com sprites já decodificados em PNG base64 + linhas `game_objects` prontas. Faz dedupe SHA-1, upload em paralelo, insert em massa.

**UI nova (`src/routes/dev.objects.import-client.tsx`):**
- Dropzone pra 2 arquivos (`Tibia.dat` + `Tibia.spr`).
- Após parse local, mostra resumo: "3134 items, 255 outfits, 197 effects, 88 missiles, 9999 sprites".
- Filtros por categoria + range de IDs (ex: só items 2000..2500 pra testar).
- Toggle **Dry-run** (só mostra tabela do que seria importado, sem gravar).
- Botão "Importar tudo" → chama `importTibiaBatch` em loop com barra de progresso e log de erros.
- Ao terminar, invalida o cache do `/dev/objects` e o usuário vê tudo populado.

### Mapeamento flag → schema

Opcodes viram `flags` JSON no `game_objects`:
```
BlockSolid       → isSolid: true
BlockProjectile  → isBlockProjectile: true
BlockPathfind    → isBlockPath: true
Container        → isContainer: true
Stackable        → isStackable: true
Pickupable       → isPickupable: true
Rotatable        → isRotatable: true
Hangable         → isHangable: true
FullGround       → isFullGround: true
HasElevation     → hasHeight: true, elevation: N
Light            → hasLight: true, lightLevel: L, lightColor: C
LyingCorpse      → isLyingCorpse: true
AnimateAlways    → isAnimateAlways: true
Ground           → object_kind: "ground", speed: S
FluidContainer   → object_kind: "fluid"
Splash           → object_kind: "splash"
```

Outfits caem em `object_kind: "creature"` com `pattern_x = 4` (4 direções) automaticamente.
Missiles ganham `flags.isMissile: true`.

### Volume/performance esperado

- 3134 items × 1 sprite médio + 255 outfits × 12 + effects/missiles = ~15–20k sprite unique após dedupe.
- Cada sprite: 32×32 PNG ≈ 500–1500 bytes → total ~15MB upload.
- Batches de 200 objetos → ~20 chamadas ao servidor.
- Tempo estimado: **3–8 minutos** dependendo de latência do Supabase.
- Barra de progresso + botão "Cancelar" incluídos.

### Segurança e considerações

- Import só disponível pra role `admin` (já é a regra atual da página `/dev/objects`).
- `client_id` fica sendo o ID original do Tibia (item 100 = ground grass, etc.) — chave única no schema já existe.
- Se rodar 2×, o dedupe por SHA-1 no bucket evita sprites duplicados; objetos com mesmo `(object_kind, client_id)` são bloqueados pelo unique index — vamos usar UPSERT (`onConflict: object_kind,client_id`) pra permitir re-import atualizando propriedades.

## Ordem de execução

1. **Etapa 1** primeiro (5 min) — desbloqueia a página.
2. **Etapa 2 parte A**: parsers puros (`sprReader.ts` + `datReader.ts`) + testes rodando localmente contra os arquivos que você enviou. Sem UI ainda.
3. **Etapa 2 parte B**: função server + UI de import com dry-run e progresso.
4. **Validação**: rodar em dry-run primeiro, conferir contagens, depois import real.

## Perguntas antes de começar

1. **Import completo ou seletivo?** Recomendo começar dry-run + import só de items 100..500 (ground e paredes básicas) pra validar visualmente antes de mandar tudo.
2. **Tibia.pic**: deixamos parado agora (só UI do cliente) ou você quer que eu extraia algum recurso específico dele? (ex: splash art pra tela de login do seu OT).
