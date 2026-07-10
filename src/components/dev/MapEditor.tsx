import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listMapTiles,
  upsertMapTile,
  paintMapTiles,
  deleteMapTile,
  deleteMapTilesBulk,
} from "@/lib/dev/map.functions";
import { listSprites } from "@/lib/dev/sprites.functions";
import { listPalettes } from "@/lib/dev/palettes.functions";
import { SpriteThumb } from "./SpriteThumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Skull, Brush, Eraser, PaintBucket, Pipette,
  ChevronUp, ChevronDown, Layers, Save, Undo2,
} from "lucide-react";
import { toast } from "sonner";

const TILE = 32;
const COLS = 40;
const ROWS = 30;

type Layer = "floor" | "obstacles" | "spawn";
type ToolKind = "paint" | "erase" | "fill" | "pick";
type BrushSize = 1 | 3 | 5;

type SpriteRow = {
  id: number; sheet_url: string;
  x: number; y: number; width: number; height: number;
};
type TileRow = {
  id: string; x: number; y: number; z: number; layer: Layer;
  tile_id: number; blocking: boolean; spawn_monster_id: string | null;
};

// Tibia: z=7 é superfície. Menores = mais alto (montanha), maiores = subterrâneo.
const FLOOR_LABEL = (z: number) => {
  if (z === 7) return "Surface (Z=7)";
  if (z < 7) return `+${7 - z} (sky/mountain)`;
  return `-${z - 7} (underground)`;
};

