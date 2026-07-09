import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listVocations,
  upsertVocation,
  deleteVocation,
  listSpells,
  upsertSpell,
  deleteSpell,
} from "@/lib/dev/vocations.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wand2, Plus, Trash2, Save } from "lucide-react";

export const Route = createFileRoute("/dev/vocations")({
  component: VocationsPage,
});

function VocationsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wand2 className="h-6 w-6 text-purple-400" />
        <h1 className="text-2xl font-bold text-slate-100">Vocações & Magias</h1>
      </div>
      <Tabs defaultValue="vocations">
        <TabsList>
          <TabsTrigger value="vocations">Vocações</TabsTrigger>
          <TabsTrigger value="spells">Magias</TabsTrigger>
        </TabsList>
        <TabsContent value="vocations" className="mt-4">
          <VocationsTab />
        </TabsContent>
        <TabsContent value="spells" className="mt-4">
          <SpellsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Vocation = {
  id?: string;
  name: string;
  hp_per_level: number;
  mana_per_level: number;
  capacity_per_level: number;
  hp_regen_ms: number;
  mana_regen_ms: number;
};
const emptyVoc: Vocation = {
  name: "",
  hp_per_level: 5,
  mana_per_level: 5,
  capacity_per_level: 10,
  hp_regen_ms: 6000,
  mana_regen_ms: 4000,
};

function VocationsTab() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Vocation>(emptyVoc);
  const list = useServerFn(listVocations);
  const upsert = useServerFn(upsertVocation);
  const del = useServerFn(deleteVocation);
  const q = useQuery({ queryKey: ["vocations"], queryFn: () => list() });
  const save = useMutation({
    mutationFn: (v: Vocation) => upsert({ data: v as any }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["vocations"] });
      setSelected(r.row as any);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vocations"] });
      setSelected(emptyVoc);
    },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="dev-panel p-3">
        <Button
          size="sm"
          className="mb-2 w-full"
          onClick={() => setSelected(emptyVoc)}
          style={{ background: "var(--dev-accent)", color: "#052e2b" }}
        >
          <Plus className="mr-1 h-4 w-4" /> Nova Vocação
        </Button>
        <div className="space-y-1">
          {(q.data?.rows ?? []).map((r: any) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r as any)}
              className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-800"
              style={{
                color: selected.id === r.id ? "var(--dev-accent)" : "var(--dev-text)",
                background:
                  selected.id === r.id ? "var(--dev-surface-2)" : "transparent",
              }}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>
      <VocationForm
        key={selected.id ?? "new"}
        initial={selected}
        saving={save.isPending}
        onSave={(v) => save.mutate(v)}
        onDelete={
          selected.id
            ? () => confirm("Excluir vocação?") && remove.mutate(selected.id!)
            : undefined
        }
      />
    </div>
  );
}

