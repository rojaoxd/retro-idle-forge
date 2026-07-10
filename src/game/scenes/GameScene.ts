import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { getMapTiles } from "@/lib/game/map.functions";

const TILE = 32;
// Tibia 7.4: caminhada base em chão normal ~500ms/SQM.
const STEP_MS = 500;

const SPAWN_X = Number(import.meta.env.VITE_SPAWN_X ?? 10);
const SPAWN_Y = Number(import.meta.env.VITE_SPAWN_Y ?? 10);

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
  room?: Room;
  onLatency?: (ms: number) => void;
  onFps?: (fps: number) => void;
};

export class GameScene extends Phaser.Scene {
  private room: Room | null = null;
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
  private mapReady = false;
  private pendingRoom: Room | null = null;
  private sheetKeyByUrl = new Map<string, string>();
  private fallbackPlayer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super("GameScene");
  }

  init(data: GameSceneInit) {
    this.room = data.room ?? null;
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

    // Chão visível imediatamente, para nunca ficar uma tela preta enquanto assets/rede carregam.
    this.drawFallback();
    this.showFallbackPlayer();

    void this.loadWorldFromDB()
      .catch((e) => console.warn("[GameScene] falha carregando mapa:", e))
      .finally(() => {
        this.mapReady = true;
        // Centraliza no spawn até termos player local
        this.cameras.main.centerOn(SPAWN_X * TILE + TILE / 2, SPAWN_Y * TILE + TILE / 2);
        // Room que chegou antes do mapa? Anexa agora.
        const r = this.pendingRoom ?? this.room;
        if (r) this.wireRoom(r);
      });
  }

  /** Chamado pelo PhaserCanvas quando o Colyseus conectar (pode ser depois do create). */
  attachRoom(room: Room) {
    if (this.room === room) return;
    this.room = room;
    if (!this.mapReady) {
      this.pendingRoom = room;
      return;
    }
    this.wireRoom(room);
  }

  private drawFallback() {
    const g = this.add.graphics();
    g.setDepth(0);

    for (let y = 0; y < this.mapRows; y += 1) {
      for (let x = 0; x < this.mapCols; x += 1) {
        const color = (x + y) % 3 === 0 ? 0x7c8f45 : (x * 7 + y * 11) % 5 === 0 ? 0x5f7f3b : 0x6f8a3f;
        g.fillStyle(color, 1);
        g.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }

    g.lineStyle(1, 0x26331f, 0.2);
    for (let x = 0; x <= this.mapCols; x += 1) {
      g.lineBetween(x * TILE, 0, x * TILE, this.mapRows * TILE);
    }
    for (let y = 0; y <= this.mapRows; y += 1) {
      g.lineBetween(0, y * TILE, this.mapCols * TILE, y * TILE);
    }

    this.cameras.main.setBounds(0, 0, this.mapCols * TILE, this.mapRows * TILE);
    this.cameras.main.centerOn((this.mapCols * TILE) / 2, (this.mapRows * TILE) / 2);
  }

  private showFallbackPlayer() {
    const x = SPAWN_X * TILE + TILE / 2;
    const y = SPAWN_Y * TILE + TILE / 2;
    const container = this.add.container(x, y);
    container.setDepth(10);

    const shadow = this.add.ellipse(0, 11, 20, 7, 0x000000, 0.35);
    const body = this.add.rectangle(0, 0, TILE - 10, TILE - 8, 0x4fa4ff);
    body.setStrokeStyle(1, 0x061018);
    const head = this.add.rectangle(0, -8, 14, 10, 0xf1c28a);
    head.setStrokeStyle(1, 0x061018);
    const label = this.add.text(0, -TILE / 2 - 9, "You", {
      fontFamily: "Verdana, Tahoma, sans-serif",
      fontSize: "10px",
      color: "#7fd4ff",
      stroke: "#000",
      strokeThickness: 2,
    });
    label.setOrigin(0.5, 0.5);

    container.add([shadow, body, head, label]);
    this.fallbackPlayer = container;
    this.cameras.main.startFollow(container, true, 0.15, 0.15);
  }

  private async loadWorldFromDB() {
    const { tiles, sprites, urlMap } = (await getMapTiles()) as {
      tiles: Tile[];
      sprites: Sprite[];
      urlMap: Record<string, string | null>;
    };

    const uniqueSheets = Array.from(new Set(sprites.map((s) => s.sheet_url)));
    const textureEntries = uniqueSheets.map((path, index) => {
      const key = `sheet_${index}`;
      this.sheetKeyByUrl.set(path, key);
      return { key, url: urlMap[path] ?? "" };
    });
    await this.loadTextures(textureEntries);

    const spriteById = new Map<number, Sprite>();
    for (const s of sprites) spriteById.set(s.id, s);

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

    const ordered = [...tiles].sort((a, b) =>
      a.layer === b.layer ? 0 : a.layer === "floor" ? -1 : 1,
    );

    for (const t of ordered) {
      const sp = spriteById.get(t.tile_id);
      if (!sp) continue;
      const texKey = this.sheetKeyByUrl.get(sp.sheet_url);
      if (!texKey) continue;
      if (!this.textures.exists(texKey)) continue;
      const tex = this.textures.get(texKey);
      const frameName = `f_${sp.id}`;
      if (!tex.has(frameName)) {
        tex.add(frameName, 0, sp.x, sp.y, sp.width, sp.height);
      }
      const img = this.add.image(t.x * TILE, t.y * TILE, texKey, frameName);
      img.setOrigin(0, 0);
      img.setDisplaySize(TILE, TILE);
      img.setDepth(t.layer === "floor" ? 1 : 2);
      if (t.blocking) this.blockingSet.add(`${t.x},${t.y}`);
    }
  }

  private loadTextures(entries: Array<{ key: string; url: string }>): Promise<void> {
    return new Promise((resolve) => {
      const queued = entries.filter(({ key, url }) => url && !this.textures.exists(key));
      if (!queued.length) {
        resolve();
        return;
      }

      for (const { key, url } of queued) this.load.image(key, url);

      const done = () => {
        this.load.off("complete", done);
        this.load.off("loaderror", done);
        resolve();
      };

      this.load.once("complete", done);
      this.load.once("loaderror", done);
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

  private wireRoom(room: Room) {
    const state = room.state as { players?: PlayersMap };
    const players = state?.players;
    if (!players) {
      room.onStateChange.once(() => this.wireRoom(room));
      return;
    }

    const addPlayer = (p: PlayerLike, sessionId: string) => {
      if (this.players.has(sessionId)) return;
      const isMe = sessionId === room.sessionId;
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
        this.fallbackPlayer?.destroy();
        this.fallbackPlayer = null;
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
        if (sessionId === room.sessionId && this.lastMoveSentAt > 0) {
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

    if (!this.room) return;

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
