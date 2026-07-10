import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { listMyCharacters, deleteCharacter } from "@/lib/game/characters.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/characters")({
  head: () => ({
    meta: [
      { title: "Personagens — Retro Idle Forge" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CharactersPage,
});

type Character = Awaited<ReturnType<typeof listMyCharacters>>[number];

function CharactersPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const list = useServerFn(listMyCharacters);
  const del = useServerFn(deleteCharacter);
  const [chars, setChars] = useState<Character[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    list()
      .then((rows) => {
        if (alive) setChars(rows as Character[]);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [list]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir personagem? Essa ação não pode ser desfeita.")) return;
    try {
      await del({ data: { id } });
      setChars((c) => c?.filter((x) => x.id !== id) ?? null);
      toast.success("Personagem excluído");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Escolha seu personagem</h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sair
          </Button>
        </div>

        <div className="space-y-2">
          {loading && <p className="text-white/60 text-sm">Carregando…</p>}
          {!loading && chars && chars.length === 0 && (
            <p className="text-white/60 text-sm">
              Você ainda não tem personagens. Crie o seu primeiro para começar.
            </p>
          )}
          {chars?.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between border border-white/10 rounded-md p-4 bg-neutral-900"
            >
              <div>
                <div className="font-semibold text-lg">{c.name}</div>
                <div className="text-white/60 text-xs">
                  Nível {c.level} · {vocationLabel(c.vocation)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    navigate({ to: "/play/$characterId", params: { characterId: c.id } })
                  }
                >
                  Selecionar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(c.id)}>
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <Link to="/characters/new">
            <Button variant="secondary">+ Criar novo personagem</Button>
          </Link>
        </div>
      </div>
      <button hidden onClick={() => router.invalidate()} />
    </div>
  );
}

function vocationLabel(v: string) {
  return (
    { none: "Sem vocação", knight: "Knight", paladin: "Paladin", sorcerer: "Sorcerer", druid: "Druid" } as Record<string, string>
  )[v] ?? v;
}
