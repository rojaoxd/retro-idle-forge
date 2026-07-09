import { useTibiaStore } from "@/stores/tibiaStore";
import { PhaserCanvas } from "./PhaserCanvas";
import { useNetStore } from "@/stores/netStore";

export function GameViewport() {
  const server = useTibiaStore((s) => s.server);
  const character = useTibiaStore((s) => s.character);
  const status = useNetStore((s) => s.status);
  const error = useNetStore((s) => s.error);

  const statusLabel: Record<typeof status, string> = {
    idle: "idle",
    connecting: "conectando…",
    connected: "online",
    error: "erro",
    closed: "desconectado",
  };
  const statusColor =
    status === "connected"
      ? "#40c040"
      : status === "connecting"
        ? "#e0c040"
        : status === "error" || status === "closed"
          ? "#c03030"
          : "#8a8a8a";

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-black"
      style={{ boxShadow: "inset 1px 1px 0 #000, inset -1px -1px 0 #303030" }}
    >
      <PhaserCanvas />

      <div
        className="absolute top-1 left-1 z-10 leading-tight pointer-events-none"
        style={{ fontSize: 11, textShadow: "1px 1px 0 #000" }}
      >
        <div style={{ color: "#c03030", fontWeight: "bold" }}>{server.title}</div>
        <div style={{ color: "#40c040" }}>FPS: {server.fps}</div>
        <div style={{ color: "#40c040" }}>Latency: {server.latency} ms</div>
        <div style={{ color: statusColor }}>
          {character.name} · {statusLabel[status]}
          {error ? ` (${error})` : ""}
        </div>
      </div>
    </div>
  );
}
