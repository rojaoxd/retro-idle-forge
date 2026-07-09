import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listObjects, upsertObject, deleteObject, setObjectComposition } from "@/lib/dev/objects.functions";
import { listSprites } from "@/lib/dev/sprites.functions";
import { SpriteThumb } from "@/components/dev/SpriteThumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Boxes, Plus, Trash2, Save, X } from "lucide-react";

export const Route = createFileRoute("/dev/objects")({ component: ObjectsPage });

const KINDS = ["item", "ground", "container", "weapon", "armor", "fluid", "splash", "deco", "creature", "wall", "effect"] as const;
const GROUPS = ["nature", "town", "dungeon", "walls", "creatures", "items", "effects", "misc"] as const;

const FLAG_DEFS: { key: string; label: string; group: string }[] = [
  { key: "isSolid", label: "isSolid (bloqueia)", group: "Collision" },
  { key: "isBlockProjectile", label: "isBlockProjectile", group: "Collision" },
  { key: "isBlockPath", label: "isBlockPath", group: "Collision" },
  { key: "isContainer", label: "isContainer", group: "Behavior" },
  { key: "isStackable", label: "isStackable", group: "Behavior" },
  { key: "isUseable", label: "isUseable", group: "Behavior" },
  { key: "isPickupable", label: "isPickupable", group: "Behavior" },
  { key: "isRotatable", label: "isRotatable", group: "Behavior" },
  { key: "isHangable", label: "isHangable", group: "Behavior" },
  { key: "isFullGround", label: "isFullGround", group: "Ground" },
  { key: "isTop", label: "isTop (teto)", group: "Ground" },
  { key: "isBottom", label: "isBottom (chão)", group: "Ground" },
  { key: "hasHeight", label: "hasHeight (eleva 8px)", group: "Height" },
  { key: "hasOffset", label: "hasOffset", group: "Height" },
  { key: "hasLight", label: "hasLight", group: "Light" },
  { key: "isLyingCorpse", label: "isLyingCorpse", group: "Misc" },
  { key: "isAnimateAlways", label: "isAnimateAlways", group: "Misc" },
];

type ObjectRow = {
  id?: string; client_id?: number | null; name: string;
  object_kind: (typeof KINDS)[number];
  width: number; height: number; layers: number;
  pattern_x: number; pattern_y: number; pattern_z: number;
  frames: number; frame_duration_ms: number;
  flags: Record<string, any>;
  palette_group?: string | null;
};

const emptyObj: ObjectRow = {
  name: "", object_kind: "item",
  width: 1, height: 1, layers: 1,
  pattern_x: 1, pattern_y: 1, pattern_z: 1,
  frames: 1, frame_duration_ms: 250,
  flags: {},
  palette_group: null,
};

function ObjectsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listObjects);
  const upFn = useServerFn(upsertObject);
  const delFn = useServerFn(deleteObject);
  const compFn = useServerFn(setObjectComposition);

  const [sel, setSel] = useState<ObjectRow>(emptyObj);
  const [q, setQ] = useState("");

  const objs = useQuery({ queryKey: ["objects"], queryFn: () => listFn() });
  const save = useMutation({
    mutationFn: (v: ObjectRow) => upFn({ data: v }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["objects"] }); setSel(r.row as any); },
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["objects"] }); setSel(emptyObj); },
  });
  const saveComp = useMutation({
    mutationFn: (v: { object_id: string; cells: any[] }) => compFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["objects"] }),
  });

  const filtered = (objs.data?.objects ?? []).filter((o: any) =>
    o.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Boxes className="h-6 w-6 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Object Builder</h1>
          <p className="text-xs text-slate-400">Monte objetos multi-célula, frames de animação e flags do .dat</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr_260px]">
        {/* LIST */}
        <div className="dev-panel p-3">
          <div className="mb-2 flex gap-2">
            <Input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button size="sm" onClick={() => setSel(emptyObj)}
              style={{ background: "var(--dev-accent)", color: "#052e2b" }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto space-y-1">
            {filtered.map((o: any) => (
              <button key={o.id} type="button" onClick={() => setSel(o)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-800"
                style={{
                  color: sel.id === o.id ? "var(--dev-accent)" : "var(--dev-text)",
                  background: sel.id === o.id ? "var(--dev-surface-2)" : "transparent",
                }}>
                <span className="flex-1 truncate">{o.name}</span>
                <span className="text-[9px] text-slate-500">{o.width}×{o.height}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="p-4 text-center text-xs text-slate-500">Nenhum objeto</div>}
          </div>
        </div>

        {/* COMPOSER */}
        <ObjectComposer
          key={sel.id ?? "new"}
          initial={sel}
          allCompositions={(objs.data?.compositions ?? [])}
          sprites={(objs.data?.sprites ?? [])}
          urlMap={objs.data?.urlMap ?? {}}
          onSave={(v) => save.mutate(v)}
          onSaveComposition={(cells) => sel.id && saveComp.mutate({ object_id: sel.id, cells })}
          onDelete={sel.id ? () => confirm("Excluir?") && del.mutate(sel.id!) : undefined}
          saving={save.isPending || saveComp.isPending}
        />

        {/* FLAGS */}
        <FlagsPanel value={sel} onChange={(v) => setSel(v)} />
      </div>
    </div>
  );
}

function ObjectComposer({
  initial, allCompositions, sprites, urlMap,
  onSave, onSaveComposition, onDelete, saving,
}: {
  initial: ObjectRow;
  allCompositions: any[]; sprites: any[]; urlMap: Record<string, string | null>;
  onSave: (v: ObjectRow) => void;
  onSaveComposition: (cells: any[]) => void;
  onDelete?: () => void; saving: boolean;
}) {
  const [v, setV] = useState<ObjectRow>(initial);
  const [frame, setFrame] = useState(0);
  useEffect(() => { setV(initial); setFrame(0); }, [initial]);

  const spriteFn = useServerFn(listSprites);
  const [search, setSearch] = useState("");
  const spritesQ = useQuery({
    queryKey: ["sprites-pool", search],
    queryFn: () => spriteFn({ data: { search: search || undefined, limit: 200, offset: 0 } }),
  });

  // cells state = per (frame, cell_x, cell_y) → sprite_id
  const initialCells = useMemo(() => {
    const m = new Map<string, number>();
    if (initial.id) {
      for (const c of allCompositions.filter((c) => c.object_id === initial.id)) {
        m.set(`${c.frame}:${c.cell_x}:${c.cell_y}`, c.sprite_id);
      }
    }
    return m;
  }, [initial.id, allCompositions]);
  const [cellMap, setCellMap] = useState<Map<string, number>>(initialCells);
  useEffect(() => setCellMap(initialCells), [initialCells]);

  const spriteById = useMemo(() => {
    const m = new Map<number, any>();
    for (const s of sprites) m.set(s.id, s);
    for (const s of (spritesQ.data?.rows ?? [])) m.set(s.id, s);
    return m;
  }, [sprites, spritesQ.data]);

  const allUrls = { ...urlMap, ...(spritesQ.data?.urlMap ?? {}) };

  function setCell(cx: number, cy: number, spriteId: number | null) {
    setCellMap((prev) => {
      const m = new Map(prev);
      const key = `${frame}:${cx}:${cy}`;
      if (spriteId == null) m.delete(key); else m.set(key, spriteId);
      return m;
    });
  }

  function saveAll() {
    onSave(v);
    if (initial.id) {
      const cells: any[] = [];
      for (const [k, sid] of cellMap.entries()) {
        const [fr, cx, cy] = k.split(":").map(Number);
        cells.push({ sprite_id: sid, frame: fr, cell_x: cx, cell_y: cy });
      }
      onSaveComposition(cells);
    }
  }

  return (
    <div className="dev-panel space-y-4 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-[10px] uppercase text-slate-400">Nome</label>
          <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="ex.: Oak Tree 2x2" />
        </div>
        <div>
          <label className="block text-[10px] uppercase text-slate-400">Kind</label>
          <Select value={v.object_kind} onValueChange={(x) => setV({ ...v, object_kind: x as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div><label className="block text-[10px] text-slate-400">W</label>
            <Input type="number" min={1} max={4} value={v.width} onChange={(e) => setV({ ...v, width: Number(e.target.value) })} /></div>
          <div><label className="block text-[10px] text-slate-400">H</label>
            <Input type="number" min={1} max={4} value={v.height} onChange={(e) => setV({ ...v, height: Number(e.target.value) })} /></div>
          <div><label className="block text-[10px] text-slate-400">Frames</label>
            <Input type="number" min={1} value={v.frames} onChange={(e) => setV({ ...v, frames: Number(e.target.value) })} /></div>
          <div><label className="block text-[10px] text-slate-400">ms/frame</label>
            <Input type="number" value={v.frame_duration_ms} onChange={(e) => setV({ ...v, frame_duration_ms: Number(e.target.value) })} /></div>
        </div>
        <div>
          <label className="block text-[10px] uppercase text-slate-400">Palette group</label>
          <Select value={v.palette_group ?? "none"} onValueChange={(x) => setV({ ...v, palette_group: x === "none" ? null : x })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— nenhum —</SelectItem>
              {GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* GRID */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-emerald-400">Composição (frame {frame + 1} / {v.frames})</div>
          <div className="flex gap-1">
            {Array.from({ length: v.frames }).map((_, i) => (
              <button key={i} onClick={() => setFrame(i)} className="h-6 w-6 rounded text-xs"
                style={{ background: i === frame ? "var(--dev-accent)" : "var(--dev-surface-2)", color: i === frame ? "#052e2b" : "var(--dev-text)" }}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
        <div className="dev-inset p-2 inline-block"
          style={{ display: "grid", gridTemplateColumns: `repeat(${v.width}, 64px)`, gap: 4 }}>
          {Array.from({ length: v.height }).map((_, cy) =>
            Array.from({ length: v.width }).map((_, cx) => {
              const key = `${frame}:${cx}:${cy}`;
              const sid = cellMap.get(key);
              const sp = sid ? spriteById.get(sid) : null;
              return (
                <div key={key}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = Number(e.dataTransfer.getData("text/plain"));
                    if (id) setCell(cx, cy, id);
                  }}
                  className="relative grid place-items-center rounded border"
                  style={{ width: 64, height: 64, borderColor: sp ? "var(--dev-accent)" : "rgb(51,65,85)", background: "#0a0a0a" }}>
                  {sp && allUrls[sp.sheet_url] ? (
                    <>
                      <SpriteThumb sheetUrl={allUrls[sp.sheet_url] ?? null}
                        x={sp.x} y={sp.y} width={sp.width} height={sp.height} scale={2} />
                      <button onClick={() => setCell(cx, cy, null)}
                        className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <span className="text-[9px] text-slate-600">drop</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SPRITE POOL */}
      <div>
        <div className="mb-1 text-xs uppercase tracking-wider text-emerald-400">Sprite Pool (arraste para o grid)</div>
        <Input placeholder="Buscar sprite…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-2" />
        <div className="dev-inset max-h-[220px] overflow-y-auto p-2">
          <div className="grid grid-cols-8 gap-1">
            {(spritesQ.data?.rows ?? []).map((r: any) => (
              <div key={r.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", String(r.id))}
                title={`#${r.id}`}
                className="cursor-grab rounded border border-slate-700 p-1">
                <SpriteThumb sheetUrl={spritesQ.data!.urlMap[r.sheet_url] ?? null}
                  x={r.x} y={r.y} width={r.width} height={r.height} scale={1} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-t border-slate-800 pt-3">
        <Button onClick={saveAll} disabled={saving || !v.name}
          style={{ background: "var(--dev-accent)", color: "#052e2b" }}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando…" : "Salvar objeto + composição"}
        </Button>
        {onDelete && (
          <Button variant="destructive" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" /> Excluir</Button>
        )}
      </div>
    </div>
  );
}

function FlagsPanel({ value, onChange }: { value: ObjectRow; onChange: (v: ObjectRow) => void }) {
  const grouped = FLAG_DEFS.reduce<Record<string, typeof FLAG_DEFS>>((acc, f) => {
    (acc[f.group] ||= []).push(f); return acc;
  }, {});
  return (
    <div className="dev-panel p-4">
      <div className="mb-2 text-xs uppercase tracking-wider text-emerald-400">.dat Flags</div>
      <div className="space-y-3">
        {Object.entries(grouped).map(([grp, flags]) => (
          <div key={grp}>
            <div className="mb-1 text-[10px] uppercase text-slate-500">{grp}</div>
            <div className="space-y-1">
              {flags.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={Boolean(value.flags?.[f.key])}
                    onCheckedChange={(c) =>
                      onChange({ ...value, flags: { ...value.flags, [f.key]: Boolean(c) } })
                    }
                  />
                  <span className="font-mono">{f.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {Boolean(value.flags?.hasLight) && (
          <div className="dev-inset space-y-2 p-2">
            <div className="text-[10px] uppercase text-slate-500">Light</div>
            <Input type="number" placeholder="Level" value={value.flags?.lightLevel ?? ""}
              onChange={(e) => onChange({ ...value, flags: { ...value.flags, lightLevel: Number(e.target.value) } })} />
            <Input type="number" placeholder="Color" value={value.flags?.lightColor ?? ""}
              onChange={(e) => onChange({ ...value, flags: { ...value.flags, lightColor: Number(e.target.value) } })} />
          </div>
        )}
      </div>
    </div>
  );
}
