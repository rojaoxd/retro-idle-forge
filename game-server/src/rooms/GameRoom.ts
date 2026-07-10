import { Room, Client } from "colyseus";
import { Schema, MapSchema, type } from "@colyseus/schema";
import { WorldCache } from "../cache/WorldCache.js";
import { PlayerWriter } from "../persistence/PlayerWriter.js";
import { Logger } from "../persistence/Logger.js";
import { supabase } from "../supabase.js";

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
        p.x = SPAWN_X * TILE;
        p.y = SPAWN_Y * TILE;
      }

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
    const rawPosX = Number(character.pos_x);
    const rawPosY = Number(character.pos_y);
    const rawPosZ = Number(character.pos_z);
    const rawHp = Number(character.hp);
    p.x = (Number.isFinite(rawPosX) ? rawPosX : SPAWN_X) * TILE;
    p.y = (Number.isFinite(rawPosY) ? rawPosY : SPAWN_Y) * TILE;
    p.z = Number.isFinite(rawPosZ) ? rawPosZ : SPAWN_Z;
    p.hp = Number.isFinite(rawHp) ? rawHp : 100;
    this.state.players.set(client.sessionId, p);
    void supabase().from("characters").update({ last_login_at: new Date().toISOString() }).eq("id", p.id);
    Logger.push({
      level: "info",
      source: "colyseus",
      message: `player_join ${p.name}`,
      meta: { session: client.sessionId, characterId: p.id, spawn: { x: p.x / TILE, y: p.y / TILE, z: p.z } },
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
