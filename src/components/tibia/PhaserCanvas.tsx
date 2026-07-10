import { useEffect, useRef } from "react";
import { useGameSessionStore } from "@/stores/gameSessionStore";
import { useTibiaStore } from "@/stores/tibiaStore";
import type { GameScene as GameSceneType } from "@/game/scenes/GameScene";

export function PhaserCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const character = useGameSessionStore((s) => s.character);
  const room = useGameSessionStore((s) => s.room);
  const setLatency = useTibiaStore((s) => s.setLatency);
  const setFps = useTibiaStore((s) => s.setFps);

  useEffect(() => {
    if (!character || !room || !hostRef.current) return;
    let destroyed = false;
    let game: import("phaser").Game | null = null;

    (async () => {
      const Phaser = (await import("phaser")).default;
      const { GameScene } = await import("@/game/scenes/GameScene");
      if (destroyed || !hostRef.current) return;

      game = new Phaser.Game({
        type: Phaser.CANVAS,
        parent: hostRef.current,
        backgroundColor: "#000000",
        pixelArt: true,
        scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
        scene: [GameScene],
        banner: false,
      });
      game.scene.start("GameScene", {
        room,
        characterName: character.name,
        onLatency: (ms: number) => setLatency(ms),
        onFps: (fps: number) => setFps(fps),
      });
      const scene = game.scene.getScene("GameScene") as GameSceneType | null;
      scene?.attachRoom(room);
    })();

    return () => {
      destroyed = true;
      try {
        game?.destroy(true);
      } catch {
        /* noop */
      }
    };
  }, [character, room, setFps, setLatency]);

  return (
    <div
      ref={hostRef}
      tabIndex={0}
      onClick={(e) => e.currentTarget.focus()}
      className="absolute inset-0 outline-none"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
