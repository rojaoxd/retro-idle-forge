import { useEffect, useRef } from "react";
import { joinGameRoom } from "@/net/colyseus";
import { useNetStore } from "@/stores/netStore";
import { useTibiaStore } from "@/stores/tibiaStore";

export function PhaserCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const characterName = useTibiaStore((s) => s.character.name);
  const setStatus = useNetStore((s) => s.setStatus);
  const setRoom = useNetStore((s) => s.setRoom);
  const setLatency = useTibiaStore((s) => s.setLatency);
  const setFps = useTibiaStore((s) => s.setFps);

  useEffect(() => {
    let destroyed = false;
    let game: import("phaser").Game | null = null;
    let currentRoom: Awaited<ReturnType<typeof joinGameRoom>> | null = null;

    (async () => {
      setStatus("connecting");
      try {
        const room = await joinGameRoom(characterName);
        if (destroyed) {
          room.leave();
          return;
        }
        currentRoom = room;
        setRoom(room);
        setStatus("connected");
        room.onLeave(() => setStatus("closed"));
        room.onError((_code, message) => setStatus("error", message ?? "room error"));

        const Phaser = (await import("phaser")).default;
        const { GameScene } = await import("@/game/scenes/GameScene");
        if (destroyed || !hostRef.current) {
          room.leave();
          return;
        }
        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: hostRef.current,
          backgroundColor: "#000000",
          pixelArt: true,
          scale: {
            mode: Phaser.Scale.RESIZE,
            width: "100%",
            height: "100%",
          },
          scene: [GameScene],
          banner: false,
        });
        game.scene.start("GameScene", {
          room,
          onLatency: (ms: number) => setLatency(ms),
          onFps: (fps: number) => setFps(fps),
        });
      } catch (e) {
        console.error("[Colyseus] Falha ao conectar:", e);
        setStatus("error", e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      destroyed = true;
      try {
        game?.destroy(true);
      } catch {
        /* noop */
      }
      try {
        currentRoom?.leave();
      } catch {
        /* noop */
      }
      setRoom(null);
    };
    // Reconecta apenas se o nome do personagem mudar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterName]);

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
