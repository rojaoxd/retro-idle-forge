import { PhaserCanvas } from "./PhaserCanvas";

// Viewport clássico do Tibia: 15x11 tiles => 15/11 aspect.
export function GameViewport() {
  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <div
        className="relative bg-black"
        style={{
          aspectRatio: "15 / 11",
          height: "100%",
          maxWidth: "100%",
          boxShadow: "inset 1px 1px 0 #000, inset -1px -1px 0 #303030",
        }}
      >
        <PhaserCanvas />
      </div>
    </div>
  );
}
