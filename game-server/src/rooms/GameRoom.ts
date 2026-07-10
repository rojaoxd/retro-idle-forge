import { Room, Client } from "colyseus";
import { Schema, MapSchema, type } from "@colyseus/schema";
import { WorldCache } from "../cache/WorldCache.js";
import { PlayerWriter } from "../persistence/PlayerWriter.js";
import { Logger } from "../persistence/Logger.js";
import { supabase } from "../supabase.js";

const TILE = 32;
const TILE_CENTER = TILE / 2;
const STEP_MS = 450; // servidor um pouco mais permissivo que o tween do client (500ms)
const MAP_COLS = 40;
const MAP_ROWS = 30;

const envNumber = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const SPAWN_X = envNumber(process.env.SPAWN_X, 10);
const SPAWN_Y = envNumber(process.env.SPAWN_Y, 10);
const SPAWN_Z = envNumber(process.env.SPAWN_Z, 7);

function readFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeTile(value: unknown, fallback: number, max: number) {
  const n = readFiniteNumber(value);
  if (n === null) return fallback;
  const tile = Math.trunc(n);
  return tile >= 0 && tile < max ? tile : fallback;
}

function tileToPixel(tile: number) {
  return tile * TILE + TILE_CENTER;
}

function pixelToTile(pixel: number) {
  return Math.floor(pixel / TILE);
}

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

type JoinOpts = { name?: string; characterId?: string; accessToken?: string };
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
  private userIds = new Map<string, string>();

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

      // Sanidade: nunca deixa posição virar NaN. Se veio bagunçada, reseta pro spawn.
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        Logger.push({
          level: "warn",
          source: "colyseus",
          message: "player_position_invalid_reset",
          meta: { session: client.sessionId, characterId: p.id, x: p.x, y: p.y },
        });
        p.x = tileToPixel(SPAWN_X);
        p.y = tileToPixel(SPAWN_Y);
      }

      const { dx, dy } = DIRS[dir];
      const curTileX = pixelToTile(p.x);
      const curTileY = pixelToTile(p.y);
      const nx = curTileX + dx;
      const ny = curTileY + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_COLS || ny >= MAP_ROWS) return;
      if (WorldCache.isBlocking(nx, ny, p.z)) return;

      p.x = tileToPixel(nx);
      p.y = tileToPixel(ny);
      this.lastMoveAt.set(client.sessionId, now);
      const userId = this.userIds.get(client.sessionId);
      if (!userId) return;

      PlayerWriter.enqueue({
        user_id: userId,
        character_name: p.name,
        x: nx,
        y: ny,
        last_heartbeat: new Date().toISOString(),
      });
    });

    // Client envia como no-op (WorldCache já lê blocking do Supabase).
    this.onMessage("map:sync", () => {});
  }

  async onJoin(client: Client, opts: JoinOpts) {
    if (WorldCache.serverStatus() === "maintenance") {
      throw new Error("Servidor em manutenção");
    }
    if (!opts?.characterId || !opts?.accessToken) {
      throw new Error("Personagem ou sessão inválida");
    }

    const { data: authData, error: authError } = await supabase().auth.getUser(opts.accessToken);
    if (authError || !authData.user) {
      throw new Error("Sessão inválida");
    }

    const { data: character, error: characterError } = await supabase()
      .from("characters")
      .select("id,name,pos_x,pos_y,pos_z,hp")
      .eq("id", opts.characterId)
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (characterError || !character) {
      throw new Error("Personagem não encontrado");
    }

    const p = new Player();
    p.id = character.id;
    p.name = character.name;
    this.userIds.set(client.sessionId, authData.user.id);
    const spawnTileX = normalizeTile(character.pos_x, SPAWN_X, MAP_COLS);
    const spawnTileY = normalizeTile(character.pos_y, SPAWN_Y, MAP_ROWS);
    const rawPosZ = readFiniteNumber(character.pos_z);
    const rawHp = readFiniteNumber(character.hp);
    p.x = tileToPixel(spawnTileX);
    p.y = tileToPixel(spawnTileY);
    p.z = rawPosZ ?? SPAWN_Z;
    p.hp = rawHp ?? 100;
    this.state.players.set(client.sessionId, p);
    void supabase()
      .from("characters")
      .update({
        pos_x: spawnTileX,
        pos_y: spawnTileY,
        pos_z: p.z,
        last_login_at: new Date().toISOString(),
      })
      .eq("id", p.id);
    Logger.push({
      level: "info",
      source: "colyseus",
      message: `player_join ${p.name}`,
      meta: {
        session: client.sessionId,
        characterId: p.id,
        spawnTile: { x: spawnTileX, y: spawnTileY, z: p.z },
        spawnPixel: { x: p.x, y: p.y },
      },
    });
  }

  onLeave(client: Client) {
    const p = this.state.players.get(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.lastMoveAt.delete(client.sessionId);
    const userId = this.userIds.get(client.sessionId);
    this.userIds.delete(client.sessionId);
    if (p) {
      if (userId) PlayerWriter.drop(userId);
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
