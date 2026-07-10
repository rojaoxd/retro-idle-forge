import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getCharacter } from "@/lib/game/characters.functions";
import { getMapTiles } from "@/lib/game/map.functions";
import { joinGameRoom } from "@/net/colyseus";
import { useGameSessionStore, type CharacterRow } from "@/stores/gameSessionStore";
import type { Room } from "colyseus.js";

export const Route = createFileRoute("/_authenticated/play/$characterId")({
  head: () => ({
    meta: [
      { title: "Carregando jogo — Retro Idle Forge" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlayLoader,
});

type Phase = "idle" | "loading" | "ready" | "error";
type Step = "char" | "map" | "sprites" | "server";
type StepState = "pending" | "ok" | "error";

function PlayLoader() {
  const { characterId } = Route.useParams();
  const navigate = useNavigate();
  const setSession = useGameSessionStore((s) => s.setSession);

  const getChar = useServerFn(getCharacter);
  const fetchMap = useServerFn(getMapTiles);

  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState<Record<Step, StepState>>({
    char: "pending",
    map: "pending",
    sprites: "pending",
    server: "pending",
  });
  const [error, setError] = useState<string | null>(null);
  const charRef = useRef<CharacterRow | null>(null);
  const roomRef = useRef<Room | null>(null);
  const [tick, setTick] = useState(0);

  const mark = (k: Step, s: StepState) => setSteps((prev) => ({ ...prev, [k]: s }));

  const start = useCallback(async () => {
    setPhase("loading");
    setError(null);
    setSteps({ char: "pending", map: "pending", sprites: "pending", server: "pending" });
    charRef.current = null;
    if (roomRef.current) {
      try {
        roomRef.current.leave();
      } catch {
        /* noop */
      }
      roomRef.current = null;
    }

    const charP = getChar({ data: { id: characterId } })
      .then((c) => {
        charRef.current = c as CharacterRow;
        mark("char", "ok");
        return c as CharacterRow;
      })
      .catch((e) => {
        mark("char", "error");
        throw e;
      });

    const mapP = fetchMap()
      .then(async (m) => {
        mark("map", "ok");
        const urls = Object.values((m as { urlMap: Record<string, string | null> }).urlMap).filter(
          Boolean,
        ) as string[];
        await Promise.all(
          urls.map(
            (u) =>
              new Promise<void>((res) => {
                const img = new Image();
                img.onload = () => res();
                img.onerror = () => res();
                img.src = u;
              }),
          ),
        );
        mark("sprites", "ok");
      })
      .catch((e) => {
        mark("map", "error");
        mark("sprites", "error");
        throw e;
      });

    const serverP = charP
      .then((c) => joinGameRoom(c.name, c.id))
      .then((room) => {
        roomRef.current = room;
        mark("server", "ok");
      })
      .catch((e) => {
        mark("server", "error");
        throw e;
      });

    try {
      await Promise.all([charP, mapP, serverP]);
      setPhase("ready");
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Falha ao preparar o jogo");
    }
  }, [characterId, getChar, fetchMap]);

  useEffect(() => {
    start();
    return () => {
      // se sair sem entrar no jogo, encerra a sala
      if (phase !== "ready" && roomRef.current) {
        try {
          roomRef.current.leave();
        } catch {
          /* noop */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const enter = () => {
    if (!charRef.current || !roomRef.current) return;
    setSession({ character: charRef.current, room: roomRef.current });
    navigate({ to: "/game/$characterId", params: { characterId } });
  };

  const stepList: Array<{ key: Step; label: string }> = [
    { key: "char", label: "Carregando personagem" },
    { key: "server", label: "Conectando ao servidor" },
    { key: "map", label: "Carregando mapa" },
    { key: "sprites", label: "Carregando sprites" },
  ];

  const doneCount = Object.values(steps).filter((s) => s === "ok").length;
  const progress = Math.round((doneCount / stepList.length) * 100);

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-semibold text-center">
          {charRef.current?.name ?? "Preparando…"}
        </h1>

        <div className="h-2 w-full bg-white/10 rounded overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ul className="space-y-2">
          {stepList.map(({ key, label }) => (
            <li key={key} className="flex items-center gap-2 text-sm">
              <StepIcon state={steps[key]} />
              <span
                className={
                  steps[key] === "error"
                    ? "text-red-400"
                    : steps[key] === "ok"
                      ? "text-green-400"
                      : "text-white/70"
                }
              >
                {label}
              </span>
            </li>
          ))}
        </ul>

        {phase === "error" && <p className="text-red-400 text-sm text-center">{error}</p>}

        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={phase !== "ready"}
            onClick={enter}
          >
            {phase === "ready" ? "Entrar no jogo" : "Carregando…"}
          </Button>
          {phase === "error" && (
            <Button variant="outline" onClick={() => setTick((t) => t + 1)}>
              Tentar novamente
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate({ to: "/characters" })}>
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "ok") return <span className="text-green-400">✓</span>;
  if (state === "error") return <span className="text-red-400">✗</span>;
  return <span className="inline-block w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />;
}
