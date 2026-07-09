# Integração Colyseus + Phaser 3

Conectar o cliente ao servidor Colyseus real, renderizar o mundo com Phaser 3 e sincronizar posições de jogadores em tempo real.

## 1. Dependências

```bash
bun add colyseus.js phaser
```

- `colyseus.js` — SDK oficial do cliente (nome correto do pacote; `@colyseus/sdk` não existe no npm).
- `phaser` — engine 2D com loader nativo de tilemaps Tiled.

## 2. Serviço de rede — `src/net/colyseus.ts`

Singleton que expõe o `Client` e a `Room` conectada:

```ts
import { Client, Room } from "colyseus.js";

const ENDPOINT = "ws://54.233.23.67:2567";
export const client = new Client(ENDPOINT);

export async function joinGameRoom(name: string): Promise<Room> {
  return client.joinOrCreate("game", { name });
}
```

- Conexão automática ao montar o `TibiaShell` via `useEffect`, usando `character.name` do `tibiaStore`.
- Guarda a `room` em um novo store `netStore` (Zustand) e expõe `send(type, payload)`.
- Reconecta ao desmontar (`room.leave()` no cleanup).
- Atualiza `server.latency` no `tibiaStore` a partir de pings periódicos (`room.send("ping")` opcional; se o servidor não suportar, usa `Date.now()` no round-trip do próximo `move`).

## 3. Renderizador Phaser — `src/components/tibia/PhaserCanvas.tsx`

Substitui o placeholder atual do `GameViewport`:

- Cria `new Phaser.Game({ type: Phaser.AUTO, parent: divRef, pixelArt: true, scale: { mode: Phaser.Scale.RESIZE } })`.
- Uma única cena `GameScene` com:
  - `preload()` — carrega `/assets/mapa.json` (Tiled) e `/assets/sprites.png` (tileset + sprites de jogadores).
  - `create()` — monta o tilemap, cria layer `ground` e `obstacles` a partir do JSON Tiled, e um `Phaser.GameObjects.Group` para jogadores.
  - `update()` — apenas interpolação suave (`lerp`) entre posição atual e alvo enviado pelo servidor.

Estrutura de assets esperada (criada como pastas vazias, com README explicando onde colar os arquivos que o usuário enviará):

```text
public/assets/
  mapa.json      (Tiled export)
  sprites.png    (tileset + player sprites)
```

Enquanto os arquivos reais não chegam, o loader tem fallback para um tilemap gerado in-memory (grid 20x15 de tiles marrom/verde) e um retângulo colorido por jogador — o jogo já roda ponta-a-ponta sem os assets.

## 4. Sincronização de jogadores

No `create()` da cena, após juntar-se à sala:

```ts
room.state.players.onAdd((player, sessionId) => {
  const sprite = this.add.sprite(player.x, player.y, "sprites", 0);
  sprite.setData("target", { x: player.x, y: player.y });
  this.players.set(sessionId, sprite);

  player.onChange = () => {
    sprite.setData("target", { x: player.x, y: player.y });
  };
});

room.state.players.onRemove((_, sessionId) => {
  this.players.get(sessionId)?.destroy();
  this.players.delete(sessionId);
});
```

- `MapSchema<Player>` com `{ x, y, name }` (schema padrão confirmado).
- O sprite do próprio jogador (`room.sessionId`) recebe uma tint diferente e uma label com o nome sobreposta.
- `update(dt)` interpola cada sprite: `sprite.x += (target.x - sprite.x) * 0.2` — evita "teletransporte" visual.

## 5. Entrada de teclado (Setas + WASD)

Dentro de `GameScene.create()`:

```ts
this.cursors = this.input.keyboard!.createCursorKeys();
this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as Record<"W"|"A"|"S"|"D", Phaser.Input.Keyboard.Key>;
```

Loop de movimento com throttle (1 tile a cada ~150ms — típico Tibia):

```ts
if (this.time.now < this.nextMoveAt) return;
const me = room.state.players.get(room.sessionId);
if (!me) return;

let dx = 0, dy = 0;
if (this.cursors.left.isDown  || this.wasd.A.isDown) dx = -1;
if (this.cursors.right.isDown || this.wasd.D.isDown) dx =  1;
if (this.cursors.up.isDown    || this.wasd.W.isDown) dy = -1;
if (this.cursors.down.isDown  || this.wasd.S.isDown) dy =  1;

if (dx || dy) {
  room.send("move", { x: me.x + dx * TILE, y: me.y + dy * TILE });
  this.nextMoveAt = this.time.now + 150;
}
```

- **Predição local desativada** por padrão — quem manda na posição é o servidor (evita divergências / rubber-banding). A confirmação chega via `player.onChange` → sprite anima até o novo target.
- Foco: o canvas ganha `tabIndex={0}` e faz `focus()` no clique para que o teclado funcione mesmo com o chat presente.
- Bloqueio de teclado enquanto o input do chat está com foco (checa `document.activeElement`).

## 6. Integração com o layout existente

- `GameViewport.tsx` passa a renderizar `<PhaserCanvas />` no lugar do placeholder atual, mantendo o overlay de FPS / latência / título de servidor.
- `tibiaStore` ganha campos derivados atualizados pela rede: `server.fps` (do próprio Phaser via `game.loop.actualFps`) e `server.latency` (round-trip do move).
- Nenhuma alteração nos outros painéis (Minimap, Vitals, Chat) neste passo.

## 7. Detalhes técnicos

- **SSR**: Phaser toca em `window` no import. `PhaserCanvas.tsx` importa Phaser dinamicamente dentro de `useEffect` para não quebrar o build SSR do TanStack Start.
- **Cleanup**: `game.destroy(true)` + `room.leave()` no `useEffect` cleanup evita leaks em HMR.
- **Tipagem do state**: como o schema do servidor não está no cliente, criamos tipos "duck-typed" mínimos (`type PlayerState = { x: number; y: number; name: string }`) — quando o usuário enviar o schema real, substituímos por `import`s gerados.
- **CORS/WS**: `ws://` funcionará em preview HTTP; se o projeto for publicado em HTTPS, o browser bloqueará ws inseguro — nesse caso o servidor precisará expor `wss://`. Nota a comunicar após publicar.

## Arquivos criados / alterados

- **novo** `src/net/colyseus.ts` — cliente + `joinGameRoom`.
- **novo** `src/stores/netStore.ts` — guarda `room`, `sessionId`, `connectionStatus`.
- **novo** `src/components/tibia/PhaserCanvas.tsx` — mount do Phaser + `GameScene`.
- **novo** `src/game/scenes/GameScene.ts` — cena Phaser com tilemap, players, input, sync.
- **novo** `public/assets/README.md` — instruções para colar `mapa.json` e `sprites.png`.
- **edit** `src/components/tibia/GameViewport.tsx` — troca placeholder por `PhaserCanvas`.
- **edit** `src/stores/tibiaStore.ts` — expõe setters para `server.fps` / `server.latency`.
- **edit** `package.json` / `bun.lock` — via `bun add colyseus.js phaser`.
