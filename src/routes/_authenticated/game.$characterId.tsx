import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/game/$characterId")({
  head: () => ({
    meta: [
      { title: "Jogo — Retro Idle Forge" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GameRedirect,
});

/**
 * Rota mantida por compatibilidade — hoje só redireciona para /play/$characterId.
 * Volta a ser útil quando o cliente Canvas 2D do engine for portado (fase §4).
 */
function GameRedirect() {
  const { characterId } = Route.useParams();
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/play/$characterId", params: { characterId }, replace: true });
  }, [characterId, navigate]);
  return null;
}
