import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listObjects, upsertObject, deleteObject, setObjectComposition,
  nextClientId, importSpriteSheet, importObjectFull,
} from "@/lib/dev/objects.functions";
import { listSprites } from "@/lib/dev/sprites.functions";
import { SpriteThumb } from "@/components/dev/SpriteThumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Boxes, Plus, Trash2, Save, X, Upload, ChevronLeft, ChevronRight, Play, Pause, FileUp } from "lucide-react";
import { loadImage, sliceSheet, tilesToComposition, type Tile } from "@/lib/dev/obd/sheetImport";
import { parseObd, spriteToTile, type ObdParseResult } from "@/lib/dev/obd/parser";

export const Route = createFileRoute("/dev/objects")({ component: ObjectsPage });

/* ============== Categories (matches Object Builder tabs) ============== */

type Category = "items" | "outfits" | "effects" | "missiles";
const CATEGORIES: { id: Category; label: string; kinds: string[]; defaultKind: string }[] = [
  { id: "items",    label: "Items",    kinds: ["item","ground","container","weapon","armor","fluid","splash","deco","wall"], defaultKind: "item" },
  { id: "outfits",  label: "Outfits",  kinds: ["creature"], defaultKind: "creature" },
  { id: "effects",  label: "Effects",  kinds: ["effect"],   defaultKind: "effect" },
  { id: "missiles", label: "Missiles", kinds: ["effect"],   defaultKind: "effect" },
];

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
  { key: "isMissile", label: "isMissile (projétil)", group: "Misc" },
];

type ObjectRow = {
  id?: string; client_id?: number | null; name: string;
  object_kind: string;
  width: number; height: number; layers: number;
  pattern_x: number; pattern_y: number; pattern_z: number;
  frames: number; frame_duration_ms: number;
  flags: Record<string, any>;
  palette_group?: string | null;
};

const emptyObj = (kind: string, isOutfit = false, isMissile = false): ObjectRow => ({
  name: "", object_kind: kind,
  width: 1, height: 1, layers: 1,
  pattern_x: isOutfit ? 4 : 1, pattern_y: 1, pattern_z: 1,
  frames: 1, frame_duration_ms: 250,
  flags: isMissile ? { isMissile: true } : {},
  palette_group: null,
});

/* ============================ Page ============================ */

function ObjectsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listObjects);
  const upFn = useServerFn(upsertObject);
  const delFn = useServerFn(deleteObject);
  const compFn = useServerFn(setObjectComposition);
  const nextIdFn = useServerFn(nextClientId);

  const [tab, setTab] = useState<Category>("items");
  const [sel, setSel] = useState<ObjectRow>(emptyObj("item"));
  const [q, setQ] = useState("");
  const [importOpen, setImportOpen] = useState<"png" | "obd" | null>(null);

  const objs = useQuery({ queryKey: ["objects"], queryFn: () => listFn() });

  const filtered = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.id === tab)!;
    const all = objs.data?.objects ?? [];
    return all
      .filter((o: any) => cat.kinds.includes(o.object_kind))
      .filter((o: any) => {
        if (tab === "missiles") return Boolean(o.flags?.isMissile);
        if (tab === "effects" && cat.kinds.includes("effect")) return !o.flags?.isMissile;
        return true;
      })
      .filter((o: any) => o.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a: any, b: any) => (a.client_id ?? 0) - (b.client_id ?? 0));
  }, [objs.data, tab, q]);

  async function newObject() {
    const cat = CATEGORIES.find((c) => c.id === tab)!;
    const isOutfit = tab === "outfits";
    const isMissile = tab === "missiles";
    const kind = cat.defaultKind;
    let cid: number | null = null;
    try {
      const r = await nextIdFn({ data: { object_kind: kind as any } });
      cid = r.next;
    } catch { /* ignore */ }
    setSel({ ...emptyObj(kind, isOutfit, isMissile), client_id: cid });
  }

  const save = useMutation({
    mutationFn: (v: ObjectRow) => upFn({ data: v }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["objects"] }); setSel(r.row as any); },
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["objects"] }); setSel(emptyObj("item")); },
  });
  const saveComp = useMutation({
    mutationFn: (v: { object_id: string; cells: any[] }) => compFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["objects"] }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Boxes className="h-6 w-6 text-emerald-400" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-100">Object Builder</h1>
          <p className="text-xs text-slate-400">Réplica do OB oficial · Items, Outfits, Effects, Missiles</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setImportOpen("png")}>
          <Upload className="mr-1 h-4 w-4" /> Import PNG (magenta)
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setImportOpen("obd")}>
          <FileUp className="mr-1 h-4 w-4" /> Import .obd
        </Button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 border-b border-slate-800">
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => { setTab(c.id); setSel(emptyObj(c.defaultKind, c.id==="outfits", c.id==="missiles")); }}
            className="px-4 py-2 text-sm border-b-2 transition-colors"
            style={{
              color: tab === c.id ? "var(--dev-accent)" : "var(--dev-text)",
              borderColor: tab === c.id ? "var(--dev-accent)" : "transparent",
              background: tab === c.id ? "var(--dev-surface-2)" : "transparent",
            }}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[240px_1fr_260px]">
        {/* LIST */}
        <div className="dev-panel p-3">
          <div className="mb-2 flex gap-2">
            <Input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button size="sm" onClick={newObject}
              style={{ background: "var(--dev-accent)", color: "#052e2b" }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-[74vh] overflow-y-auto space-y-1">
            {filtered.map((o: any) => (
              <button key={o.id} type="button" onClick={() => setSel(o)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-800"
                style={{
                  color: sel.id === o.id ? "var(--dev-accent)" : "var(--dev-text)",
                  background: sel.id === o.id ? "var(--dev-surface-2)" : "transparent",
                }}>
                <span className="w-10 text-[10px] text-slate-500 font-mono">
                  {o.client_id ?? "—"}
                </span>
                <span className="flex-1 truncate">{o.name || <em className="text-slate-600">sem nome</em>}</span>
                <span className="text-[9px] text-slate-500">{o.width}×{o.height}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="p-4 text-center text-xs text-slate-500">Nenhum objeto nesta categoria</div>}
          </div>
        </div>

        {/* COMPOSER */}
        <ObjectComposer
          key={sel.id ?? `new-${tab}`}
          initial={sel} tab={tab}
          allCompositions={(objs.data?.compositions ?? [])}
          sprites={(objs.data?.sprites ?? [])}
          urlMap={objs.data?.urlMap ?? {}}
          onSave={(v) => save.mutate(v)}
          onSaveComposition={(cells) => sel.id && saveComp.mutate({ object_id: sel.id, cells })}
          onDelete={sel.id ? () => confirm("Excluir este objeto?") && del.mutate(sel.id!) : undefined}
          saving={save.isPending || saveComp.isPending}
        />

        {/* FLAGS */}
        <FlagsPanel value={sel} onChange={(v) => setSel(v)} />
      </div>

      {importOpen === "png" && (
        <ImportPngDialog onClose={() => setImportOpen(null)} category={tab}
          onImported={() => qc.invalidateQueries({ queryKey: ["objects"] })} />
      )}
      {importOpen === "obd" && (
        <ImportObdDialog onClose={() => setImportOpen(null)} category={tab}
          onImported={() => qc.invalidateQueries({ queryKey: ["objects"] })} />
      )}
    </div>
  );
}

/* ========================== Composer ========================== */

function ObjectComposer({
  initial, tab, allCompositions, sprites, urlMap,
  onSave, onSaveComposition, onDelete, saving,
}: {
  initial: ObjectRow; tab: Category;
  allCompositions: any[]; sprites: any[]; urlMap: Record<string, string | null>;
  onSave: (v: ObjectRow) => void;
  onSaveComposition: (cells: any[]) => void;
  onDelete?: () => void; saving: boolean;
}) {
  const [v, setV] = useState<ObjectRow>(initial);
  const [frame, setFrame] = useState(0);
  const [dir, setDir] = useState(0); // pattern_x index (N/E/S/W for outfits)
  const [playing, setPlaying] = useState(false);
  const [propTab, setPropTab] = useState<"texture" | "properties">("texture");

  useEffect(() => { setV(initial); setFrame(0); setDir(0); }, [initial]);

  // Auto-play frames
  useEffect(() => {
    if (!playing || v.frames <= 1) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % v.frames), v.frame_duration_ms);
    return () => clearInterval(t);
  }, [playing, v.frames, v.frame_duration_ms]);

  const spriteFn = useServerFn(listSprites);
  const [search, setSearch] = useState("");
  const spritesQ = useQuery({
    queryKey: ["sprites-pool", search],
    queryFn: () => spriteFn({ data: { search: search || undefined, limit: 200, offset: 0 } }),
  });

  const initialCells = useMemo(() => {
    const m = new Map<string, number>();
    if (initial.id) {
      for (const c of allCompositions.filter((c) => c.object_id === initial.id)) {
        m.set(`${c.frame}:${c.pattern_x}:${c.cell_x}:${c.cell_y}`, c.sprite_id);
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
      const key = `${frame}:${dir}:${cx}:${cy}`;
      if (spriteId == null) m.delete(key); else m.set(key, spriteId);
      return m;
    });
  }

  function saveAll() {
    onSave(v);
    if (initial.id) {
      const cells: any[] = [];
      for (const [k, sid] of cellMap.entries()) {
        const [fr, px, cx, cy] = k.split(":").map(Number);
        cells.push({ sprite_id: sid, frame: fr, pattern_x: px, cell_x: cx, cell_y: cy });
      }
      onSaveComposition(cells);
    }
  }

  const dirLabel = tab === "outfits" ? ["N","E","S","W"][dir] ?? String(dir) : String(dir);

  return (
    <div className="dev-panel space-y-3 p-4">
      {/* header */}
      <div className="grid gap-3 md:grid-cols-[80px_1fr_140px]">
        <div>
          <label className="block text-[10px] uppercase text-slate-400">ID</label>
          <Input value={v.client_id ?? ""} onChange={(e) => setV({ ...v, client_id: e.target.value ? Number(e.target.value) : null })} />
        </div>
        <div>
          <label className="block text-[10px] uppercase text-slate-400">Nome</label>
          <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="ex.: Oak Tree 2x2" />
        </div>
        <div>
          <label className="block text-[10px] uppercase text-slate-400">Kind</label>
          <Select value={v.object_kind} onValueChange={(x) => setV({ ...v, object_kind: x })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.find((c) => c.id === tab)!.kinds.map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* aba textura/propriedades */}
      <div className="flex gap-1 border-b border-slate-800">
        {(["texture","properties"] as const).map((t) => (
          <button key={t} onClick={() => setPropTab(t)}
            className="px-3 py-1 text-xs uppercase tracking-wider"
            style={{
              color: propTab === t ? "var(--dev-accent)" : "var(--dev-text)",
              borderBottom: propTab === t ? "2px solid var(--dev-accent)" : "2px solid transparent",
            }}>
            {t === "texture" ? "Textura" : "Propriedades"}
          </button>
        ))}
      </div>

      {propTab === "texture" ? (
        <>
          {/* dimensions */}
          <div className="grid grid-cols-7 gap-2">
            <NumField label="W" v={v.width} onChange={(x)=>setV({...v,width:x})} min={1} max={4} />
            <NumField label="H" v={v.height} onChange={(x)=>setV({...v,height:x})} min={1} max={4} />
            <NumField label="Layers" v={v.layers} onChange={(x)=>setV({...v,layers:x})} min={1} max={4} />
            <NumField label="Pat.X" v={v.pattern_x} onChange={(x)=>setV({...v,pattern_x:x})} min={1} max={8} />
            <NumField label="Pat.Y" v={v.pattern_y} onChange={(x)=>setV({...v,pattern_y:x})} min={1} max={4} />
            <NumField label="Frames" v={v.frames} onChange={(x)=>setV({...v,frames:x})} min={1} max={16} />
            <NumField label="ms/f" v={v.frame_duration_ms} onChange={(x)=>setV({...v,frame_duration_ms:x})} min={50} max={2000} />
          </div>

          {/* preview */}
          <div className="dev-inset flex items-center justify-between p-2">
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={() => setDir((d) => (d - 1 + v.pattern_x) % v.pattern_x)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-[10px] w-8 text-center text-slate-400">Dir: {dirLabel}</span>
              <Button size="icon" variant="ghost" onClick={() => setDir((d) => (d + 1) % v.pattern_x)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-[10px] text-slate-400">frame {frame + 1}/{v.frames}</div>
            <Button size="icon" variant="ghost" onClick={() => setPlaying((p) => !p)}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>

          {/* GRID (composição desta direção+frame) */}
          <div>
            <div className="mb-1 text-xs uppercase tracking-wider text-emerald-400">
              Composição · dir {dirLabel} · frame {frame + 1}
            </div>
            <div className="dev-inset p-2 inline-block"
              style={{ display: "grid", gridTemplateColumns: `repeat(${v.width}, 64px)`, gap: 4 }}>
              {Array.from({ length: v.height }).map((_, cy) =>
                Array.from({ length: v.width }).map((_, cx) => {
                  const key = `${frame}:${dir}:${cx}:${cy}`;
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
            <div className="mb-1 text-xs uppercase tracking-wider text-emerald-400">Sprite Pool (arraste)</div>
            <Input placeholder="Buscar sprite (tag)…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-2" />
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
        </>
      ) : (
        <PropertiesTab value={v} onChange={setV} />
      )}

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

function NumField({ label, v, onChange, min, max }: { label: string; v: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <label className="block text-[10px] uppercase text-slate-400">{label}</label>
      <Input type="number" min={min} max={max} value={v} onChange={(e) => onChange(Number(e.target.value) || 1)} />
    </div>
  );
}

/* ========================= Flags / Properties ========================= */

function FlagsPanel({ value, onChange }: { value: ObjectRow; onChange: (v: ObjectRow) => void }) {
  const grouped = FLAG_DEFS.reduce<Record<string, typeof FLAG_DEFS>>((acc, f) => {
    (acc[f.group] ||= []).push(f); return acc;
  }, {});
  return (
    <div className="dev-panel p-4">
      <div className="mb-2 text-xs uppercase tracking-wider text-emerald-400">.dat Flags</div>
      <div className="max-h-[74vh] overflow-y-auto space-y-3 pr-1">
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

function PropertiesTab({ value, onChange }: { value: ObjectRow; onChange: (v: ObjectRow) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] uppercase text-slate-400">Palette group</label>
        <Select value={value.palette_group ?? "none"} onValueChange={(x) => onChange({ ...value, palette_group: x === "none" ? null : x })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— nenhum —</SelectItem>
            {["nature","town","dungeon","walls","creatures","items","effects","misc"].map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="dev-inset p-3 text-xs text-slate-400">
        As flags do <code>.dat</code> ficam no painel da direita. Ajuste ID, Kind, dimensões, patterns e frames na aba Textura.
      </div>
    </div>
  );
}

/* ============================ Import PNG ============================ */

function ImportPngDialog({
  onClose, category, onImported,
}: { onClose: () => void; category: Category; onImported: () => void }) {
  const importFn = useServerFn(importSpriteSheet);
  const createFullFn = useServerFn(importObjectFull);
  const nextIdFn = useServerFn(nextClientId);

  const [file, setFile] = useState<File | null>(null);
  const [tileSize, setTileSize] = useState(32);
  const [preview, setPreview] = useState<{ tiles: Tile[]; cols: number; rows: number } | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const isOutfit = category === "outfits";
  const isMissile = category === "missiles";
  const defaultKind = CATEGORIES.find((c) => c.id === category)!.defaultKind;

  // shape defaults: outfit → 4 directions × 3 frames; effect → 1×N frames
  const [shape, setShape] = useState({
    width: 1, height: 1, layers: 1,
    pattern_x: isOutfit ? 4 : 1, pattern_y: 1, pattern_z: 1, frames: 1,
  });

  async function pickFile(f: File) {
    setFile(f);
    const img = await loadImage(f);
    const sliced = await sliceSheet(img, tileSize);
    setPreview(sliced);
    // guess shape for outfit sheets: cols = pattern_x * width, rows = frames * height
    if (isOutfit) {
      setShape((s) => ({ ...s, pattern_x: Math.min(4, sliced.cols), frames: sliced.rows }));
    } else {
      setShape((s) => ({ ...s, frames: sliced.rows * sliced.cols }));
    }
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  }

  async function reslice() {
    if (!file) return;
    const img = await loadImage(file);
    setPreview(await sliceSheet(img, tileSize));
  }

  async function doImport() {
    if (!preview || !file) return;
    setBusy(true);
    try {
      const { spriteIds } = await importFn({
        data: { tiles: preview.tiles, tagPrefix: name.toLowerCase().replace(/\s+/g, "_") },
      });
      // Compose object with shape
      const totalTiles = preview.tiles.length;
      const perObject = shape.width * shape.height * shape.layers * shape.pattern_x * shape.pattern_y * shape.pattern_z * shape.frames;
      if (perObject === 0) throw new Error("Shape inválida");

      // For simplicity import as a single object; if leftover, warn.
      const useTiles = preview.tiles.slice(0, perObject);
      const useIds = spriteIds.slice(0, perObject);
      const cells = tilesToComposition(useTiles, shape).map((c) => ({
        sprite_id: useIds[c.sprite_id_index],
        cell_x: c.cell_x, cell_y: c.cell_y, layer: c.layer,
        pattern_x: c.pattern_x, pattern_y: c.pattern_y, pattern_z: c.pattern_z,
        frame: c.frame,
      }));

      let cid: number | null = null;
      try { cid = (await nextIdFn({ data: { object_kind: defaultKind as any } })).next; } catch {}

      await createFullFn({
        data: {
          object: {
            name,
            object_kind: defaultKind as any,
            client_id: cid,
            width: shape.width, height: shape.height, layers: shape.layers,
            pattern_x: shape.pattern_x, pattern_y: shape.pattern_y, pattern_z: shape.pattern_z,
            frames: shape.frames, frame_duration_ms: 250,
            flags: isMissile ? { isMissile: true } : {},
            palette_group: null,
          },
          cells,
        },
      });
      onImported();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar sheet PNG (Object Builder export)</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input type="file" accept="image/png,image/jpeg" onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />
            <div>
              <label className="block text-[10px] uppercase text-slate-400">Tile size</label>
              <Input type="number" className="w-24" value={tileSize} onChange={(e) => setTileSize(Number(e.target.value) || 32)} onBlur={reslice} />
            </div>
          </div>

          {preview && (
            <>
              <div className="text-xs text-slate-400">
                Detectado: <b>{preview.cols}×{preview.rows}</b> tiles ({preview.tiles.length} total, {new Set(preview.tiles.map((t) => t.hash)).size} únicos)
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400">Nome do objeto</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="grid grid-cols-7 gap-2">
                <NumField label="W" v={shape.width} onChange={(x)=>setShape({...shape,width:x})} min={1} max={4} />
                <NumField label="H" v={shape.height} onChange={(x)=>setShape({...shape,height:x})} min={1} max={4} />
                <NumField label="Layers" v={shape.layers} onChange={(x)=>setShape({...shape,layers:x})} min={1} max={4} />
                <NumField label="Pat.X" v={shape.pattern_x} onChange={(x)=>setShape({...shape,pattern_x:x})} min={1} max={8} />
                <NumField label="Pat.Y" v={shape.pattern_y} onChange={(x)=>setShape({...shape,pattern_y:x})} min={1} max={4} />
                <NumField label="Pat.Z" v={shape.pattern_z} onChange={(x)=>setShape({...shape,pattern_z:x})} min={1} max={4} />
                <NumField label="Frames" v={shape.frames} onChange={(x)=>setShape({...shape,frames:x})} min={1} max={16} />
              </div>

              <TilePreview tiles={preview.tiles} cols={preview.cols} />
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={doImport} disabled={!preview || !name || busy}
            style={{ background: "var(--dev-accent)", color: "#052e2b" }}>
            {busy ? "Importando…" : "Importar e criar objeto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TilePreview({ tiles, cols }: { tiles: Tile[]; cols: number }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="dev-inset max-h-[240px] overflow-auto p-2"
      style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 34px)`, gap: 2 }}>
      {tiles.map((t) => (
        <img key={t.index} src={`data:image/png;base64,${t.base64Png}`}
          width={32} height={32} style={{ imageRendering: "pixelated", background: "#0a0a0a" }} />
      ))}
    </div>
  );
}

/* ============================ Import OBD ============================ */

function ImportObdDialog({ onClose, category, onImported }: { onClose: () => void; category: Category; onImported: () => void }) {
  const importFn = useServerFn(importSpriteSheet);
  const createFullFn = useServerFn(importObjectFull);
  const nextIdFn = useServerFn(nextClientId);
  const defaultKind = CATEGORIES.find((c) => c.id === category)!.defaultKind;
  const isMissile = category === "missiles";

  const [result, setResult] = useState<Extract<ObdParseResult, { ok: true }> | null>(null);
  const [tiles, setTiles] = useState<{ hash: string; base64Png: string; width: number; height: number; index: number }[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");

  async function pick(f: File) {
    setError(null); setResult(null); setTiles([]);
    setFileName(f.name);
    setName(f.name.replace(/\.obd$/i, ""));
    setBusy(true);
    try {
      const buf = await f.arrayBuffer();
      const r = await parseObd(buf);
      if (!r.ok) { setError(r.reason); return; }
      setResult(r);
      // Convert ARGB sprites to PNG tiles for upload
      const ts = await Promise.all(r.sprites.map((s, i) => spriteToTile(s, i)));
      setTiles(ts);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function doImport() {
    if (!result || !tiles.length) return;
    setBusy(true);
    setError(null);
    try {
      const { spriteIds } = await importFn({
        data: { tiles, tagPrefix: name.toLowerCase().replace(/\s+/g, "_") },
      });
      const g = result.geometry;
      const cells = tilesToComposition(tiles, {
        width: g.width, height: g.height, layers: g.layers,
        pattern_x: g.patternX, pattern_y: g.patternY, pattern_z: g.patternZ,
        frames: g.frames,
      }).map((c) => ({
        sprite_id: spriteIds[c.sprite_id_index],
        cell_x: c.cell_x, cell_y: c.cell_y, layer: c.layer,
        pattern_x: c.pattern_x, pattern_y: c.pattern_y, pattern_z: c.pattern_z,
        frame: c.frame,
      }));
      let cid: number | null = null;
      try { cid = (await nextIdFn({ data: { object_kind: defaultKind as any } })).next; } catch {}

      const avgDuration = g.durations.length
        ? Math.round(g.durations.reduce((s, d) => s + (d.min + d.max) / 2, 0) / g.durations.length)
        : 250;

      await createFullFn({
        data: {
          object: {
            name,
            object_kind: defaultKind as any,
            client_id: cid,
            width: g.width, height: g.height, layers: g.layers,
            pattern_x: g.patternX, pattern_y: g.patternY, pattern_z: g.patternZ,
            frames: g.frames, frame_duration_ms: avgDuration,
            flags: isMissile ? { isMissile: true } : {},
            palette_group: null,
          },
          cells,
        },
      });
      onImported();
      onClose();
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar arquivo .obd</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input type="file" accept=".obd" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
          {fileName && <div className="text-xs text-slate-400">Arquivo: <b>{fileName}</b></div>}
          {busy && !result && <div className="text-xs text-slate-400">Descomprimindo e decodificando…</div>}
          {error && (
            <div className="rounded border border-red-700 bg-red-950/40 p-2 text-xs text-red-300">{error}</div>
          )}
          {result && (
            <>
              <div className="dev-inset p-3 text-xs space-y-1">
                <div className="grid grid-cols-4 gap-2">
                  <div>W×H: <b>{result.geometry.width}×{result.geometry.height}</b></div>
                  <div>Layers: <b>{result.geometry.layers}</b></div>
                  <div>Frames: <b>{result.geometry.frames}</b></div>
                  <div>Sprites: <b>{result.sprites.length}</b></div>
                  <div>Pat.X: <b>{result.geometry.patternX}</b></div>
                  <div>Pat.Y: <b>{result.geometry.patternY}</b></div>
                  <div>Pat.Z: <b>{result.geometry.patternZ}</b></div>
                  <div>Exact: <b>{result.geometry.exactSize}</b></div>
                </div>
                {result.geometry.durations.length > 0 && (
                  <div className="text-slate-400">
                    Durações: {result.geometry.durations.map((d, i) => `${i}=${d.min}${d.min !== d.max ? `-${d.max}` : ""}ms`).join(", ")}
                  </div>
                )}
                <div className="text-slate-500">Props opacos: {result.propertiesBlob.length} bytes (não decodificados)</div>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400">Nome do objeto</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <TilePreview tiles={tiles as any} cols={Math.min(tiles.length, 12)} />
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={doImport} disabled={!result || !name || busy}
            style={{ background: "var(--dev-accent)", color: "#052e2b" }}>
            {busy ? "Importando…" : "Importar e criar objeto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

