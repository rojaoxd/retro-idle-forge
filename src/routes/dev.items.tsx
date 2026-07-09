import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listItems, upsertItem, deleteItem } from "@/lib/dev/items.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SpritePicker } from "@/components/dev/SpritePicker";
import { Package, Plus, Trash2, Save } from "lucide-react";

export const Route = createFileRoute("/dev/items")({
  component: ItemsPage,
});

type Item = {
  id?: string;
  name: string;
  sprite_id: number | null;
  weight: number;
  capacity: number;
  attack: number;
  defense: number;
  armor: number;
  weapon_type: string | null;
  is_solid: boolean;
  is_container: boolean;
  is_stackable: boolean;
  is_useable: boolean;
  is_liquid_container: boolean;
  has_height: boolean;
  extra: Record<string, any>;
};

const empty: Item = {
  name: "",
  sprite_id: null,
  weight: 0,
  capacity: 0,
  attack: 0,
  defense: 0,
  armor: 0,
  weapon_type: null,
  is_solid: false,
  is_container: false,
  is_stackable: false,
  is_useable: false,
  is_liquid_container: false,
  has_height: false,
  extra: {},
};

function ItemsPage() {
  const [selected, setSelected] = useState<Item>(empty);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const list = useServerFn(listItems);
  const upsert = useServerFn(upsertItem);
  const del = useServerFn(deleteItem);

  const q = useQuery({ queryKey: ["items"], queryFn: () => list() });
  const saveMut = useMutation({
    mutationFn: (v: Item) => upsert({ data: v }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["items"] });
      setSelected(r.row as any);
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      setSelected(empty);
    },
  });

  const filtered = (q.data?.rows ?? []).filter((r: any) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="h-6 w-6 text-emerald-400" />
        <h1 className="text-2xl font-bold text-slate-100">Editor de Itens & Objetos</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* LIST */}
        <div className="dev-panel flex flex-col p-3">
          <div className="mb-2 flex gap-2">
            <Input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-800"
                style={{
                  color: selected.id === r.id ? "var(--dev-accent)" : "var(--dev-text)",
                  background: selected.id === r.id ? "var(--dev-surface-2)" : "transparent",
                }}
              >
                <span className="flex-1 truncate">{r.name}</span>
                {r.sprite_id && <span className="text-[10px] text-slate-500">#{r.sprite_id}</span>}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500">Nenhum item.</div>
            )}
          </div>
        </div>

        {/* FORM */}
        <ItemForm
          key={selected.id ?? "new"}
          initial={selected}
          saving={saveMut.isPending}
          onSave={(v) => saveMut.mutate(v)}
          onDelete={selected.id ? () => confirm("Excluir?") && delMut.mutate(selected.id!) : undefined}
        />
      </div>
    </div>
  );
}

function ItemForm({
  initial,
  saving,
  onSave,
  onDelete,
}: {
  initial: Item;
  saving: boolean;
  onSave: (v: Item) => void;
  onDelete?: () => void;
}) {
  const [v, setV] = useState<Item>(initial);
  useEffect(() => setV(initial), [initial]);

  function set<K extends keyof Item>(k: K, val: Item[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  const flags: [keyof Item, string, string][] = [
    ["is_solid", "isSolid", "Bloqueia passagem"],
    ["is_container", "isContainer", "É container"],
    ["is_stackable", "isStackable", "Empilhável (até 100)"],
    ["is_useable", "isUseable", "Usável (Use)"],
    ["is_liquid_container", "isLiquidContainer", "Guarda líquidos"],
    ["has_height", "hasHeight", "hasHeight (alto)"],
  ];

  return (
    <div className="dev-panel space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <SpritePicker value={v.sprite_id} onChange={(id) => set("sprite_id", id)} label="Sprite ID" />
        <div className="space-y-2">
          <label className="block text-xs uppercase text-slate-400">Nome do Item</label>
          <Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="ex.: Sword" />
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs uppercase tracking-wider text-emerald-400">Atributos Gerais</div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Peso (oz)">
            <Input type="number" step="0.1" value={v.weight}
                   onChange={(e) => set("weight", Number(e.target.value))} />
          </Field>
          <Field label="Volume / Slots">
            <Input type="number" value={v.capacity}
                   onChange={(e) => set("capacity", Number(e.target.value))} />
          </Field>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs uppercase tracking-wider text-emerald-400">Ataque & Defesa</div>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Ataque"><Input type="number" value={v.attack}
                                       onChange={(e) => set("attack", Number(e.target.value))} /></Field>
          <Field label="Defesa"><Input type="number" value={v.defense}
                                       onChange={(e) => set("defense", Number(e.target.value))} /></Field>
          <Field label="Armadura"><Input type="number" value={v.armor}
                                         onChange={(e) => set("armor", Number(e.target.value))} /></Field>
          <Field label="Tipo de Arma">
            <Select value={v.weapon_type ?? "none"}
                    onValueChange={(val) => set("weapon_type", val === "none" ? null : val)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— nenhum —</SelectItem>
                <SelectItem value="sword">Sword</SelectItem>
                <SelectItem value="axe">Axe</SelectItem>
                <SelectItem value="club">Club</SelectItem>
                <SelectItem value="distance">Distance</SelectItem>
                <SelectItem value="ammunition">Ammunition</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs uppercase tracking-wider text-emerald-400">Flags de Comportamento</div>
        <div className="grid gap-2 md:grid-cols-2">
          {flags.map(([k, code, label]) => (
            <label key={k} className="dev-inset flex items-center gap-3 p-3 text-sm cursor-pointer">
              <Checkbox checked={v[k] as boolean}
                        onCheckedChange={(c) => set(k, Boolean(c) as any)} />
              <div>
                <div className="font-mono text-emerald-400">{code}</div>
                <div className="text-xs text-slate-400">{label}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2 border-t border-slate-800 pt-4">
        <Button
          onClick={() => onSave(v)}
          disabled={saving || !v.name}
          style={{ background: "var(--dev-accent)", color: "#052e2b" }}
        >
          <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando…" : "Salvar Item"}
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