function VocationForm({
  initial,
  saving,
  onSave,
  onDelete,
}: {
  initial: Vocation;
  saving: boolean;
  onSave: (v: Vocation) => void;
  onDelete?: () => void;
}) {
  const [v, setV] = useState(initial);
  useEffect(() => setV(initial), [initial]);
  function set<K extends keyof Vocation>(k: K, val: Vocation[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }
  return (
    <div className="dev-panel space-y-5 p-6">
      <Field label="Nome">
        <Input value={v.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="HP / level">
          <Input
            type="number"
            value={v.hp_per_level}
            onChange={(e) => set("hp_per_level", Number(e.target.value))}
          />
        </Field>
        <Field label="Mana / level">
          <Input
            type="number"
            value={v.mana_per_level}
            onChange={(e) => set("mana_per_level", Number(e.target.value))}
          />
        </Field>
        <Field label="Capacidade / level">
          <Input
            type="number"
            value={v.capacity_per_level}
            onChange={(e) => set("capacity_per_level", Number(e.target.value))}
          />
        </Field>
        <Field label="Regen HP (ms)">
          <Input
            type="number"
            value={v.hp_regen_ms}
            onChange={(e) => set("hp_regen_ms", Number(e.target.value))}
          />
        </Field>
        <Field label="Regen Mana (ms)">
          <Input
            type="number"
            value={v.mana_regen_ms}
            onChange={(e) => set("mana_regen_ms", Number(e.target.value))}
          />
        </Field>
      </div>
      <div className="flex gap-2 border-t border-slate-800 pt-4">
        <Button
          onClick={() => onSave(v)}
          disabled={saving || !v.name}
          style={{ background: "var(--dev-accent)", color: "#052e2b" }}
        >
          <Save className="mr-2 h-4 w-4" /> Salvar
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

type Spell = {
  id?: string;
  name: string;
  words: string;
  mana_cost: number;
  min_level: number;
  vocation_id: string | null;
  kind: "healing" | "attack" | "support" | "rune";
  effect_id: string | null;
};
const emptySpell: Spell = {
  name: "",
  words: "",
  mana_cost: 0,
  min_level: 1,
  vocation_id: null,
  kind: "attack",
  effect_id: null,
};

function SpellsTab() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Spell>(emptySpell);
  const list = useServerFn(listSpells);
  const listVoc = useServerFn(listVocations);
  const upsert = useServerFn(upsertSpell);
  const del = useServerFn(deleteSpell);
  const q = useQuery({ queryKey: ["spells"], queryFn: () => list() });
  const voc = useQuery({ queryKey: ["vocations"], queryFn: () => listVoc() });

  const save = useMutation({
    mutationFn: (v: Spell) => upsert({ data: v as any }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["spells"] });
      setSelected(r.row as any);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["spells"] });
      setSelected(emptySpell);
    },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div className="dev-panel p-3">
        <Button
          size="sm"
          className="mb-2 w-full"
          onClick={() => setSelected(emptySpell)}
          style={{ background: "var(--dev-accent)", color: "#052e2b" }}
        >
          <Plus className="mr-1 h-4 w-4" /> Nova Magia
        </Button>
        <div className="space-y-1">
          {(q.data?.rows ?? []).map((r: any) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r as any)}
              className="flex w-full flex-col rounded px-2 py-1.5 text-left text-sm hover:bg-slate-800"
              style={{
                color: selected.id === r.id ? "var(--dev-accent)" : "var(--dev-text)",
                background:
                  selected.id === r.id ? "var(--dev-surface-2)" : "transparent",
              }}
            >
              <span>{r.name}</span>
              <span className="font-mono text-[10px] text-slate-500">
                "{r.words}" · lvl {r.min_level} · {r.mana_cost} mana
              </span>
            </button>
          ))}
        </div>
      </div>
      <SpellForm
        key={selected.id ?? "new"}
        initial={selected}
        vocations={voc.data?.rows ?? []}
        saving={save.isPending}
        onSave={(v) => save.mutate(v)}
        onDelete={
          selected.id
            ? () => confirm("Excluir magia?") && remove.mutate(selected.id!)
            : undefined
        }
      />
    </div>
  );
}

function SpellForm({
  initial,
  vocations,
  saving,
  onSave,
  onDelete,
}: {
  initial: Spell;
  vocations: any[];
  saving: boolean;
  onSave: (v: Spell) => void;
  onDelete?: () => void;
}) {
  const [v, setV] = useState(initial);
  useEffect(() => setV(initial), [initial]);
  function set<K extends keyof Spell>(k: K, val: Spell[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }
  return (
    <div className="dev-panel space-y-5 p-6">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome">
          <Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Light Healing" />
        </Field>
        <Field label="Palavras Mágicas">
          <Input
            className="font-mono"
            value={v.words}
            onChange={(e) => set("words", e.target.value)}
            placeholder="exura"
          />
        </Field>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Field label="Custo de Mana">
          <Input
            type="number"
            value={v.mana_cost}
            onChange={(e) => set("mana_cost", Number(e.target.value))}
          />
        </Field>
        <Field label="Level Mínimo">
          <Input
            type="number"
            value={v.min_level}
            onChange={(e) => set("min_level", Number(e.target.value))}
          />
        </Field>
        <Field label="Tipo">
          <Select value={v.kind} onValueChange={(k) => set("kind", k as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="attack">Ataque</SelectItem>
              <SelectItem value="healing">Cura</SelectItem>
              <SelectItem value="support">Suporte</SelectItem>
              <SelectItem value="rune">Runa</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Vocação">
          <Select
            value={v.vocation_id ?? "any"}
            onValueChange={(val) => set("vocation_id", val === "any" ? null : val)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">— todas —</SelectItem>
              {vocations.map((r: any) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="flex gap-2 border-t border-slate-800 pt-4">
        <Button
          onClick={() => onSave(v)}
          disabled={saving || !v.name || !v.words}
          style={{ background: "var(--dev-accent)", color: "#052e2b" }}
        >
          <Save className="mr-2 h-4 w-4" /> Salvar
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
