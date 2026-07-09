import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listActions, upsertAction, deleteAction,
  listMovements, upsertMovement, deleteMovement,
} from "@/lib/dev/scripts.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Code2, Plus, Trash2, Save, CheckCircle2, XCircle } from "lucide-react";

const MonacoEditor = lazy(() => import("@monaco-editor/react").then((m) => ({ default: m.default })));

export const Route = createFileRoute("/dev/scripts")({ component: ScriptsPage });

type Tab = "actions" | "movements";

const ACTION_TEMPLATE = `-- Script executado quando o item é usado
function onUse(player, item, fromPos, target, toPos)
  player:sendTextMessage("Você usou o item!")
  return true
end
`;

const MOVE_TEMPLATES: Record<string, string> = {
  onStepIn: `function onStepIn(player, item, position, fromPosition)
  player:teleportTo({x=100, y=100, z=7})
  return true
end
`,
  onStepOut: `function onStepOut(player, item, position, fromPosition)
  return true
end
`,
  onEquip: `function onEquip(player, item, slot)
  player:addCondition(CONDITION_REGENERATION)
  return true
end
`,
  onDeEquip: `function onDeEquip(player, item, slot)
  return true
end
`,
  onAddItem: `function onAddItem(moveItem, tileItem, position)
  return true
end
`,
  onRemoveItem: `function onRemoveItem(moveItem, tileItem, position)
  return true
end
`,
};

function ScriptsPage() {
  const [tab, setTab] = useState<Tab>("actions");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Code2 className="h-6 w-6 text-emerald-400" />
        <h1 className="text-2xl font-bold text-slate-100">Actions &amp; Movements</h1>
      </div>
      <div className="flex gap-2 border-b border-slate-800">
        {(["actions", "movements"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="border-b-2 px-4 py-2 text-sm"
            style={{
              borderColor: tab === t ? "var(--dev-accent)" : "transparent",
              color: tab === t ? "var(--dev-text)" : "var(--dev-text-dim)",
            }}>
            {t === "actions" ? "Actions (onUse)" : "Movements (onStepIn/Equip)"}
          </button>
        ))}
      </div>
      {tab === "actions" ? <ActionsPane /> : <MovementsPane />}
    </div>
  );
}

/* ─── ACTIONS ─── */

type ActionRow = {
  id?: string; name: string;
  target_kind: "item_id" | "action_id" | "unique_id";
  target_value: number;
  code: string; enabled: boolean;
  notes?: string | null;
};
const emptyAction: ActionRow = {
  name: "", target_kind: "item_id", target_value: 0,
  code: ACTION_TEMPLATE, enabled: true, notes: "",
};

function ActionsPane() {
  const qc = useQueryClient();
  const [sel, setSel] = useState<ActionRow>(emptyAction);
  const listFn = useServerFn(listActions);
  const upFn = useServerFn(upsertAction);
  const delFn = useServerFn(deleteAction);
  const q = useQuery({ queryKey: ["scripts_actions"], queryFn: () => listFn() });
  const save = useMutation({
    mutationFn: (v: ActionRow) => upFn({ data: v }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["scripts_actions"] }); setSel(r.row); },
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scripts_actions"] }); setSel(emptyAction); },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <ScriptList rows={q.data?.rows ?? []} sel={sel} setSel={setSel} newDefault={emptyAction} />
      <ScriptEditor value={sel} onChange={setSel} onSave={() => save.mutate(sel)} saving={save.isPending}
        onDelete={sel.id ? () => confirm("Excluir?") && del.mutate(sel.id!) : undefined}
        kind="action" />
    </div>
  );
}

/* ─── MOVEMENTS ─── */

type MoveRow = {
  id?: string; name: string;
  target_kind: "tile_object_id" | "action_id" | "unique_id" | "equip_slot";
  target_value: number;
  event: keyof typeof MOVE_TEMPLATES;
  code: string; enabled: boolean; notes?: string | null;
};
const emptyMove: MoveRow = {
  name: "", target_kind: "tile_object_id", target_value: 0,
  event: "onStepIn", code: MOVE_TEMPLATES["onStepIn"], enabled: true, notes: "",
};

function MovementsPane() {
  const qc = useQueryClient();
  const [sel, setSel] = useState<MoveRow>(emptyMove);
  const listFn = useServerFn(listMovements);
  const upFn = useServerFn(upsertMovement);
  const delFn = useServerFn(deleteMovement);
  const q = useQuery({ queryKey: ["scripts_movements"], queryFn: () => listFn() });
  const save = useMutation({
    mutationFn: (v: MoveRow) => upFn({ data: v }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["scripts_movements"] }); setSel(r.row); },
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scripts_movements"] }); setSel(emptyMove); },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <ScriptList rows={q.data?.rows ?? []} sel={sel as any} setSel={setSel as any} newDefault={emptyMove as any} />
      <ScriptEditor value={sel} onChange={setSel} onSave={() => save.mutate(sel)} saving={save.isPending}
        onDelete={sel.id ? () => confirm("Excluir?") && del.mutate(sel.id!) : undefined}
        kind="movement" />
    </div>
  );
}

