import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, Upload, Play, AlertTriangle } from "lucide-react";
import { SprReader } from "@/lib/dev/tibia/sprReader";
import { parseDat, type DatParseResult, type ThingType, type DatFlags } from "@/lib/dev/tibia/datReader";
import { importTibiaBatch } from "@/lib/dev/objects.functions";

export const Route = createFileRoute("/dev/objects_/import-client")({ component: Page });

/* Convert a ThingType's spriteIds + SprReader into: dedup tile list + composition cells */
type Tile = { hash: string; base64Png: string };
type CellDto = {
  tile_hash: string; layer: number;
  pattern_x: number; pattern_y: number; pattern_z: number;
  frame: number; cell_x: number; cell_y: number;
};

async function sha1Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest(
    "SHA-1",
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function bytesToBase64(bytes: Uint8Array) {
  let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
async function rgbaToPng(rgba: Uint8Array): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = 32; canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), 32, 32), 0, 0);
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

/* Map dat flags → schema flags + object_kind */
function classifyThing(t: ThingType): { object_kind: any; extraFlags: Record<string, any> } {
  const f = t.flags;
  let kind: string = "item";
  if (t.category === "outfit") kind = "creature";
  else if (t.category === "effect") kind = "effect";
  else if (t.category === "missile") kind = "effect";
  else if (f.isGround) kind = "ground";
  else if (f.isContainer) kind = "container";
  else if (f.isFluidContainer || f.isFluid) kind = "fluid";
  else if (f.isOnTop) kind = "wall";
  const extra: Record<string, any> = {};
  if (f.isUnpassable) extra.isSolid = true;
  if (f.blockMissile) extra.isBlockProjectile = true;
  if (f.blockPathfind) extra.isBlockPath = true;
  if (f.isContainer) extra.isContainer = true;
  if (f.isStackable) extra.isStackable = true;
  if (f.isMultiUse) extra.isUseable = true;
  if (f.isForceUse) extra.isForceUse = true;
  if (f.isPickupable) extra.isPickupable = true;
  if (f.isHangable) extra.isHangable = true;
  if (f.isRotatable) extra.isRotatable = true;
  if (f.isFullGround) extra.isFullGround = true;
  if (f.isOnTop) extra.isTop = true;
  if (f.isOnBottom) extra.isBottom = true;
  if (f.hasElevation) { extra.hasHeight = true; extra.elevation = f.elevation ?? 8; }
  if (f.hasOffset) extra.hasOffset = true;
  if (f.hasLight) { extra.hasLight = true; extra.lightLevel = f.lightLevel; extra.lightColor = f.lightColor; }
  if (f.isLyingObject) extra.isLyingCorpse = true;
  if (f.isAnimateAlways) extra.isAnimateAlways = true;
  if (f.hasMiniMap) extra.miniMapColor = f.miniMapColor;
  if (f.isGround && f.groundSpeed != null) extra.groundSpeed = f.groundSpeed;
  if (t.category === "missile") extra.isMissile = true;
  return { object_kind: kind, extraFlags: extra };
}

