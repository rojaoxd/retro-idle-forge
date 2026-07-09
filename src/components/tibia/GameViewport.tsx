import { useTibiaStore } from "@/stores/tibiaStore";

export function GameViewport() {
  const { server, character } = useTibiaStore();

  // Placeholder tiled floor (brown path + grass), grid 15x11
  const cols = 15;
  const rows = 11;
  const tiles: string[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const isPath = y >= 4 && y <= 7;
      const isStone = x <= 1 || x >= cols - 2;
      tiles.push(isStone ? "#5a5a5a" : isPath ? "#7a4a2a" : "#3a6a2a");
    }
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Server stats overlay */}
      <div className="absolute top-1 left-1 z-10 leading-tight" style={{ fontSize: 11 }}>
        <div className="text-[#c03030] font-bold">{server.title}</div>
        <div className="text-[#40c040]">FPS: {server.fps}</div>
        <div className="text-[#40c040]">Latency: {server.latency} ms</div>
      </div>

      {/* Tile grid (placeholder) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="grid gap-0"
          style={{
            gridTemplateColumns: `repeat(${cols}, 48px)`,
            gridTemplateRows: `repeat(${rows}, 48px)`,
          }}
        >
          {tiles.map((c, i) => (
            <div
              key={i}
              style={{
                backgroundColor: c,
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)",
              }}
            />
          ))}

          {/* Character in the middle */}
          <div
            className="pointer-events-none absolute flex flex-col items-center"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className="text-[#40c040] font-bold"
              style={{ fontSize: 11, textShadow: "1px 1px 0 #000" }}
            >
              {character.name}
            </div>
            <div
              style={{
                width: 32,
                height: 32,
                background: "#d4b46a",
                border: "1px solid #000",
                marginTop: 2,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
