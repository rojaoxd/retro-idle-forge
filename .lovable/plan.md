# Plano: Carregar mapa Tiled + sprites no Phaser

## Arquivos enviados
- `firstglobalmapa.tmj` — mapa Tiled 50×50 tiles, tile 32×32, tileset `cenario` (imagem `nlbWl37.png`, 3×3 tiles, 9 tiles totais).
- `nlbWl37.png` — spritesheet do cenário.

## Passos

1. **Copiar assets para `public/assets/`** (servidos em `/assets/...`):
   - `firstglobalmapa.tmj` → `public/assets/mapa.json`
   - `nlbWl37.png` → `public/assets/sprites.png` (o `.tmj` já referencia `nlbWl37.png`, então vou salvar a imagem com esse nome também — `public/assets/nlbWl37.png` — e ajustar o loader para carregar pelo nome que o Tiled espera).

2. **Ajustar `src/game/scenes/GameScene.ts`**:
   - Trocar `SPRITES_URL` para `/assets/nlbWl37.png` e registrar o tileset com a chave `cenario` (que é o `name` do tileset no `.tmj`), casando com `map.addTilesetImage("cenario", "cenario")`.
   - Simplificar `buildWorld()`: assumir que o Tiled map carrega (mantendo fallback só se `hasTiledMap` for false).
   - Centralizar/limitar a câmera nos bounds do mapa (50×32 = 1600px de largura, 50×32 de altura) e fazer follow do container do player local.
   - Aumentar zoom (`cameras.main.setZoom(2)`) para ficar legível no viewport atual.

3. **Colyseus (`src/net/colyseus.ts` + `PhaserCanvas.tsx`)** — já está conectando em `ws://54.233.23.67:2567`, sala `game`, e sincronizando `x`/`y` via `room.send("move", {x, y})` com interpolação. Nada a mudar aqui além de garantir que o input use tiles de 32px (já usa) e que a câmera siga o player local.

4. **Substituir `GameCanvas` placeholder por `PhaserCanvas`** dentro do `GameShell` (ou verificar qual shell a rota `/` renderiza — `TibiaShell` usa `GameViewport`; conferir e trocar o mount para `PhaserCanvas` no viewport ativo).

## Detalhes técnicos

- Tiled JSON com `firstgid:1` → Phaser mapeia tile index `data[i] - 1` para frame do tileset (3 colunas × 3 linhas).
- `map.addTilesetImage(tilesetName, imageKey)` — o `tilesetName` deve bater com `"cenario"` do `.tmj`; o `imageKey` é o que registramos no `this.load.image(...)`.
- Sem colisão nesta iteração — só render + movimento livre em grid de 32px, servidor autoritativo via Colyseus.
- Não mexer em CRUD, auth, nem outros painéis.

## Fora de escopo
- Colisão por tile.
- Animações de sprite do personagem (continua retângulo colorido com nick).
- Editor de mapa no /dev.
