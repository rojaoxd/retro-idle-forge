import { useTibiaStore } from "@/stores/tibiaStore";
import { PhaserCanvas } from "./PhaserCanvas";
import { useNetStore } from "@/stores/netStore";

export function GameViewport() {
  const { server, character } = useTibiaStore();

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-black"
      style={{
        boxShadow: "inset 1px 1px 0 #000, inset -1px -1px 0 #303030",
      }}
    >
      {/* Server stats overlay */}
      <div className="absolute top-1 left-1 z-10 leading-tight" style={{ fontSize: 11 }}>
        <div style={{ color: "#c03030", fontWeight: "bold" }}>{server.title}</div>
        <div style={{ color: "#40c040" }}>FPS: {server.fps}</div>
        <div style={{ color: "#40c040" }}>Latency: {server.latency} ms</div>
      </div>

      {/* Character marker in the middle */}
      <div
        className="pointer-events-none absolute flex flex-col items-center"
        style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
      >
        <div
          style={{
            color: "#40c040",
            fontSize: 11,
            fontWeight: "bold",
            textShadow: "1px 1px 0 #000",
          }}
        >
          {character.name}
        </div>
        <div
          style={{
            width: 24,
            height: 24,
            background: "#d4b46a",
            border: "1px solid #000",
            marginTop: 2,
          }}
        />
      </div>
    </div>
  );
}
