import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listNpcs, upsertNpc, deleteNpc,
  listTrades, upsertTrade, deleteTrade,
  listKeywords, upsertKeyword, deleteKeyword,
} from "@/lib/dev/npcs.functions";
import { listObjects } from "@/lib/dev/objects.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessagesSquare, Plus, Trash2, Save, Coins } from "lucide-react";

export const Route = createFileRoute("/dev/npcs")({ component: NpcsPage });

type Npc = {
  id?: string; name: string;
  sprite_object_id: string | null;
  outfit: Record<string, any>;
  walk_radius: number;
  speech_greet: string[];
  speech_farewell: string[];
  idle_messages: string[];
  spawn_x?: number | null; spawn_y?: number | null; spawn_z?: number;
};
const emptyNpc: Npc = {
  name: "", sprite_object_id: null, outfit: {}, walk_radius: 3,
  speech_greet: ["Hello, |PLAYERNAME|!"], speech_farewell: ["Goodbye!"],
  idle_messages: [], spawn_z: 7,
};

function NpcsPage() {
  const qc = useQueryClient();
  const [sel, setSel] = useState<Npc>(emptyNpc);
  const [q, setQ] = useState("");
  const listFn = useServerFn(listNpcs);
  const upFn = useServerFn(upsertNpc);
  const delFn = useServerFn(deleteNpc);
  const list = useQuery({ queryKey: ["npcs"], queryFn: () => listFn() });
  const save = useMutation({
    mutationFn: (v: Npc) => upFn({ data: v }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["npcs"] }); setSel(r.row as any); },
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["npcs"] }); setSel(emptyNpc); },
  });

  const filtered = (list.data?.rows ?? []).filter((n: any) => n.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessagesSquare className="h-6 w-6 text-emerald-400" />
        <h1 className="text-2xl font-bold text-slate-100">NPCs &amp; Quests</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="dev-panel p-3">
          <div className="mb-2 flex gap-2">
            <Input placeholder="Buscar NPC…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button size="sm" onClick={() => setSel(emptyNpc)}
              style={{ background: "var(--dev-accent)", color: "#052e2b" }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto space-y-1">
            {filtered.map((n: any) => (
              <button key={n.id} type="button" onClick={() => setSel(n)}
                className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm hover:bg-slate-800"
                style={{
                  color: sel.id === n.id ? "var(--dev-accent)" : "var(--dev-text)",
                  background: sel.id === n.id ? "var(--dev-surface-2)" : "transparent",
                }}>
                {n.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500">Nenhum NPC.</div>
            )}
          </div>
        </div>

        <NpcForm key={sel.id ?? "new"} initial={sel}
          onSave={(v) => save.mutate(v)} saving={save.isPending}
          onDelete={sel.id ? () => confirm("Excluir?") && del.mutate(sel.id!) : undefined} />
      </div>
    </div>
  );
}

function NpcForm({ initial, onSave, saving, onDelete }: {
  initial: Npc; onSave: (v: Npc) => void; saving: boolean; onDelete?: () => void;
}) {
  const [v, setV] = useState<Npc>(initial);
  useEffect(() => setV(initial), [initial]);
  const objFn = useServerFn(listObjects);
  const objects = useQuery({ queryKey: ["objects-brief"], queryFn: () => objFn() });

  function set<K extends keyof Npc>(k: K, val: Npc[K]) { setV((p) => ({ ...p, [k]: val })); }

  return (
    <div className="dev-panel space-y-6 p-6">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-[10px] uppercase text-slate-400">Nome</label>
          <Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="ex.: Bank Teller" />
        </div>
        <div>
          <label className="block text-[10px] uppercase text-slate-400">Sprite / Object</label>
          <Select value={v.sprite_object_id ?? "none"}
            onValueChange={(x) => set("sprite_object_id", x === "none" ? null : x)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— nenhum —</SelectItem>
              {(objects.data?.objects ?? [])
                .filter((o: any) => o.object_kind === "creature" || o.object_kind === "deco" || o.object_kind === "item")
                .map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-[10px] uppercase text-slate-400">Walk radius</label>
          <Input type="number" value={v.walk_radius} onChange={(e) => set("walk_radius", Number(e.target.value))} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] uppercase text-slate-400">Spawn X</label>
            <Input type="number" value={v.spawn_x ?? ""} onChange={(e) => set("spawn_x", e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-slate-400">Y</label>
            <Input type="number" value={v.spawn_y ?? ""} onChange={(e) => set("spawn_y", e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-slate-400">Z</label>
            <Input type="number" value={v.spawn_z ?? 7} onChange={(e) => set("spawn_z", Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SpeechList label="Saudações (hi/hello)" value={v.speech_greet} onChange={(x) => set("speech_greet", x)} />
        <SpeechList label="Despedidas (bye)" value={v.speech_farewell} onChange={(x) => set("speech_farewell", x)} />
        <SpeechList label="Frases idle" value={v.idle_messages} onChange={(x) => set("idle_messages", x)} />
      </div>

      {v.id && (
        <>
          <KeywordsSection npcId={v.id} />
          <TradesSection npcId={v.id} objects={objects.data?.objects ?? []} />
        </>
      )}
      {!v.id && (
        <div className="dev-inset p-3 text-xs text-slate-400">
          Salve o NPC primeiro para configurar keywords e loja.
        </div>
      )}

      <div className="flex gap-2 border-t border-slate-800 pt-4">
        <Button onClick={() => onSave(v)} disabled={saving || !v.name}
          style={{ background: "var(--dev-accent)", color: "#052e2b" }}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando…" : "Salvar NPC"}
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

function SpeechList({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <label className="block text-[10px] uppercase text-slate-400">{label}</label>
      <Textarea rows={5} value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n").filter(Boolean))}
        placeholder="Uma frase por linha" />
    </div>
  );
}

function KeywordsSection({ npcId }: { npcId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listKeywords);
  const upFn = useServerFn(upsertKeyword);
  const delFn = useServerFn(deleteKeyword);
  const q = useQuery({ queryKey: ["npc_keywords", npcId], queryFn: () => listFn({ data: { npc_id: npcId } }) });
  const [kws, setKws] = useState(""); const [ans, setAns] = useState("");
  const add = useMutation({
    mutationFn: () => upFn({ data: { npc_id: npcId, keywords: kws.split(",").map(s => s.trim()).filter(Boolean), answer: ans } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["npc_keywords", npcId] }); setKws(""); setAns(""); },
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["npc_keywords", npcId] }),
  });
  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-wider text-emerald-400">Palavras-chave</div>
      <div className="dev-inset p-3 space-y-2">
        {(q.data?.rows ?? []).map((k: any) => (
          <div key={k.id} className="flex items-start gap-2 text-xs">
            <div className="min-w-[180px] font-mono text-emerald-400">{k.keywords.join(", ")}</div>
            <div className="flex-1 text-slate-300">{k.answer}</div>
            <button onClick={() => del.mutate(k.id)} className="text-red-400"><Trash2 className="h-3 w-3" /></button>
          </div>
        ))}
        <div className="grid grid-cols-[180px_1fr_auto] gap-2 pt-2 border-t border-slate-800">
          <Input placeholder="hi, hello" value={kws} onChange={(e) => setKws(e.target.value)} />
          <Input placeholder="Resposta" value={ans} onChange={(e) => setAns(e.target.value)} />
          <Button size="sm" onClick={() => add.mutate()} disabled={!kws || !ans}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TradesSection({ npcId, objects }: { npcId: string; objects: any[] }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listTrades);
  const upFn = useServerFn(upsertTrade);
  const delFn = useServerFn(deleteTrade);
  const q = useQuery({ queryKey: ["npc_trades", npcId], queryFn: () => listFn({ data: { npc_id: npcId } }) });
  const [oid, setOid] = useState(""); const [buy, setBuy] = useState(""); const [sell, setSell] = useState("");
  const add = useMutation({
    mutationFn: () => upFn({ data: {
      npc_id: npcId, object_id: oid, currency: "gold",
      buy_price: buy ? Number(buy) : null,
      sell_price: sell ? Number(sell) : null,
    } as any }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["npc_trades", npcId] }); setOid(""); setBuy(""); setSell(""); },
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["npc_trades", npcId] }),
  });
  const objMap = new Map(objects.map((o: any) => [o.id, o.name]));
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-400">
        <Coins className="h-3 w-3" /> Trade Window
      </div>
      <div className="dev-inset p-3 space-y-2">
        <div className="grid grid-cols-[1fr_100px_100px_auto] items-center gap-2 text-[10px] uppercase text-slate-500">
          <div>Item</div><div>Compra por</div><div>Vende por</div><div />
        </div>
        {(q.data?.rows ?? []).map((t: any) => (
          <div key={t.id} className="grid grid-cols-[1fr_100px_100px_auto] items-center gap-2 text-xs">
            <div className="truncate">{objMap.get(t.object_id) ?? t.object_id}</div>
            <div className="text-emerald-400">{t.buy_price ?? "—"}</div>
            <div className="text-amber-400">{t.sell_price ?? "—"}</div>
            <button onClick={() => del.mutate(t.id)} className="text-red-400"><Trash2 className="h-3 w-3" /></button>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_100px_100px_auto] gap-2 pt-2 border-t border-slate-800">
          <Select value={oid} onValueChange={setOid}>
            <SelectTrigger><SelectValue placeholder="Object…" /></SelectTrigger>
            <SelectContent>
              {objects.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Buy" value={buy} onChange={(e) => setBuy(e.target.value)} />
          <Input type="number" placeholder="Sell" value={sell} onChange={(e) => setSell(e.target.value)} />
          <Button size="sm" onClick={() => add.mutate()} disabled={!oid}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
