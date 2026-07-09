import Phaser from "phaser";
import type { Room } from "colyseus.js";

const TILE = 32;
// Tibia 7.4: caminhada base em chão normal ~500ms/SQM.
const STEP_MS = 500;
const MAP_URL = "/assets/mapa.json";
const TILESET_IMAGE_URL = "/assets/nlbWl37.png";
const TILESET_IMAGE_KEY = "cenario";
const TILESET_NAME = "cenario";

type PlayerLike = { x: number; y: number; name: string };
type PlayersMap = {
  onAdd: (cb: (player: PlayerLike, sessionId: string) => void) => void;
  onRemove: (cb: (player: PlayerLike, sessionId: string) => void) => void;
  get: (sessionId: string) => PlayerLike | undefined;
  forEach: (cb: (player: PlayerLike, sessionId: string) => void) => void;
};

type PlayerVisual = {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  tween: Phaser.Tweens.Tween | null;
};

type Direction = "up" | "down" | "left" | "right";

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
    // Carrega como JSON puro para ignorar qualquer "image" interna do .tmj
    // (evita Phaser tentar buscar o tileset num path do computador do autor).
    this.load.json("mapa-json", MAP_URL);
    this.load.on(`filecomplete-image-${TILESET_IMAGE_KEY}`, () => (this.hasTilesetImage = true));
    this.load.on("filecomplete-json-mapa-json", () => {
      const raw = this.cache.json.get("mapa-json");
      if (raw) {
        this.cache.tilemap.add("mapa", {
          format: Phaser.Tilemaps.Formats.TILED_JSON,
          data: raw,
        });
        this.hasTiledMap = true;
      }
    });
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
      } catch (e) {
        console.warn("[GameScene] Tiled map falhou, usando fallback:", e);
      }
    }
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

  private moveTo(vis: PlayerVisual, x: number, y: number, instant = false) {
    if (vis.tween) {
      vis.tween.stop();
      vis.tween = null;
    }
    if (instant) {
      vis.container.x = x;
      vis.container.y = y;
      return;
    }
    vis.tween = this.tweens.add({
      targets: vis.container,
      x,
      y,
      duration: STEP_MS,
      ease: "Linear",
      onComplete: () => {
        vis.tween = null;
      },
    });
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
      const vis: PlayerVisual = { container, label, tween: null };
      this.players.set(sessionId, vis);

      if (isMe) {
        this.cameras.main.startFollow(container, true, 0.15, 0.15);
      }

      const anyPlayer = p as unknown as {
        onChange?: (cb: () => void) => void;
        listen?: (field: string, cb: (v: unknown) => void) => void;
      };
      const update = () => {
        const v = this.players.get(sessionId);
        if (!v) return;
        // Se o alvo do servidor bate com o tween em andamento (predição local),
        // não recria; senão, faz tween linear até a nova posição autoritativa.
        const data = v.tween?.data as Array<{ key: string; end: number }> | undefined;
        const targetX = data?.find((d) => d.key === "x")?.end ?? v.container.x;
        const targetY = data?.find((d) => d.key === "y")?.end ?? v.container.y;
        if (Math.round(targetX) !== Math.round(p.x) || Math.round(targetY) !== Math.round(p.y)) {
          this.moveTo(v, p.x, p.y);
        }
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
      if (v) {
        v.tween?.stop();
        v.container.destroy();
      }
      this.players.delete(sessionId);
    };

    // Registra listeners ANTES do forEach para não perder ninguém.
    players.onAdd(addPlayer);
    players.onRemove(removePlayer);
    players.forEach(addPlayer);
  }

  update(_time: number, deltaMs: number) {
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
    const myVis = this.players.get(this.room.sessionId);
    if (!myVis) return;

    let dir: Direction | null = null;
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      dir = "left";
      dx = -1;
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      dir = "right";
      dx = 1;
    } else if (this.cursors.up.isDown || this.wasd.W.isDown) {
      dir = "up";
      dy = -1;
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      dir = "down";
      dy = 1;
    }

    if (dir) {
      const nx = me.x + dx * TILE;
      const ny = me.y + dy * TILE;
      this.lastMoveSentAt = Date.now();
      this.room.send("move", { direction: dir });
      // Predição local: já desliza o container do jogador local.
      this.moveTo(myVis, nx, ny);
      this.nextMoveAt = this.time.now + STEP_MS;
    }
  }
}
