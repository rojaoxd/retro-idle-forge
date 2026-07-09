import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { getMapTiles } from "@/lib/game/map.functions";

const TILE = 32;
// Tibia 7.4: caminhada base em chão normal ~500ms/SQM.
const STEP_MS = 500;

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

type Sprite = {
  id: number;
  sheet_url: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Tile = {
  x: number;
  y: number;
  layer: "floor" | "obstacles";
  tile_id: number;
  blocking: boolean;
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
  private blockingSet = new Set<string>();
  private mapCols = 40;
  private mapRows = 30;

  constructor() {
    super("GameScene");
  }

  init(data: GameSceneInit) {
    this.room = data.room;
    this.onLatency = data.onLatency;
    this.onFps = data.onFps;
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;
    this.cameras.main.setZoom(2);
    this.cameras.main.roundPixels = true;

    // Placeholder enquanto carrega
    this.drawFallback();

    void this.loadWorldFromDB()
      .catch((e) => console.warn("[GameScene] falha carregando mapa:", e))
      .finally(() => this.wireRoom());
  }

  private drawFallback() {
    const g = this.add.graphics();
    g.fillStyle(0x0a0a0a, 1);
    g.fillRect(0, 0, this.mapCols * TILE, this.mapRows * TILE);
    this.cameras.main.setBounds(0, 0, this.mapCols * TILE, this.mapRows * TILE);
    this.cameras.main.centerOn((this.mapCols * TILE) / 2, (this.mapRows * TILE) / 2);
  }

  private async loadWorldFromDB() {
    const { tiles, sprites, urlMap } = (await getMapTiles()) as {
      tiles: Tile[];
      sprites: Sprite[];
      urlMap: Record<string, string | null>;
    };

    // Carrega folhas de sprites únicas como texturas do Phaser
    const uniqueSheets = Array.from(new Set(sprites.map((s) => s.sheet_url)));
    await Promise.all(
      uniqueSheets.map((path) => this.loadTexture(`sheet:${path}`, urlMap[path] ?? "")),
    );

    const spriteById = new Map<number, Sprite>();
    for (const s of sprites) spriteById.set(s.id, s);

    // Calcula extent
    if (tiles.length) {
      let maxX = 0;
      let maxY = 0;
      for (const t of tiles) {
        if (t.x > maxX) maxX = t.x;
        if (t.y > maxY) maxY = t.y;
      }
      this.mapCols = Math.max(this.mapCols, maxX + 1);
      this.mapRows = Math.max(this.mapRows, maxY + 1);
      this.cameras.main.setBounds(0, 0, this.mapCols * TILE, this.mapRows * TILE);
    }

    // Ordena: floor primeiro, obstacles depois
    const ordered = [...tiles].sort((a, b) =>
      a.layer === b.layer ? 0 : a.layer === "floor" ? -1 : 1,
    );

    for (const t of ordered) {
      const sp = spriteById.get(t.tile_id);
      if (!sp) continue;
      const texKey = `sheet:${sp.sheet_url}`;
      if (!this.textures.exists(texKey)) continue;
      const img = this.add.image(t.x * TILE, t.y * TILE, texKey);
      img.setOrigin(0, 0);
      img.setCrop(sp.x, sp.y, sp.width, sp.height);
      // Desloca para que o crop apareça alinhado à origem
      img.setPosition(t.x * TILE - sp.x, t.y * TILE - sp.y);
      img.setDepth(t.layer === "floor" ? 1 : 2);
      if (t.blocking) this.blockingSet.add(`${t.x},${t.y}`);
    }

    // Envia colisões pro servidor Colyseus (fallback: servidor idealmente lê direto do Supabase)
    const blockingTiles = tiles
      .filter((t) => t.blocking)
      .map((t) => ({ x: t.x, y: t.y }));
    try {
      this.room.send("map:sync", { tiles: blockingTiles });
    } catch {
      /* ignora se servidor não conhecer a mensagem */
    }
  }

  private loadTexture(key: string, url: string): Promise<void> {
    return new Promise((resolve) => {
      if (!url || this.textures.exists(key)) {
        resolve();
        return;
      }
      this.load.image(key, url);
      this.load.once(`filecomplete-image-${key}`, () => resolve());
      this.load.once("loaderror", () => resolve());
      this.load.start();
    });
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
      container.setDepth(10);
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
      const tileX = Math.round(me.x / TILE) + dx;
      const tileY = Math.round(me.y / TILE) + dy;
      // Client-side collision check (autoridade continua no servidor)
      if (this.blockingSet.has(`${tileX},${tileY}`)) {
        this.nextMoveAt = this.time.now + 100;
        return;
      }
      const nx = me.x + dx * TILE;
      const ny = me.y + dy * TILE;
      this.lastMoveSentAt = Date.now();
      this.room.send("move", { direction: dir });
      this.moveTo(myVis, nx, ny);
      this.nextMoveAt = this.time.now + STEP_MS;
    }
  }
}
