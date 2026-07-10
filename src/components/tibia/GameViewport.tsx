import { PhaserCanvas } from "./PhaserCanvas";

// Viewport preenche toda a área disponível acima do chat.
// A câmera do Phaser (com startFollow no player local) mantém o
// personagem centralizado, estilo Tibia.
export function GameViewport() {
  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <PhaserCanvas />
    </div>
  );
}
