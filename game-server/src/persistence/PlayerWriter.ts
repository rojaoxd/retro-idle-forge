import { supabase } from "../supabase.js";

/**
 * Acumula atualizações de players em memória e faz UM upsert em array
 * a cada PERSIST_INTERVAL_MS. 1000 players = 1 requisição, não 1000.
 */
export type PlayerSnapshot = {
  id: string;              // character_id
  character_name: string;
  x: number;
  y: number;
  last_heartbeat: string;  // ISO
};

class PlayerWriterImpl {
  private buffer = new Map<string, PlayerSnapshot>();
  private timer: NodeJS.Timeout | null = null;

  start(intervalMs: number) {
    if (this.timer) return;
    this.timer = setInterval(() => void this.flush(), intervalMs);
    console.log(`[PlayerWriter] flush a cada ${intervalMs}ms`);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  enqueue(snap: PlayerSnapshot) {
    this.buffer.set(snap.id, snap); // último snapshot vence
  }

  drop(id: string) {
    this.buffer.delete(id);
  }

  async flush() {
    if (this.buffer.size === 0) return;
    const rows = Array.from(this.buffer.values());
    this.buffer.clear();
    const { error } = await supabase()
      .from("online_players")
      .upsert(rows, { onConflict: "id" });
    if (error) console.error("[PlayerWriter] upsert falhou:", error.message);
  }
}

export const PlayerWriter = new PlayerWriterImpl();
