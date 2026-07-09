import Phaser from "phaser";
import type { Room } from "colyseus.js";

const TILE = 32;
const MOVE_COOLDOWN_MS = 150;
const MAP_URL = "/assets/mapa.json";
const SPRITES_URL = "/assets/sprites.png";

type PlayerLike = { x: number; y: number; name: string };
type PlayersMap = {
  onAdd: (cb: (player: PlayerLike, sessionId: string) => void) => void;
  onRemove: (cb: (player: PlayerLike, sessionId: string) => void) => void;
  get: (sessionId: string) => PlayerLike | undefined;
  forEach: (cb: (player: PlayerLike, sessionId: string) => void) => void;
};

type PlayerVisual = {
  container: Phaser.GameObjects.Container;
  target: { x: number; y: number };
  label: Phaser.GameObjects.Text;
};

export type GameSceneInit = {
  room: Room;
  onLatency?: (ms: number) => void;
  onFps?: (fps: number) => void;
};

export class GameScene extends Phaser.Scene {
  private room!: Room;
  private players = new Map<string, PlayerVisual>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private nextMoveAt = 0;
  private lastMoveSentAt = 0;
  private onLatency?: (ms: number) => void;
  private onFps?: (fps: number) => void;
  private fpsTimer = 0;
  private hasSprites = false;
  private hasTiledMap = false;

  constructor() {
    super("GameScene");
  }

  init(data: GameSceneInit) {
    this.room = data.room;
    this.onLatency = data.onLatency;
    this.onFps = data.onFps;
  }

  preload() {
    // Tenta carregar assets reais; falhas viram fallback.
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      if (file.key === "sprites") this.hasSprites = false;
      if (file.key === "mapa") this.hasTiledMap = false;
    });
    this.load.image("sprites", SPRITES_URL);
    this.load.tilemapTiledJSON("mapa", MAP_URL);
    this.load.on("filecomplete-image-sprites", () => (this.hasSprites = true));
    this.load.on("filecomplete-tilemapTiledJSON-mapa", () => (this.hasTiledMap = true));
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");
    this.buildWorld();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;

    this.wireRoom();
  }

  private buildWorld() {
    if (this.hasTiledMap) {
      try {
        const map = this.make.tilemap({ key: "mapa" });
        const firstTileset = map.tilesets[0]?.name ?? "sprites";
        const ts = map.addTilesetImage(firstTileset, "sprites");
        if (ts) {
          map.layers.forEach((l) => map.createLayer(l.name, ts, 0, 0));
        }
        return;
      } catch (e) {
        console.warn("[GameScene] Tiled map falhou, usando fallback:", e);
      }
    }
    // Fallback: grid procedural 30x20.
    const g = this.add.graphics();
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 30; x++) {
        const r = Math.random();
        let color = 0x2e6b2a; // grama
        if (r < 0.18) color = 0x7a5a30; // terra
        else if (r < 0.22) color = 0x555555; // pedra (obstáculo visual)
        g.fillStyle(color, 1);
        g.fillRect(x * TILE, y * TILE, TILE, TILE);
        g.lineStyle(1, 0x000000, 0.15);
        g.strokeRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }

  private wireRoom() {
    const state = this.room.state as { players?: PlayersMap };
    const players = state?.players;
    if (!players) {
      console.warn("[GameScene] room.state.players não disponível ainda.");
      // Tenta novamente quando o state chegar.
      this.room.onStateChange.once(() => this.wireRoom());
      return;
    }

    const addPlayer = (p: PlayerLike, sessionId: string) => {
      if (this.players.has(sessionId)) return;
      const isMe = sessionId === this.room.sessionId;
      const container = this.add.container(p.x, p.y);
      let body: Phaser.GameObjects.GameObject;
      if (this.hasSprites) {
        const s = this.add.sprite(0, 0, "sprites", 0);
        if (isMe) s.setTint(0x9ad4ff);
        body = s;
      } else {
        const rect = this.add.rectangle(0, 0, TILE - 4, TILE - 4, isMe ? 0x4fa4ff : 0xd4b46a);
        rect.setStrokeStyle(1, 0x000000);
        body = rect;
      }
      const label = this.add.text(0, -TILE / 2 - 8, p.name ?? "?", {
        fontFamily: "Verdana, Tahoma, sans-serif",
        fontSize: "10px",
        color: isMe ? "#7fd4ff" : "#40c040",
        stroke: "#000",
        strokeThickness: 2,
      });
      label.setOrigin(0.5, 0.5);
      container.add([body, label]);
      this.players.set(sessionId, { container, target: { x: p.x, y: p.y }, label });

      // Escuta mudanças nesse player (API do Colyseus schema).
      const anyPlayer = p as unknown as {
        onChange?: (cb: () => void) => void;
        listen?: (field: string, cb: (v: unknown) => void) => void;
      };
      const update = () => {
        const vis = this.players.get(sessionId);
        if (!vis) return;
        vis.target.x = p.x;
        vis.target.y = p.y;
        if (sessionId === this.room.sessionId && this.lastMoveSentAt > 0) {
          this.onLatency?.(Math.max(1, Date.now() - this.lastMoveSentAt));
          this.lastMoveSentAt = 0;
        }
      };
      if (typeof anyPlayer.onChange === "function") anyPlayer.onChange(update);
      else if (typeof anyPlayer.listen === "function") {
        anyPlayer.listen("x", update);
        anyPlayer.listen("y", update);
      }
    };

    const removePlayer = (_p: PlayerLike, sessionId: string) => {
      const v = this.players.get(sessionId);
      v?.container.destroy();
      this.players.delete(sessionId);
    };

    players.onAdd(addPlayer);
    players.onRemove(removePlayer);
    // Players que já estavam quando entramos.
    players.forEach(addPlayer);
  }

  update(_time: number, deltaMs: number) {
    // Interpolação
    this.players.forEach((v) => {
      const c = v.container;
      c.x += (v.target.x - c.x) * 0.25;
      c.y += (v.target.y - c.y) * 0.25;
    });

    // FPS report a cada 500ms
    this.fpsTimer += deltaMs;
    if (this.fpsTimer > 500) {
      this.fpsTimer = 0;
      this.onFps?.(Math.round(this.game.loop.actualFps));
    }

    // Input: bloqueia se o foco está num input do chat
    const ae = typeof document !== "undefined" ? document.activeElement : null;
    if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;

    if (this.time.now < this.nextMoveAt) return;
    const state = this.room.state as { players?: PlayersMap };
    const me = state.players?.get(this.room.sessionId);
    if (!me) return;

    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx = -1;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) dx = 1;
    else if (this.cursors.up.isDown || this.wasd.W.isDown) dy = -1;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) dy = 1;

    if (dx || dy) {
      const nx = me.x + dx * TILE;
      const ny = me.y + dy * TILE;
      this.lastMoveSentAt = Date.now();
      this.room.send("move", { x: nx, y: ny });
      this.nextMoveAt = this.time.now + MOVE_COOLDOWN_MS;
    }
  }
}
