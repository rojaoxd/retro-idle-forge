import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCharacter, listVocations } from "@/lib/game/characters.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/characters/new")({
  head: () => ({
    meta: [
      { title: "Criar personagem — Retro Idle Forge" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewCharacterPage,
});

type Voc = { id: string; label: string; description: string; hp_base: number; mana_base: number; cap_base: number };

function NewCharacterPage() {
  const navigate = useNavigate();
  const create = useServerFn(createCharacter);
  const listVocs = useServerFn(listVocations);
  const [vocs, setVocs] = useState<Voc[]>([]);
  const [name, setName] = useState("");
  const [vocation, setVocation] = useState<string>("none");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listVocs().then((v) => setVocs(v as Voc[])).catch(() => {});
  }, [listVocs]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const c = await create({ data: { name: name.trim(), vocation } });
      toast.success("Personagem criado!");
      navigate({ to: "/play/$characterId", params: { characterId: (c as { id: string }).id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center py-10 px-4">
      <form onSubmit={submit} className="w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">Criar personagem</h1>

        <div>
          <label className="block text-sm mb-1">Nome do personagem</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Bubble"
            minLength={3}
            maxLength={20}
            required
          />
          <p className="text-xs text-white/50 mt-1">3–20 caracteres, apenas letras e espaços.</p>
        </div>

        <div>
          <label className="block text-sm mb-2">Vocação</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {vocs.map((v) => (
              <button
                type="button"
                key={v.id}
                onClick={() => setVocation(v.id)}
                className={`text-left border rounded-md p-3 ${
                  vocation === v.id
                    ? "border-blue-500 bg-blue-950/40"
                    : "border-white/10 bg-neutral-900 hover:border-white/30"
                }`}
              >
                <div className="font-semibold">{v.label}</div>
                <div className="text-xs text-white/60 mt-1">{v.description}</div>
                <div className="text-[10px] text-white/40 mt-2">
                  HP {v.hp_base} · Mana {v.mana_base} · Cap {v.cap_base}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Criando…" : "Criar personagem"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/characters" })}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