async function buildBatchObject(
  t: ThingType,
  spr: SprReader,
  cache: Map<number, Tile>, // sprite id → tile (dedupe across batch)
): Promise<{
  object: any; cells: CellDto[]; newTiles: Tile[];
} | null> {
  const totalPZ = 1;
  const total = t.width * t.height * t.layers * t.patternX * t.patternY * totalPZ * t.frames;
  if (total === 0 || t.spriteIds.length === 0) return null;

  const newTiles: Tile[] = [];
  const cells: CellDto[] = [];
  let idx = 0;
  for (let f = 0; f < t.frames; f++) {
    for (let pz = 0; pz < totalPZ; pz++) {
      for (let py = 0; py < t.patternY; py++) {
        for (let px = 0; px < t.patternX; px++) {
          for (let l = 0; l < t.layers; l++) {
            for (let cy = 0; cy < t.height; cy++) {
              for (let cx = 0; cx < t.width; cx++) {
                const spriteId = t.spriteIds[idx++];
                if (!spriteId) continue;
                let tile = cache.get(spriteId);
                if (!tile) {
                  const rgba = spr.getSprite(spriteId);
                  if (!rgba) continue;
                  const png = await rgbaToPng(rgba);
                  const hash = await sha1Hex(png);
                  tile = { hash, base64Png: bytesToBase64(png) };
                  cache.set(spriteId, tile);
                  newTiles.push(tile);
                }
                cells.push({
                  tile_hash: tile.hash, layer: l,
                  pattern_x: px, pattern_y: py, pattern_z: pz,
                  frame: f, cell_x: cx, cell_y: cy,
                });
              }
            }
          }
        }
      }
    }
  }

  const { object_kind, extraFlags } = classifyThing(t);
  const name =
    t.category === "outfit" ? `outfit_${t.id}` :
    t.category === "effect" ? `effect_${t.id}` :
    t.category === "missile" ? `missile_${t.id}` :
    `item_${t.id}`;

  return {
    object: {
      name,
      object_kind,
      client_id: t.id,
      width: t.width, height: t.height, layers: t.layers,
      pattern_x: t.patternX, pattern_y: t.patternY, pattern_z: totalPZ,
      frames: t.frames, frame_duration_ms: 500,
      flags: extraFlags,
      cells,
    },
    cells,
    newTiles,
  };
}

