import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPalettes, upsertPalette, deletePalette } from "@/lib/dev/palettes.functions";
import { listObjects } from "@/lib/dev/objects.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Plus, Trash2, Save } from "lucide-react";

export const Route = createFileRoute("/dev/palettes")({ component: PalettesPage });

type P = {
  id?: string; name: string;
  palette_group: "nature" | "town" | "dungeon" | "walls" | "creatures" | "items" | "effects" | "misc";
  object_ids: string[];
};
const emptyP: P = { name: "", palette_group: "nature", object_ids: [] };

function PalettesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPalettes);
  const upFn = useServerFn(upsertPalette);
  const delFn = useServerFn(deletePalette);
  const objFn = useServerFn(listObjects);
  const [sel, setSel] = useState<P>(emptyP);
  const list = useQuery({ queryKey: ["palettes"], queryFn: () => listFn() });
  const objs = useQuery({ queryKey: ["objects-brief"], queryFn: () => objFn() });
  const save = useMutation({
    mutationFn: (v: P) => upFn({ data: v }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["palettes"] }); setSel(r.row as any); },
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["palettes"] }); setSel(emptyP); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="h-6 w-6 text-emerald-400" />
        <h1 className="text-2xl font-bold text-slate-100">Paletas de Criação</h1>
      </div>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="dev-panel p-3 space-y-1">
          <Button size="sm" onClick={() => setSel(emptyP)} className="w-full mb-2"
            style={{ background: "var(--dev-accent)", color: "#052e2b" }}>
            <Plus className="h-4 w-4 mr-2" /> Nova paleta
          </Button>
          {(list.data?.rows ?? []).map((p: any) => (
            <button key={p.id} type="button" onClick={() => setSel(p)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-800"
              style={{
                color: sel.id === p.id ? "var(--dev-accent)" : "var(--dev-text)",
                background: sel.id === p.id ? "var(--dev-surface-2)" : "transparent",
              }}>
              <span className="text-[9px] uppercase text-slate-500">{p.palette_group}</span>
              <span className="flex-1 truncate">{p.name}</span>
            </button>
          ))}
        </div>

        <PaletteForm key={sel.id ?? "new"} initial={sel} objects={objs.data?.objects ?? []}
          onSave={(v) => save.mutate(v)} saving={save.isPending}
          onDelete={sel.id ? () => confirm("Excluir?") && del.mutate(sel.id!) : undefined} />
      </div>
    </div>
  );
}

function PaletteForm({ initial, objects, onSave, saving, onDelete }: {
  initial: P; objects: any[]; onSave: (v: P) => void; saving: boolean; onDelete?: () => void;
}) {
  const [v, setV] = useState<P>(initial);
  useEffect(() => setV(initial), [initial]);
  function toggle(id: string) {
    setV((p) => ({
      ...p,
      object_ids: p.object_ids.includes(id) ? p.object_ids.filter((x) => x !== id) : [...p.object_ids, id],
    }));
  }
  return (
    <div className="dev-panel space-y-4 p-6">
      <div className="grid gap-3 md:grid-cols-[1fr_200px]">
        <div>
          <label className="block text-[10px] uppercase text-slate-400">Nome</label>
          <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="ex.: Grass & Trees" />
        </div>
        <div>
          <label className="block text-[10px] uppercase text-slate-400">Grupo</label>
          <Select value={v.palette_group} onValueChange={(x) => setV({ ...v, palette_group: x as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["nature", "town", "dungeon", "walls", "creatures", "items", "effects", "misc"].map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs uppercase tracking-wider text-emerald-400">
          Objetos ({v.object_ids.length} selecionados)
        </div>
        <div className="dev-inset max-h-[420px] overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-1 md:grid-cols-3 lg:grid-cols-4">
            {objects.map((o: any) => {
              const active = v.object_ids.includes(o.id);
              return (
                <button key={o.id} type="button" onClick={() => toggle(o.id)}
                  className="rounded border p-2 text-left text-xs"
                  style={{
                    borderColor: active ? "var(--dev-accent)" : "rgb(51,65,85)",
                    background: active ? "var(--dev-surface-2)" : "transparent",
                  }}>
                  <div className="truncate font-medium">{o.name}</div>
                  <div className="text-[9px] uppercase text-slate-500">{o.object_kind} · {o.width}×{o.height}</div>
                </button>
              );
            })}
            {objects.length === 0 && (
              <div className="col-span-4 p-6 text-center text-xs text-slate-500">
                Nenhum objeto ainda. Vá para "Object Builder" para criar.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-t border-slate-800 pt-4">
        <Button onClick={() => onSave(v)} disabled={saving || !v.name}
          style={{ background: "var(--dev-accent)", color: "#052e2b" }}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando…" : "Salvar paleta"}
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
