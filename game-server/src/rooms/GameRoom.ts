import { Room, Client } from "colyseus";
import { Schema, MapSchema, type } from "@colyseus/schema";
import { WorldCache } from "../cache/WorldCache.js";
import { PlayerWriter } from "../persistence/PlayerWriter.js";
import { Logger } from "../persistence/Logger.js";

class Player extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") z = 7;
  @type("number") hp = 100;
}

class WorldState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") status = "online";
  @type("string") motd = "";
}

type JoinOpts = { name?: string };

export class GameRoom extends Room<WorldState> {
  maxClients = 200;

  onCreate() {
    this.setState(new WorldState());
    this.state.status = WorldCache.serverStatus();
    this.state.motd = WorldCache.serverMotd() ?? "";

    this.onMessage("move", (client, data: { x: number; y: number }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      const nx = Math.trunc(data.x);
      const ny = Math.trunc(data.y);
      // validação síncrona via cache — zero I/O
      if (WorldCache.isBlocking(nx, ny, p.z)) return;
      p.x = nx;
      p.y = ny;
      PlayerWriter.enqueue({
        id: p.id,
        character_name: p.name,
        x: p.x,
        y: p.y,
        last_heartbeat: new Date().toISOString(),
      });
    });
  }

  onJoin(client: Client, opts: JoinOpts) {
    if (WorldCache.serverStatus() === "maintenance") {
      throw new Error("Servidor em manutenção");
    }
    const p = new Player();
    p.id = client.sessionId;
    p.name = (opts?.name ?? "Player").slice(0, 20);
    p.x = 0;
    p.y = 0;
    p.z = 7;
    this.state.players.set(client.sessionId, p);
    Logger.push({
      level: "info",
      source: "colyseus",
      message: `player_join ${p.name}`,
      meta: { session: client.sessionId },
    });
  }

  onLeave(client: Client) {
    const p = this.state.players.get(client.sessionId);
    this.state.players.delete(client.sessionId);
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
