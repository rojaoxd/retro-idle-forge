import { supabase } from "../supabase.js";

/**
 * Acumula atualizações de players em memória e faz UM upsert em array
 * a cada PERSIST_INTERVAL_MS. 1000 players = 1 requisição, não 1000.
 */
export type PlayerSnapshot = {
  id: string;              // online_players.id; usamos character_id para rastrear o personagem atual
  user_id: string;
  character_name: string;
  x: number;
  y: number;
  last_heartbeat: string;  // ISO
};

class PlayerWriterImpl {
  private buffer = new Map<string, PlayerSnapshot>();
  private timer: NodeJS.Timeout | null = null;

  private isValidSnapshot(snap: PlayerSnapshot) {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const idOk = uuidRe.test(
      snap.id,
    );
    const userIdOk = uuidRe.test(snap.user_id);
    return idOk && userIdOk && Number.isFinite(snap.x) && Number.isFinite(snap.y);
  }

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
    if (!this.isValidSnapshot(snap)) {
      console.warn("[PlayerWriter] snapshot inválido ignorado", {
        id: snap.id,
        user_id: snap.user_id,
        x: snap.x,
        y: snap.y,
      });
      return;
    }
    this.buffer.set(snap.user_id, snap); // último snapshot por usuário vence
  }

  drop(id: string) {
    this.buffer.delete(id);
  }

  async flush() {
    if (this.buffer.size === 0) return;
    const rows = Array.from(this.buffer.values()).filter((snap) => this.isValidSnapshot(snap));
    this.buffer.clear();
    if (rows.length === 0) return;
    const { error } = await supabase()
      .from("online_players")
      .upsert(rows, { onConflict: "user_id" });
    if (error) console.error("[PlayerWriter] upsert falhou:", error.message);
  }
}

export const PlayerWriter = new PlayerWriterImpl();
