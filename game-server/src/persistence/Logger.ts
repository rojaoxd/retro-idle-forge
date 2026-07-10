import { supabase } from "../supabase.js";

export type LogEntry = {
  level: "info" | "warn" | "error";
  source: string;
  message: string;
  meta?: Record<string, unknown> | null;
};

class LoggerImpl {
  private buffer: LogEntry[] = [];
  private timer: NodeJS.Timeout | null = null;

  start(intervalMs: number) {
    if (this.timer) return;
    this.timer = setInterval(() => void this.flush(), intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  push(entry: LogEntry) {
    this.buffer.push(entry);
    // failsafe: se estourar muito, força flush
    if (this.buffer.length >= 200) void this.flush();
  }

  async flush() {
    if (this.buffer.length === 0) return;
    const rows = this.buffer.splice(0, this.buffer.length);
    const { error } = await supabase().from("server_logs").insert(rows);
    if (error) console.error("[Logger] insert falhou:", error.message);
  }
}

export const Logger = new LoggerImpl();