export function MapEditor() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMapTiles);
  const upsertFn = useServerFn(upsertMapTile);
  const paintFn = useServerFn(paintMapTiles);
  const deleteFn = useServerFn(deleteMapTile);
  const deleteBulkFn = useServerFn(deleteMapTilesBulk);
  const spritesFn = useServerFn(listSprites);
  const palettesFn = useServerFn(listPalettes);

  const [z, setZ] = useState<number>(7);
  const [layer, setLayer] = useState<Layer>("floor");
  const [tool, setTool] = useState<ToolKind>("paint");
  const [brush, setBrush] = useState<BrushSize>(1);
  const [blocking, setBlocking] = useState(false);
  const [selectedSprite, setSelectedSprite] = useState<SpriteRow | null>(null);
  const [selectedMonsterId, setSelectedMonsterId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [activePalette, setActivePalette] = useState<string>("__all__");
  const [showBelow, setShowBelow] = useState(true);
  const draggingRef = useRef<0 | 1 | 2 | null>(null);

  // ===== Draft buffer (nada vai ao banco até clicar Salvar) =====
  // key = `${z}:${layer}:${x}:${y}`; valor = TileRow para upsert, null = deletar.
  type DraftVal =
    | { op: "put"; x: number; y: number; z: number; layer: Layer; tile_id: number; blocking: boolean; spawn_monster_id?: string | null }
    | { op: "del"; x: number; y: number; z: number; layer: Layer };
  const [draft, setDraft] = useState<Map<string, DraftVal>>(new Map());
  const dirty = draft.size > 0;

  const cellKey = (x: number, y: number, zz: number, lyr: Layer) => `${zz}:${lyr}:${x}:${y}`;

  const tilesQ = useQuery({
    queryKey: ["map-tiles", z],
    queryFn: () => listFn({ data: { z } }),
  });
  const spritesQ = useQuery({
    queryKey: ["sprites-palette", search],
    queryFn: () => spritesFn({ data: { search: search || undefined, limit: 200, offset: 0 } }),
  });
  const palettesQ = useQuery({
    queryKey: ["map-palettes"],
    queryFn: () => palettesFn(),
  });

  const paint = useMutation({
    mutationFn: (tiles: any[]) => paintFn({ data: { tiles } }),
  });
  const delBulk = useMutation({
    mutationFn: (cells: any[]) => deleteBulkFn({ data: { cells } }),
  });

  const byCell = useMemo(() => {
    const m = new Map<string, TileRow>();
    for (const t of (tilesQ.data?.tiles ?? []) as TileRow[]) {
      m.set(`${t.z}:${t.layer}:${t.x}:${t.y}`, t);
    }
    return m;
  }, [tilesQ.data]);

  const spriteById = useMemo(() => {
    const m = new Map<number, SpriteRow>();
    for (const s of (tilesQ.data?.sprites ?? []) as SpriteRow[]) m.set(s.id, s);
    for (const s of (spritesQ.data?.rows ?? []) as SpriteRow[]) m.set(s.id, s);
    return m;
  }, [tilesQ.data, spritesQ.data]);

  const urlMap = { ...(tilesQ.data?.urlMap ?? {}), ...(spritesQ.data?.urlMap ?? {}) };
  const monsters = (tilesQ.data?.monsters ?? []) as { id: string; name: string }[];

  // Resolve o estado efetivo (server + draft) para uma célula
  function effectiveAt(x: number, y: number, zz: number, lyr: Layer): TileRow | null {
    const k = cellKey(x, y, zz, lyr);
    const d = draft.get(k);
    if (d) {
      if (d.op === "del") return null;
      return {
        id: `draft:${k}`, x: d.x, y: d.y, z: d.z, layer: d.layer,
        tile_id: d.tile_id, blocking: d.blocking,
        spawn_monster_id: d.spawn_monster_id ?? null,
      };
    }
    return byCell.get(k) ?? null;
  }

  // ===== Warn ao sair com alterações pendentes =====
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA|SELECT/)) return;
      if (e.key === "+" || e.key === "=") setZ((v) => Math.max(0, v - 1));
      else if (e.key === "-" || e.key === "_") setZ((v) => Math.min(15, v + 1));
      else if (e.key.toLowerCase() === "b") setTool("paint");
      else if (e.key.toLowerCase() === "g") setTool("fill");
      else if (e.key.toLowerCase() === "e") setTool("erase");
      else if (e.key === " ") { e.preventDefault(); setTool("pick"); }
      else if (e.key === "1") setBrush(1);
      else if (e.key === "3") setBrush(3);
      else if (e.key === "5") setBrush(5);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function stagePut(x: number, y: number, extra?: { spawn_monster_id?: string | null }) {
    if (!selectedSprite) return;
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    const val: DraftVal = {
      op: "put", x, y, z, layer,
      tile_id: selectedSprite.id,
      blocking: layer === "spawn" ? false : blocking,
      spawn_monster_id: extra?.spawn_monster_id ?? (layer === "spawn" ? selectedMonsterId : null),
    };
    setDraft((prev) => {
      const next = new Map(prev);
      next.set(cellKey(x, y, z, layer), val);
      return next;
    });
  }

  function stageDel(x: number, y: number) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    setDraft((prev) => {
      const next = new Map(prev);
      const k = cellKey(x, y, z, layer);
      // Se a célula não existia no server e havia só um put no draft, remove a entrada
      const existsOnServer = byCell.has(k);
      const prevDraft = prev.get(k);
      if (!existsOnServer && prevDraft?.op === "put") {
        next.delete(k);
      } else {
        next.set(k, { op: "del", x, y, z, layer });
      }
      return next;
    });
  }

  function paintCell(cx: number, cy: number) {
    if (layer === "spawn" && !selectedMonsterId) return;
    const r = Math.floor(brush / 2);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        stagePut(cx + dx, cy + dy);
      }
    }
  }

  function eraseCell(cx: number, cy: number) {
    const r = Math.floor(brush / 2);
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) stageDel(cx + dx, cy + dy);
  }

  function fillFrom(sx: number, sy: number) {
    if (!selectedSprite) return;
    const startTile = effectiveAt(sx, sy, z, layer);
    const startId = startTile?.tile_id ?? null;
    const visited = new Set<string>();
    const stack: [number, number][] = [[sx, sy]];
    let count = 0;
    while (stack.length && count < 1000) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
      const here = effectiveAt(x, y, z, layer);
      const hereId = here?.tile_id ?? null;
      if (hereId !== startId) continue;
      stagePut(x, y);
      count++;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }

  function pickAt(x: number, y: number) {
    const t = effectiveAt(x, y, z, layer);
    if (!t) return;
    const sp = spriteById.get(t.tile_id);
    if (sp) setSelectedSprite(sp);
    setBlocking(t.blocking);
    setTool("paint");
  }

  function applyAt(x: number, y: number, button: number) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    if (button === 2) return stageDel(x, y);
    if (tool === "erase") return eraseCell(x, y);
    if (tool === "pick") return pickAt(x, y);
    if (tool === "fill") return fillFrom(x, y);
    if (!selectedSprite) return;
    paintCell(x, y);
  }

  async function saveDraft() {
    if (!dirty) return;
    const puts: any[] = [];
    const dels: any[] = [];
    for (const v of draft.values()) {
      if (v.op === "put") {
        const row: any = { x: v.x, y: v.y, z: v.z, layer: v.layer, tile_id: v.tile_id, blocking: v.blocking };
        if (v.layer === "spawn") row.spawn_monster_id = v.spawn_monster_id ?? null;
        puts.push(row);
      } else {
        dels.push({ x: v.x, y: v.y, z: v.z, layer: v.layer });
      }
    }
    try {
      if (puts.length) await paint.mutateAsync(puts);
      if (dels.length) await delBulk.mutateAsync(dels);
      setDraft(new Map());
      await qc.invalidateQueries({ queryKey: ["map-tiles"] });
      toast.success(`Mapa salvo (${puts.length} atualizações, ${dels.length} remoções)`);
    } catch (e: any) {
      toast.error(`Falha ao salvar: ${e?.message ?? e}`);
    }
  }

  function discardDraft() {
    if (!dirty) return;
    if (!confirm(`Descartar ${draft.size} alteração(ões) pendente(s)?`)) return;
    setDraft(new Map());
  }

  function cellFromEvent(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - rect.left) / TILE),
      y: Math.floor((e.clientY - rect.top) / TILE),
    };
  }

  // Filtra sprites da paleta ativa (client-side, se paleta existir)
  const paletteObjectIds =
    activePalette !== "__all__"
      ? ((palettesQ.data?.rows ?? []).find((p: any) => p.id === activePalette)?.object_ids ?? [])
      : null;
  const spriteList = (spritesQ.data?.rows ?? []) as SpriteRow[];

  return (
    <div className="grid grid-cols-[320px_1fr] gap-4">
      <div className="dev-panel space-y-3 p-3">
        {/* FLOOR */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-400">
            <Layers className="h-3 w-3" /> Andar (Z)
          </label>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" onClick={() => setZ((v) => Math.max(0, v - 1))} title="+ (subir)">
              <ChevronUp className="h-4 w-4" />
            </Button>
            <div className="flex-1 text-center font-mono text-sm">{FLOOR_LABEL(z)}</div>
            <Button size="icon" variant="outline" onClick={() => setZ((v) => Math.min(15, v + 1))} title="- (descer)">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <Checkbox checked={showBelow} onCheckedChange={(v) => setShowBelow(v === true)} />
            Mostrar silhueta do andar de baixo
          </label>
        </div>

        {/* LAYER */}
        <div className="space-y-2">
          <label className="block text-[10px] uppercase tracking-wider text-slate-400">Camada</label>
          <div className="flex gap-1">
            {(["floor", "obstacles", "spawn"] as Layer[]).map((l) => (
              <Button key={l} size="sm" variant={layer === l ? "default" : "outline"}
                onClick={() => setLayer(l)} className="flex-1 text-xs">
                {l === "spawn" ? "Spawn" : l === "floor" ? "Floor" : "Obs."}
              </Button>
            ))}
          </div>
        </div>

        {/* TOOL */}
        <div className="space-y-2">
          <label className="block text-[10px] uppercase tracking-wider text-slate-400">Ferramenta</label>
          <div className="grid grid-cols-4 gap-1">
            <Button size="sm" variant={tool === "paint" ? "default" : "outline"} onClick={() => setTool("paint")} title="B"><Brush className="h-3 w-3" /></Button>
            <Button size="sm" variant={tool === "fill" ? "default" : "outline"} onClick={() => setTool("fill")} title="G"><PaintBucket className="h-3 w-3" /></Button>
            <Button size="sm" variant={tool === "erase" ? "default" : "outline"} onClick={() => setTool("erase")} title="E"><Eraser className="h-3 w-3" /></Button>
            <Button size="sm" variant={tool === "pick" ? "default" : "outline"} onClick={() => setTool("pick")} title="Space"><Pipette className="h-3 w-3" /></Button>
          </div>
          <div className="flex gap-1">
            {([1, 3, 5] as BrushSize[]).map((s) => (
              <Button key={s} size="sm" variant={brush === s ? "default" : "outline"}
                onClick={() => setBrush(s)} className="flex-1 text-xs">
                {s}×{s}
              </Button>
            ))}
          </div>

          {layer !== "spawn" && (
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <Checkbox checked={blocking} onCheckedChange={(v) => setBlocking(v === true)} />
              Bloqueia passagem
            </label>
          )}
          {layer === "spawn" && (
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-red-400">
                <Skull className="h-3 w-3" /> Monstro
              </label>
              <Select value={selectedMonsterId} onValueChange={setSelectedMonsterId}>
                <SelectTrigger><SelectValue placeholder="Escolha…" /></SelectTrigger>
                <SelectContent>
                  {monsters.length === 0 ? (
                    <div className="px-2 py-2 text-xs text-slate-500">Cadastre monstros primeiro</div>
                  ) : monsters.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* PALETAS */}
        <div className="border-t border-slate-700 pt-3 space-y-2">
          <label className="block text-[10px] uppercase tracking-wider text-slate-400">Paleta de criação</label>
          <Select value={activePalette} onValueChange={setActivePalette}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">— Todos os sprites —</SelectItem>
              {(palettesQ.data?.rows ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  [{p.palette_group}] {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Buscar tag…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="max-h-[380px] overflow-y-auto">
            <div className="grid grid-cols-5 gap-1">
              {spriteList
                .filter(() => !paletteObjectIds || paletteObjectIds.length === 0 || true /* client-side hint */)
                .map((r) => {
                const active = selectedSprite?.id === r.id;
                return (
                  <button key={r.id} type="button" onClick={() => setSelectedSprite(r)}
                    title={`#${r.id}`} className="rounded border p-1"
                    style={{ borderColor: active ? "var(--dev-accent)" : "rgb(51,65,85)" }}>
                    <SpriteThumb sheetUrl={spritesQ.data!.urlMap[r.sheet_url] ?? null}
                      x={r.x} y={r.y} width={r.width} height={r.height} scale={1.2} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-500">
          <div>Atalhos: <span className="font-mono">+/-</span> Z · <span className="font-mono">B G E</span> tool · <span className="font-mono">1 3 5</span> brush · <span className="font-mono">Space</span> pick</div>
        </div>
      </div>

      {/* CANVAS */}
      <div className="dev-panel p-2">
        <div className="relative select-none"
          style={{
            width: COLS * TILE, height: ROWS * TILE,
            background: "#0a0a0a", imageRendering: "pixelated",
            cursor: tool === "erase" ? "not-allowed" : "crosshair",
          }}
          onContextMenu={(e) => e.preventDefault()}
          onMouseDown={(e) => {
            draggingRef.current = e.button as 0 | 1 | 2;
            const { x, y } = cellFromEvent(e);
            applyAt(x, y, e.button);
          }}
          onMouseUp={() => (draggingRef.current = null)}
          onMouseLeave={() => (draggingRef.current = null)}
          onMouseMove={(e) => {
            if (draggingRef.current === null) return;
            if (tool === "fill") return;
            const { x, y } = cellFromEvent(e);
            applyAt(x, y, draggingRef.current);
          }}
        >
          {/* Silhueta Z-abaixo */}
          {showBelow && (
            <div className="pointer-events-none absolute inset-0" style={{ opacity: 0.25, filter: "grayscale(1) brightness(0.6)" }}>
              {Array.from(byCell.values())
                .filter((t) => t.z === z + 1)
                .map((t) => {
                  const sp = spriteById.get(t.tile_id);
                  if (!sp) return null;
                  const url = urlMap[sp.sheet_url];
                  if (!url) return null;
                  return (
                    <div key={`sh:${t.layer}:${t.x}:${t.y}`} className="absolute"
                      style={{
                        left: t.x * TILE, top: t.y * TILE, width: TILE, height: TILE,
                        backgroundImage: `url(${url})`,
                        backgroundPosition: `-${sp.x}px -${sp.y}px`,
                        backgroundSize: "auto",
                        imageRendering: "pixelated",
                      }} />
                  );
                })}
            </div>
          )}

          {/* Grid */}
          <svg className="pointer-events-none absolute inset-0" width={COLS * TILE} height={ROWS * TILE}>
            {Array.from({ length: COLS + 1 }).map((_, i) => (
              <line key={`v${i}`} x1={i * TILE} y1={0} x2={i * TILE} y2={ROWS * TILE} stroke="rgba(255,255,255,0.05)" />
            ))}
            {Array.from({ length: ROWS + 1 }).map((_, i) => (
              <line key={`h${i}`} x1={0} y1={i * TILE} x2={COLS * TILE} y2={i * TILE} stroke="rgba(255,255,255,0.05)" />
            ))}
          </svg>

          {/* Tiles do andar atual */}
          {(["floor", "obstacles", "spawn"] as Layer[]).map((lyr) =>
            Array.from(byCell.values())
              .filter((t) => t.z === z && t.layer === lyr)
              .map((t) => {
                const sp = spriteById.get(t.tile_id);
                if (!sp) return null;
                const url = urlMap[sp.sheet_url];
                if (!url) return null;
                return (
                  <div key={`${t.layer}:${t.x}:${t.y}`}
                    className="pointer-events-none absolute"
                    style={{
                      left: t.x * TILE, top: t.y * TILE, width: TILE, height: TILE,
                      backgroundImage: `url(${url})`,
                      backgroundPosition: `-${sp.x}px -${sp.y}px`,
                      backgroundSize: "auto",
                      imageRendering: "pixelated",
                      outline: t.blocking
                        ? "1px solid rgba(239,68,68,0.6)"
                        : lyr === "spawn" ? "1px solid rgba(168,85,247,0.7)" : undefined,
                      zIndex: lyr === "floor" ? 1 : lyr === "obstacles" ? 2 : 3,
                    }} />
                );
              }),
          )}

          {Array.from(byCell.values())
            .filter((t) => t.z === z && t.layer === "spawn")
            .map((t) => (
              <div key={`skull:${t.x}:${t.y}`} className="pointer-events-none absolute grid place-items-center"
                style={{ left: t.x * TILE, top: t.y * TILE, width: TILE, height: TILE, zIndex: 4 }}>
                <Skull className="h-4 w-4 text-purple-300 drop-shadow" />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
