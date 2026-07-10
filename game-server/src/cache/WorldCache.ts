import { supabase } from "../supabase.js";

/**
 * WorldCache: espelho em memória das tabelas de mundo do Supabase.
 *
 * O GameRoom lê SEMPRE daqui (síncrono, custo zero).
 * O Supabase só é tocado no boot e quando `subscriptions.ts` chama reload().
 */

export type Tile = {
  id: string;
  x: number;
  y: number;
  z: number;
  layer: string;
  object_id: string | null;
  blocking: boolean;
  spawn_point: boolean;
};

export type GameObject = {
  id: string;
  client_id: number | null;
  object_kind: string;
  flags: Record<string, unknown> | null;
};

export type ServerConfig = {
  id: number;
  status: string;
  motd: string | null;
};

class WorldCacheImpl {
  private tilesByKey = new Map<string, Tile>(); // key: `${x}:${y}:${z}:${layer}`
  private objectsById = new Map<string, GameObject>();
  private config: ServerConfig | null = null;
  private ready = false;

  isReady() {
    return this.ready;
  }

  async loadAll() {
    console.log("[WorldCache] Carregando snapshot inicial do Supabase...");
    await Promise.all([
      this.reloadTiles(),
      this.reloadObjects(),
      this.reloadConfig(),
    ]);
    this.ready = true;
    console.log(
      `[WorldCache] Pronto. tiles=${this.tilesByKey.size} objects=${this.objectsById.size} status=${this.config?.status ?? "?"}`,
    );
  }

  async reloadTiles() {
    const rows: Tile[] = [];
    const PAGE = 1000;
    let from = 0;
    // paginação: map_tiles pode ter mais de 1000 rows
    // (limite padrão do Supabase JS)
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabase()
        .from("map_tiles")
        .select("id,x,y,z,layer,object_id,blocking,spawn_point")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      rows.push(...(data as Tile[]));
      if (data.length < PAGE) break;
      from += PAGE;
    }
    this.tilesByKey.clear();
    for (const t of rows) this.tilesByKey.set(this.key(t.x, t.y, t.z, t.layer), t);
  }

  async reloadObjects() {
    const { data, error } = await supabase()
      .from("game_objects")
      .select("id,client_id,object_kind,flags");
    if (error) throw error;
    this.objectsById.clear();
    for (const o of (data ?? []) as GameObject[]) this.objectsById.set(o.id, o);
  }

  async reloadConfig() {
    const { data, error } = await supabase()
      .from("server_configs")
      .select("id,status,motd")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    this.config = (data as ServerConfig | null) ?? null;
  }

  // ---------- getters síncronos ----------
  tileAt(x: number, y: number, z: number, layer: string): Tile | undefined {
    return this.tilesByKey.get(this.key(x, y, z, layer));
  }

  isBlocking(x: number, y: number, z: number): boolean {
    for (const layer of ["obstacles", "floor"]) {
      const t = this.tileAt(x, y, z, layer);
      if (t?.blocking) return true;
    }
    return false;
  }

  object(id: string) {
    return this.objectsById.get(id);
  }

  serverStatus() {
    return this.config?.status ?? "unknown";
  }

  serverMotd() {
    return this.config?.motd ?? null;
  }

  private key(x: number, y: number, z: number, layer: string) {
    return `${x}:${y}:${z}:${layer}`;
  }
}

export const WorldCache = new WorldCacheImpl();
