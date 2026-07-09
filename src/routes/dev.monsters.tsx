import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listMonsters,
  upsertMonster,
  deleteMonster,
} from "@/lib/dev/monsters.functions";
import { listItems } from "@/lib/dev/items.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpritePicker } from "@/components/dev/SpritePicker";
import { Skull, Plus, Trash2, Save, X } from "lucide-react";

export const Route = createFileRoute("/dev/monsters")({
  component: MonstersPage,
});

type LootEntry = { item_id: string; chance: number; min: number; max: number };
type Monster = {
  id?: string;
  name: string;
  hp: number;
  speed: number;
  exp_reward: number;
  max_damage: number;
  sprite_id: number | null;
  loot_table: LootEntry[];
};

const empty: Monster = {
  name: "",
  hp: 100,
  speed: 100,
  exp_reward: 0,
  max_damage: 0,
  sprite_id: null,
  loot_table: [],
};

function MonstersPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Monster>(empty);
  const [search, setSearch] = useState("");

  const list = useServerFn(listMonsters);
  const upsert = useServerFn(upsertMonster);
  const del = useServerFn(deleteMonster);
  const listItemsFn = useServerFn(listItems);

  const q = useQuery({ queryKey: ["monsters"], queryFn: () => list() });
  const itemsQ = useQuery({ queryKey: ["items"], queryFn: () => listItemsFn() });

  const save = useMutation({
    mutationFn: (v: Monster) => upsert({ data: v as any }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["monsters"] });
      setSelected(r.row as any);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monsters"] });
      setSelected(empty);
    },
  });

  const filtered = (q.data?.rows ?? []).filter((r: any) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skull className="h-6 w-6 text-red-400" />
        <h1 className="text-2xl font-bold text-slate-100">Criaturas & Monstros</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="dev-panel p-3">
          <div className="mb-2 flex gap-2">
            <Input
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              size="sm"
              onClick={() => setSelected(empty)}
              style={{ background: "var(--dev-accent)", color: "#052e2b" }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {filtered.map((r: any) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r as any)}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-slate-800"
                style={{
                  color: selected.id === r.id ? "var(--dev-accent)" : "var(--dev-text)",
                  background:
                    selected.id === r.id ? "var(--dev-surface-2)" : "transparent",
                }}
              >
                <span className="truncate">{r.name}</span>
                <span className="text-[10px] text-slate-500">
                  {r.hp} HP · {r.exp_reward} XP
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500">
                Nenhum monstro.
              </div>
            )}
          </div>
        </div>

        <MonsterForm
          key={selected.id ?? "new"}
          initial={selected}
          items={itemsQ.data?.rows ?? []}
          saving={save.isPending}
          onSave={(v) => save.mutate(v)}
          onDelete={
            selected.id
              ? () => confirm("Excluir monstro?") && remove.mutate(selected.id!)
              : undefined
          }
        />
      </div>
    </div>
  );
}

function MonsterForm({
  initial,
  items,
  saving,
  onSave,
  onDelete,
}: {
  initial: Monster;
  items: any[];
  saving: boolean;
  onSave: (v: Monster) => void;
  onDelete?: () => void;
}) {
  const [v, setV] = useState<Monster>(initial);
  useEffect(() => setV(initial), [initial]);

  function set<K extends keyof Monster>(k: K, val: Monster[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  function addLoot() {
    if (!items[0]) return;
    set("loot_table", [
      ...v.loot_table,
      { item_id: items[0].id, chance: 10, min: 1, max: 1 },
    ]);
  }
  function updateLoot(i: number, patch: Partial<LootEntry>) {
    set(
      "loot_table",
      v.loot_table.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    );
  }
  function removeLoot(i: number) {
    set("loot_table", v.loot_table.filter((_, idx) => idx !== i));
  }

  return (
    <div className="dev-panel space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <SpritePicker
          value={v.sprite_id}
          onChange={(id) => set("sprite_id", id)}
          label="Sprite"
        />
        <div className="space-y-2">
          <label className="block text-xs uppercase text-slate-400">Nome</label>
          <Input
            value={v.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="ex.: Rotworm"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs uppercase tracking-wider text-red-400">
          Atributos de Combate
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Vida (HP)">
            <Input
              type="number"
              value={v.hp}
              onChange={(e) => set("hp", Number(e.target.value))}
            />
          </Field>
          <Field label="Velocidade">
            <Input
              type="number"
              value={v.speed}
              onChange={(e) => set("speed", Number(e.target.value))}
            />
          </Field>
          <Field label="Experiência">
            <Input
              type="number"
              value={v.exp_reward}
              onChange={(e) => set("exp_reward", Number(e.target.value))}
            />
          </Field>
          <Field label="Dano Máx.">
            <Input
              type="number"
              value={v.max_damage}
              onChange={(e) => set("max_damage", Number(e.target.value))}
            />
          </Field>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-red-400">
            Tabela de Loot
          </div>
          <Button size="sm" variant="outline" onClick={addLoot}>
            <Plus className="mr-1 h-3 w-3" /> Item
          </Button>
        </div>
        {v.loot_table.length === 0 ? (
          <div className="dev-inset p-4 text-center text-xs text-slate-500">
            Nenhum item no loot.
          </div>
        ) : (
          <div className="space-y-2">
            {v.loot_table.map((l, i) => (
              <div
                key={i}
                className="dev-inset grid grid-cols-[1fr_90px_80px_80px_auto] items-center gap-2 p-2"
              >
                <Select
                  value={l.item_id}
                  onValueChange={(val) => updateLoot(i, { item_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((it: any) => (
                      <SelectItem key={it.id} value={it.id}>
                        {it.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    value={l.chance}
                    onChange={(e) =>
                      updateLoot(i, { chance: Number(e.target.value) })
                    }
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                    %
                  </span>
                </div>
                <Input
                  type="number"
                  value={l.min}
                  placeholder="min"
                  onChange={(e) => updateLoot(i, { min: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  value={l.max}
                  placeholder="max"
                  onChange={(e) => updateLoot(i, { max: Number(e.target.value) })}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeLoot(i)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-slate-800 pt-4">
        <Button
          onClick={() => onSave(v)}
          disabled={saving || !v.name}
          style={{ background: "var(--dev-accent)", color: "#052e2b" }}
        >
          <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando…" : "Salvar Monstro"}
        </Button>
        {onDelete && (
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Excluir
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs uppercase text-slate-400">{label}</label>
      {children}
    </div>
  );
}