function Page() {
  const importFn = useServerFn(importTibiaBatch);
  const [dat, setDat] = useState<DatParseResult | null>(null);
  const [spr, setSpr] = useState<SprReader | null>(null);
  const [datName, setDatName] = useState(""); const [sprName, setSprName] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; log: string[] }>({ done: 0, total: 0, log: [] });
  const cancelRef = useRef(false);

  // filters
  const [cats, setCats] = useState({ item: true, outfit: true, effect: true, missile: true });
  const [idMin, setIdMin] = useState(""); const [idMax, setIdMax] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [batchSize, setBatchSize] = useState(50);

  async function pickDat(f: File) {
    setDatName(f.name); setBusy(true);
    try { setDat(parseDat(await f.arrayBuffer())); }
    finally { setBusy(false); }
  }
  async function pickSpr(f: File) {
    setSprName(f.name); setBusy(true);
    try { setSpr(new SprReader(await f.arrayBuffer())); }
    finally { setBusy(false); }
  }

  const filtered = useMemo(() => {
    if (!dat) return [] as ThingType[];
    const out: ThingType[] = [];
    if (cats.item) out.push(...dat.items);
    if (cats.outfit) out.push(...dat.outfits);
    if (cats.effect) out.push(...dat.effects);
    if (cats.missile) out.push(...dat.missiles);
    const mn = idMin ? Number(idMin) : -Infinity;
    const mx = idMax ? Number(idMax) : Infinity;
    return out.filter((t) => t.id >= mn && t.id <= mx);
  }, [dat, cats, idMin, idMax]);

  async function run() {
    if (!dat || !spr || !filtered.length) return;
    setBusy(true); cancelRef.current = false;
    setProgress({ done: 0, total: filtered.length, log: [] });
    const cache = new Map<number, Tile>();

    for (let i = 0; i < filtered.length; i += batchSize) {
      if (cancelRef.current) break;
      const slice = filtered.slice(i, i + batchSize);
      const built: any[] = []; const newSprites: Tile[] = [];
      for (const t of slice) {
        const b = await buildBatchObject(t, spr, cache);
        if (b) {
          built.push(b.object);
          for (const nt of b.newTiles) newSprites.push(nt);
        }
      }

      if (dryRun) {
        setProgress((p) => ({
          done: Math.min(i + slice.length, filtered.length),
          total: filtered.length,
          log: [...p.log, `[dry-run] batch ${i / batchSize + 1}: ${built.length} objetos, ${newSprites.length} sprites novos`],
        }));
      } else {
        try {
          const res = await importFn({
            data: { sprites: newSprites, objects: built as any, tagPrefix: "tibia74" },
          });
          setProgress((p) => ({
            done: Math.min(i + slice.length, filtered.length),
            total: filtered.length,
            log: [...p.log, `batch ${i / batchSize + 1}: +${res.inserted} novos, ${res.updated} atualizados, ${res.skipped} pulados`],
          }));
        } catch (e: any) {
          setProgress((p) => ({
            ...p, done: Math.min(i + slice.length, filtered.length),
            log: [...p.log, `batch ${i / batchSize + 1}: ERRO ${e.message}`],
          }));
        }
      }
    }

    setBusy(false);
  }

  const summary = dat && (
    <div className="grid grid-cols-4 gap-2 text-xs dev-inset p-3">
      <div>Items: <b>{dat.items.length}</b>/{dat.itemsCount}</div>
      <div>Outfits: <b>{dat.outfits.length}</b>/{dat.outfitsCount}</div>
      <div>Effects: <b>{dat.effects.length}</b>/{dat.effectsCount}</div>
      <div>Missiles: <b>{dat.missiles.length}</b>/{dat.missilesCount}</div>
      {dat.truncated && (
        <div className="col-span-4 mt-1 flex items-start gap-2 text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>Arquivo terminou antes do declarado no header. Warnings: {dat.warnings.slice(0, 3).join("; ")}</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link to="/dev/objects" className="rounded p-1 hover:bg-slate-800">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-100">Importar cliente Tibia 7.4</h1>
          <p className="text-xs text-slate-400">Carrega <code>Tibia.dat</code> + <code>Tibia.spr</code> e popula o banco automaticamente</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="dev-panel p-3">
          <label className="mb-1 block text-[10px] uppercase text-slate-400">Tibia.dat</label>
          <input type="file" accept=".dat" onChange={(e) => e.target.files?.[0] && pickDat(e.target.files[0])} />
          {datName && <div className="mt-1 text-xs text-slate-500">{datName}</div>}
        </div>
        <div className="dev-panel p-3">
          <label className="mb-1 block text-[10px] uppercase text-slate-400">Tibia.spr</label>
          <input type="file" accept=".spr" onChange={(e) => e.target.files?.[0] && pickSpr(e.target.files[0])} />
          {sprName && <div className="mt-1 text-xs text-slate-500">{sprName} · {spr?.count ?? 0} sprites</div>}
        </div>
      </div>

      {summary}

      {dat && spr && (
        <div className="dev-panel space-y-3 p-3">
          <div className="flex flex-wrap gap-4">
            {(["item", "outfit", "effect", "missile"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <Checkbox checked={cats[k]} onCheckedChange={(v) => setCats({ ...cats, [k]: !!v })} />
                {k}s
              </label>
            ))}
            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase text-slate-400">ID min</label>
              <Input className="w-24" value={idMin} onChange={(e) => setIdMin(e.target.value)} />
              <label className="text-[10px] uppercase text-slate-400">ID max</label>
              <Input className="w-24" value={idMax} onChange={(e) => setIdMax(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase text-slate-400">Batch</label>
              <Input type="number" className="w-20" value={batchSize} onChange={(e) => setBatchSize(Math.max(1, Number(e.target.value) || 50))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={dryRun} onCheckedChange={(v) => setDryRun(!!v)} />
              Dry-run (só simula)
            </label>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-400">
              Selecionados: <b className="text-slate-100">{filtered.length}</b> · IDs {filtered[0]?.id ?? "—"} → {filtered[filtered.length - 1]?.id ?? "—"}
            </div>
            <div className="flex-1" />
            {busy ? (
              <Button size="sm" variant="destructive" onClick={() => { cancelRef.current = true; }}>Cancelar</Button>
            ) : (
              <Button size="sm" onClick={run} disabled={!filtered.length}
                style={{ background: "var(--dev-accent)", color: "#052e2b" }}>
                <Play className="mr-1 h-4 w-4" />
                {dryRun ? "Simular" : "Importar"}
              </Button>
            )}
          </div>

          {progress.total > 0 && (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded bg-slate-800">
                <div className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
              <div className="text-xs text-slate-400">{progress.done}/{progress.total}</div>
              <div className="dev-inset max-h-64 overflow-auto p-2 font-mono text-[10px]">
                {progress.log.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
