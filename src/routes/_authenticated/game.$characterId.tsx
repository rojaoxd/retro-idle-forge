import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { TibiaShell } from "@/components/tibia/TibiaShell";
import { useGameSessionStore } from "@/stores/gameSessionStore";

export const Route = createFileRoute("/_authenticated/game/$characterId")({
  head: () => ({
    meta: [
      { title: "Jogo — Retro Idle Forge" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GamePage,
});

function GamePage() {
  const { characterId } = Route.useParams();
  const navigate = useNavigate();
  const character = useGameSessionStore((s) => s.character);
  const room = useGameSessionStore((s) => s.room);

  useEffect(() => {
    if (!character || !room || character.id !== characterId) {
      navigate({ to: "/play/$characterId", params: { characterId }, replace: true });
    }
  }, [character, room, characterId, navigate]);

  if (!character || !room) return null;
  return <TibiaShell />;
}
