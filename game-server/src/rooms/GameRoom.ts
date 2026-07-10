import { Room, Client } from "colyseus";
import { Schema, MapSchema, type } from "@colyseus/schema";
import { WorldCache } from "../cache/WorldCache.js";
import { PlayerWriter } from "../persistence/PlayerWriter.js";
import { Logger } from "../persistence/Logger.js";

const TILE = 32;
const STEP_MS = 450; // servidor um pouco mais permissivo que o tween do client (500ms)
const MAP_COLS = 40;
const MAP_ROWS = 30;

const SPAWN_X = Number(process.env.SPAWN_X ?? 10);
const SPAWN_Y = Number(process.env.SPAWN_Y ?? 10);
const SPAWN_Z = Number(process.env.SPAWN_Z ?? 7);

class Player extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("number") x = 0; // pixels
  @type("number") y = 0; // pixels
  @type("number") z = 7;
  @type("number") hp = 100;
}

class WorldState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") status = "online";
  @type("string") motd = "";
}

type JoinOpts = { name?: string };
type Direction = "up" | "down" | "left" | "right";
const DIRS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export class GameRoom extends Room<WorldState> {
  maxClients = 200;
  private lastMoveAt = new Map<string, number>();

  onCreate() {
    this.setState(new WorldState());
    this.state.status = WorldCache.serverStatus();
    this.state.motd = WorldCache.serverMotd() ?? "";

    this.onMessage("move", (client, data: { direction?: Direction }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      const dir = data?.direction;
      if (!dir || !(dir in DIRS)) return;

      const now = Date.now();
      const last = this.lastMoveAt.get(client.sessionId) ?? 0;
      if (now - last < STEP_MS) return;

      const { dx, dy } = DIRS[dir];
      const curTileX = Math.round(p.x / TILE);
      const curTileY = Math.round(p.y / TILE);
      const nx = curTileX + dx;
      const ny = curTileY + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_COLS || ny >= MAP_ROWS) return;
      if (WorldCache.isBlocking(nx, ny, p.z)) return;

      p.x = nx * TILE;
      p.y = ny * TILE;
      this.lastMoveAt.set(client.sessionId, now);

      PlayerWriter.enqueue({
        id: p.id,
        character_name: p.name,
        x: nx,
        y: ny,
        last_heartbeat: new Date().toISOString(),
      });
    });

    // Client envia como no-op (WorldCache já lê blocking do Supabase).
    this.onMessage("map:sync", () => {});
  }

  onJoin(client: Client, opts: JoinOpts) {
    if (WorldCache.serverStatus() === "maintenance") {
      throw new Error("Servidor em manutenção");
    }
    const p = new Player();
    p.id = client.sessionId;
    p.name = (opts?.name ?? "Player").slice(0, 20);
    p.x = SPAWN_X * TILE;
    p.y = SPAWN_Y * TILE;
    p.z = SPAWN_Z;
    this.state.players.set(client.sessionId, p);
    Logger.push({
      level: "info",
      source: "colyseus",
      message: `player_join ${p.name}`,
      meta: { session: client.sessionId, spawn: { x: SPAWN_X, y: SPAWN_Y, z: SPAWN_Z } },
    });
  }

  onLeave(client: Client) {
    const p = this.state.players.get(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.lastMoveAt.delete(client.sessionId);
    if (p) {
      PlayerWriter.drop(p.id);
      Logger.push({
        level: "info",
        source: "colyseus",
        message: `player_leave ${p.name}`,
        meta: { session: client.sessionId },
      });
    }
  }

  onDispose() {
    Logger.push({
      level: "info",
      source: "colyseus",
      message: "room_dispose",
    });
  }
}
