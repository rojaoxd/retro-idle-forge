import Phaser from "phaser";
import type { Room } from "colyseus.js";

const TILE = 32;
const MOVE_COOLDOWN_MS = 150;
const MAP_URL = "/assets/mapa.json";
const TILESET_IMAGE_URL = "/assets/nlbWl37.png";
const TILESET_IMAGE_KEY = "cenario";
const TILESET_NAME = "cenario"; // deve bater com o "name" do tileset no .tmj

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
  private hasTilesetImage = false;
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
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.warn("[GameScene] loaderror:", file.key, file.src);
    });
    this.load.image(TILESET_IMAGE_KEY, TILESET_IMAGE_URL);
    this.load.tilemapTiledJSON("mapa", MAP_URL);
    this.load.on(`filecomplete-image-${TILESET_IMAGE_KEY}`, () => (this.hasTilesetImage = true));
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

    this.cameras.main.setZoom(2);
    this.cameras.main.roundPixels = true;

    this.wireRoom();
  }

  private buildWorld() {
    if (this.hasTiledMap && this.hasTilesetImage) {
      try {
        const map = this.make.tilemap({ key: "mapa" });
        const ts = map.addTilesetImage(TILESET_NAME, TILESET_IMAGE_KEY);
        if (ts) {
          map.layers.forEach((l) => map.createLayer(l.name, ts, 0, 0));
          this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
          return;
        }
        console.warn("[GameScene] addTilesetImage retornou null");
      } catch (e) {
        console.warn("[GameScene] Tiled map falhou, usando fallback:", e);
      }
    }
    // Fallback procedural
    const g = this.add.graphics();
    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 50; x++) {
        const r = Math.random();
        let color = 0x2e6b2a;
        if (r < 0.18) color = 0x7a5a30;
        else if (r < 0.22) color = 0x555555;
        g.fillStyle(color, 1);
        g.fillRect(x * TILE, y * TILE, TILE, TILE);
        g.lineStyle(1, 0x000000, 0.15);
        g.strokeRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
    this.cameras.main.setBounds(0, 0, 50 * TILE, 50 * TILE);
  }

  private wireRoom() {
    const state = this.room.state as { players?: PlayersMap };
    const players = state?.players;
    if (!players) {
      this.room.onStateChange.once(() => this.wireRoom());
      return;
    }

    const addPlayer = (p: PlayerLike, sessionId: string) => {
      if (this.players.has(sessionId)) return;
      const isMe = sessionId === this.room.sessionId;
      const container = this.add.container(p.x, p.y);
      const rect = this.add.rectangle(0, 0, TILE - 6, TILE - 6, isMe ? 0x4fa4ff : 0xd4b46a);
      rect.setStrokeStyle(1, 0x000000);
      const label = this.add.text(0, -TILE / 2 - 6, p.name ?? "?", {
        fontFamily: "Verdana, Tahoma, sans-serif",
        fontSize: "10px",
        color: isMe ? "#7fd4ff" : "#40c040",
        stroke: "#000",
        strokeThickness: 2,
      });
      label.setOrigin(0.5, 0.5);
      container.add([rect, label]);
      this.players.set(sessionId, { container, target: { x: p.x, y: p.y }, label });

      if (isMe) {
        this.cameras.main.startFollow(container, true, 0.15, 0.15);
      }

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
    players.forEach(addPlayer);
  }

  update(_time: number, deltaMs: number) {
    this.players.forEach((v) => {
      const c = v.container;
      c.x += (v.target.x - c.x) * 0.25;
      c.y += (v.target.y - c.y) * 0.25;
    });

    this.fpsTimer += deltaMs;
    if (this.fpsTimer > 500) {
      this.fpsTimer = 0;
      this.onFps?.(Math.round(this.game.loop.actualFps));
    }

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