/* ─── shared list ─── */

function ScriptList({ rows, sel, setSel, newDefault }: any) {
  const [q, setQ] = useState("");
  const filtered = rows.filter((r: any) => r.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="dev-panel flex flex-col p-3">
      <div className="mb-2 flex gap-2">
        <Input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button size="sm" onClick={() => setSel(newDefault)}
          style={{ background: "var(--dev-accent)", color: "#052e2b" }}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto space-y-1">
        {filtered.map((r: any) => (
          <button key={r.id} type="button" onClick={() => setSel(r)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-800"
            style={{
              color: sel.id === r.id ? "var(--dev-accent)" : "var(--dev-text)",
              background: sel.id === r.id ? "var(--dev-surface-2)" : "transparent",
            }}>
            {r.enabled ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <XCircle className="h-3 w-3 text-slate-500" />}
            <span className="flex-1 truncate">{r.name}</span>
            <span className="text-[9px] text-slate-500">#{r.target_value}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="p-4 text-center text-xs text-slate-500">Nenhum script.</div>
        )}
      </div>
    </div>
  );
}

/* ─── shared editor ─── */

function ScriptEditor({
  value, onChange, onSave, saving, onDelete, kind,
}: {
  value: any; onChange: (v: any) => void;
  onSave: () => void; saving: boolean;
  onDelete?: () => void;
  kind: "action" | "movement";
}) {
  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => setValidation(null), [value.id]);

  async function validateLua() {
    try {
      const luaparse: any = await import("luaparse");
      luaparse.parse(value.code, { luaVersion: "5.3" });
      setValidation("✓ Sintaxe Lua válida");
    } catch (e: any) {
      setValidation(`✗ ${e.message}`);
    }
  }

  return (
    <div className="dev-panel space-y-3 p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_180px_140px_auto]">
        <div>
          <label className="block text-[10px] uppercase text-slate-400">Nome</label>
          <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="ex.: Magic Door" />
        </div>
        <div>
          <label className="block text-[10px] uppercase text-slate-400">Target Kind</label>
          <Select value={value.target_kind} onValueChange={(v) => onChange({ ...value, target_kind: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {kind === "action" ? (
                <>
                  <SelectItem value="item_id">item_id</SelectItem>
                  <SelectItem value="action_id">action_id</SelectItem>
                  <SelectItem value="unique_id">unique_id</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="tile_object_id">tile_object_id</SelectItem>
                  <SelectItem value="action_id">action_id</SelectItem>
                  <SelectItem value="unique_id">unique_id</SelectItem>
                  <SelectItem value="equip_slot">equip_slot</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-[10px] uppercase text-slate-400">Valor</label>
          <Input type="number" value={value.target_value}
            onChange={(e) => onChange({ ...value, target_value: Number(e.target.value) })} />
        </div>
        <div className="flex flex-col items-end">
          <label className="text-[10px] uppercase text-slate-400">Ativo</label>
          <Switch checked={value.enabled} onCheckedChange={(v) => onChange({ ...value, enabled: v })} />
        </div>
      </div>

      {kind === "movement" && (
        <div>
          <label className="block text-[10px] uppercase text-slate-400">Evento</label>
          <Select value={value.event}
            onValueChange={(v) => onChange({ ...value, event: v, code: value.code || MOVE_TEMPLATES[v] })}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(MOVE_TEMPLATES).map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="rounded border border-slate-800 overflow-hidden" style={{ height: 460 }}>
        <Suspense fallback={<div className="p-4 text-xs text-slate-500">Carregando editor…</div>}>
          <MonacoEditor
            value={value.code}
            onChange={(v) => onChange({ ...value, code: v ?? "" })}
            language="lua"
            theme="vs-dark"
            options={{
              fontSize: 13, minimap: { enabled: false }, tabSize: 2,
              scrollBeyondLastLine: false, automaticLayout: true,
            }}
          />
        </Suspense>
      </div>

      {validation && (
        <div className={validation.startsWith("✓") ? "text-xs text-emerald-400" : "text-xs text-red-400"}>
          {validation}
        </div>
      )}

      <div className="flex gap-2 border-t border-slate-800 pt-3">
        <Button onClick={onSave} disabled={saving || !value.name}
          style={{ background: "var(--dev-accent)", color: "#052e2b" }}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando…" : "Salvar"}
        </Button>
        <Button variant="outline" onClick={validateLua}>Validar sintaxe</Button>
        {onDelete && (
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Excluir
          </Button>
        )}
      </div>
    </div>
  );
}
