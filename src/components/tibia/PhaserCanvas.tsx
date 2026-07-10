import { useCallback, useEffect, useRef, useState } from "react";
import { joinGameRoom } from "@/net/colyseus";
import { useNetStore } from "@/stores/netStore";
import { useTibiaStore } from "@/stores/tibiaStore";
import type { GameScene as GameSceneType } from "@/game/scenes/GameScene";

export function PhaserCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const characterName = useTibiaStore((s) => s.character.name);
  const status = useNetStore((s) => s.status);
  const netError = useNetStore((s) => s.error);
  const setStatus = useNetStore((s) => s.setStatus);
  const setRoom = useNetStore((s) => s.setRoom);
  const setLatency = useTibiaStore((s) => s.setLatency);
  const setFps = useTibiaStore((s) => s.setFps);

  const sceneRef = useRef<GameSceneType | null>(null);
  const roomRef = useRef<Awaited<ReturnType<typeof joinGameRoom>> | null>(null);
  const [reconnectTick, setReconnectTick] = useState(0);

  // Monta o Phaser + carrega mapa uma única vez (independe do Colyseus)
  useEffect(() => {
    let destroyed = false;
    let game: import("phaser").Game | null = null;

    (async () => {
      const Phaser = (await import("phaser")).default;
      const { GameScene } = await import("@/game/scenes/GameScene");
      if (destroyed || !hostRef.current) return;

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
        onLatency: (ms: number) => setLatency(ms),
        onFps: (fps: number) => setFps(fps),
      });
      // guarda referência da cena para attachRoom posterior
      const scene = game.scene.getScene("GameScene") as GameSceneType | null;
      sceneRef.current = scene;
      // Se o room já chegou antes da cena ficar pronta, anexa agora.
      if (roomRef.current && scene) {
        scene.events.once("create", () => scene.attachRoom(roomRef.current!));
      }
    })();

    return () => {
      destroyed = true;
      try {
        game?.destroy(true);
      } catch {
        /* noop */
      }
      sceneRef.current = null;
    };
  }, [setFps, setLatency]);

  // Tenta conectar ao Colyseus (independente do Phaser)
  useEffect(() => {
    let destroyed = false;
    setStatus("connecting");

    (async () => {
      try {
        const room = await joinGameRoom(characterName);
        if (destroyed) {
          room.leave();
          return;
        }
        roomRef.current = room;
        setRoom(room);
        setStatus("connected");
        room.onLeave(() => setStatus("closed"));
        room.onError((_code, message) => setStatus("error", message ?? "room error"));
        // Anexa à cena (se já existir; senão anexa quando a cena montar).
        const scene = sceneRef.current;
        if (scene && scene.scene?.isActive?.()) {
          scene.attachRoom(room);
        }
      } catch (e) {
        console.error("[Colyseus] Falha ao conectar:", e);
        const msg =
          e instanceof Error
            ? e.message
            : typeof Event !== "undefined" && e instanceof Event
              ? "servidor indisponível"
              : String(e);
        if (!destroyed) setStatus("error", msg);
      }
    })();

    return () => {
      destroyed = true;
      try {
        roomRef.current?.leave();
      } catch {
        /* noop */
      }
      roomRef.current = null;
      setRoom(null);
    };
  }, [characterName, reconnectTick, setRoom, setStatus]);

  const retry = useCallback(() => setReconnectTick((t) => t + 1), []);

  const showBanner = status === "error" || status === "closed" || status === "connecting";

  return (
    <>
      <div
        ref={hostRef}
        tabIndex={0}
        onClick={(e) => e.currentTarget.focus()}
        className="absolute inset-0 outline-none"
        style={{ imageRendering: "pixelated" }}
      />
      {showBanner && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-2 rounded bg-black/80 border border-white/10 px-2 py-1 text-[11px] text-white/90">
          <span
            className={
              status === "connecting"
                ? "text-yellow-300"
                : "text-red-400"
            }
          >
            {status === "connecting"
              ? "Conectando ao servidor…"
              : `Desconectado${netError ? ` · ${netError}` : ""}`}
          </span>
          {status !== "connecting" && (
            <button
              onClick={retry}
              className="rounded border border-white/20 px-2 py-[1px] hover:bg-white/10"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}
    </>
  );
}
