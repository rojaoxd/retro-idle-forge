import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/play/$characterId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar no mundo — Retro Idle Forge" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  const { characterId } = Route.useParams();
  const navigate = useNavigate();
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const host = (import.meta.env.VITE_GAME_WS_URL as string | undefined) ?? "";
    const assets = (import.meta.env.VITE_GAME_ASSETS_URL as string | undefined) ?? "";
    if (!host) {
      setErr("VITE_GAME_WS_URL não configurado. Aponte para o host:porta do game-server (ex.: game.example.com:1337).");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (!token) {
        setErr("Sessão expirada. Faça login novamente.");
        return;
      }
      const hash = new URLSearchParams({ token, cid: characterId, host, ...(assets ? { assets } : {}) }).toString();
      setSrc(`/client/index.html#${hash}`);
    });
  }, [characterId]);

  if (err) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-6 text-center">
          <h1 className="text-2xl font-semibold">Não foi possível entrar</h1>
          <p className="text-sm text-red-400">{err}</p>
          <Button variant="outline" onClick={() => navigate({ to: "/characters" })}>Voltar</Button>
        </div>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white grid place-items-center">
        <div className="text-sm text-white/60">Carregando cliente…</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <iframe
        title="Retro Idle Forge — Cliente"
        src={src}
        className="h-full w-full border-0"
        allow="autoplay; fullscreen"
      />
    </div>
  );
}
