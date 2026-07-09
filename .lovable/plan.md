# Plano: destravar Phaser, centralizar canvas e limpar overlay

## Diagnóstico
- `/assets/mapa.json` e `/assets/nlbWl37.png` **estão sim disponíveis** (HTTP 200 no dev server). O texto `[object ProgressEvent]` no canto superior esquerdo NÃO vem do Phaser — vem do `GameViewport`, que renderiza `netStore.error`. Um `WebSocket error` do Colyseus (`ws://54.233.23.67:2567`) vira `String(event) === "[object ProgressEvent]"`. Mesmo assim, vou endurecer o loader do mapa e a mensagem para não confundir.
- Tela preta: sem player local (Colyseus não conecta ou o servidor não emite `players`), a câmera não segue e o mapa até renderiza mas fica fora do viewport padrão da câmera do Phaser. Vou forçar a câmera a centralizar no centro do mapa como fallback.

## Mudanças

### 1. `src/game/scenes/GameScene.ts` — loader resiliente + câmera com fallback
- Trocar `load.tilemapTiledJSON` por `load.json("mapa-json", MAP_URL)` e construir o tilemap manualmente: `this.make.tilemap({ data, tileWidth:32, tileHeight:32 })` **não** funciona diretamente com dados Tiled; então uso `this.cache.tilemap.add("mapa", { format: Phaser.Tilemaps.Formats.TILED_JSON, data })` antes de `make.tilemap({ key: "mapa" })`. Isso ignora qualquer `image` interna do `.tmj` e o carregamento da imagem é 100% feito por `load.image(TILESET_IMAGE_KEY, TILESET_IMAGE_URL)`.
- Logar erro real de load (`file.src`, `file.key`) mas não empurrar para `netStore` — separar do erro de rede.
- No fallback (sem player local ainda) centralizar câmera: `cameras.main.centerOn(map.widthInPixels/2, map.heightInPixels/2)`.
- Converter mensagem de erro do WebSocket na `PhaserCanvas` de `String(e)` para `"conexão recusada"` quando for `Event`/`ProgressEvent` (elimina o `[object ProgressEvent]`).

### 2. `src/components/tibia/GameViewport.tsx` — canvas centralizado, sem overlay
- Remover **todo** o bloco de debug (título "Mythera 7.4", FPS, Latency, status/erro). Só sobra `<PhaserCanvas />`.
- Envolver `<PhaserCanvas />` num wrapper `flex items-center justify-center` com fundo preto, e limitar a área interna (mantém proporção 15×11 tiles do Tibia clássico ≈ 480×352 px, com `max-width` e `aspect-[15/11]`) para o canvas ficar centralizado dentro da área preta central. O Phaser (`scale.mode = RESIZE`) preenche esse container.

### 3. `src/components/tibia/PhaserCanvas.tsx` — sanitizar mensagem de erro
- Ao capturar erro do `joinGameRoom`, se `e` for um `Event` (não `Error`), reportar `"servidor indisponível"` em vez de `String(e)`.

## Fora de escopo
- Mexer no servidor Colyseus.
- Mudar sidebar, chat ou HUD lateral.
- Adicionar animações/sprites de personagem.
