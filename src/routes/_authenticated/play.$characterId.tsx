import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getCharacter } from "@/lib/game/characters.functions";

export const Route = createFileRoute("/_authenticated/play/$characterId")({
  head: () => ({
    meta: [
      { title: "Entrar no mundo — Retro Idle Forge" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlayPage,
});

/**
 * Placeholder da tela de entrada no jogo.
 *
 * Nesta fase (pós-reset), o engine Tibia74 está sendo integrado no `game-server/`
 * e o cliente Canvas 2D ainda não foi portado — as próximas fases (§4 do plano)
 * substituem este placeholder pela conexão WebSocket binária com o engine.
 */
function PlayPage() {
  const { characterId } = Route.useParams();
  const navigate = useNavigate();
  const getChar = useServerFn(getCharacter);
  const [name, setName] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getChar({ data: { id: characterId } })
      .then((c) => setName((c as { name: string }).name))
      .catch((e) => setErr(e instanceof Error ? e.message : "Erro"));
  }, [characterId, getChar]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-6 text-center">
        <h1 className="text-2xl font-semibold">{name ?? "Carregando…"}</h1>
        <div className="rounded border border-white/10 bg-white/5 p-6 text-sm text-white/70 space-y-3">
          <p className="text-amber-300">🚧 Cliente do engine em migração</p>
          <p>
            O servidor está sendo reconstruído em cima do engine <b>Tibia74-JS-Engine</b>.
            Assim que o cliente Canvas 2D estiver portado, esta tela vai conectar
            direto ao WebSocket do servidor AWS.
          </p>
          {err && <p className="text-red-400">{err}</p>}
        </div>
        <Button variant="outline" onClick={() => navigate({ to: "/characters" })}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
