import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listMapTiles,
  upsertMapTile,
  deleteMapTile,
} from "@/lib/dev/map.functions";
import { listSprites } from "@/lib/dev/sprites.functions";
import { SpriteThumb } from "./SpriteThumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skull } from "lucide-react";

const TILE = 32;
const COLS = 40;
const ROWS = 30;

type Layer = "floor" | "obstacles" | "spawn";

type SpriteRow = {
  id: number;
  sheet_url: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type TileRow = {
  id: string;
  x: number;
  y: number;
  layer: Layer;
  tile_id: number;
  blocking: boolean;
  spawn_monster_id: string | null;
};

export function MapEditor() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMapTiles);
  const upsertFn = useServerFn(upsertMapTile);
  const deleteFn = useServerFn(deleteMapTile);
  const spritesFn = useServerFn(listSprites);

  const [layer, setLayer] = useState<Layer>("floor");
  const [tool, setTool] = useState<"paint" | "erase">("paint");
  const [blocking, setBlocking] = useState(false);
  const [selectedSprite, setSelectedSprite] = useState<SpriteRow | null>(null);
  const [selectedMonsterId, setSelectedMonsterId] = useState<string>("");
  const [search, setSearch] = useState("");
  const draggingRef = useRef<0 | 1 | 2 | null>(null);

  const tilesQ = useQuery({
    queryKey: ["map-tiles"],
    queryFn: () => listFn(),
  });
  const spritesQ = useQuery({
    queryKey: ["sprites-palette", search],
    queryFn: () =>
      spritesFn({ data: { search: search || undefined, limit: 200, offset: 0 } }),
  });

  const upsert = useMutation({
    mutationFn: (v: {
      x: number;
      y: number;
      layer: Layer;
      tile_id: number;
      blocking: boolean;
      spawn_monster_id?: string | null;
    }) => upsertFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["map-tiles"] }),
  });
  const del = useMutation({
    mutationFn: (v: { x: number; y: number; layer: Layer }) => deleteFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["map-tiles"] }),
  });

  const byCell = useMemo(() => {
    const map = new Map<string, TileRow>();
    for (const t of (tilesQ.data?.tiles ?? []) as TileRow[]) {
      map.set(`${t.layer}:${t.x}:${t.y}`, t);
    }
    return map;
  }, [tilesQ.data]);

  const spriteById = useMemo(() => {
    const m = new Map<number, SpriteRow>();
    for (const s of (tilesQ.data?.sprites ?? []) as SpriteRow[]) m.set(s.id, s);
    for (const s of (spritesQ.data?.rows ?? []) as SpriteRow[]) m.set(s.id, s);
    return m;
  }, [tilesQ.data, spritesQ.data]);

  const urlMap = { ...(tilesQ.data?.urlMap ?? {}), ...(spritesQ.data?.urlMap ?? {}) };
  const monsters = (tilesQ.data?.monsters ?? []) as { id: string; name: string }[];

  function applyAt(x: number, y: number, button: number) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    if (button === 2 || tool === "erase") {
      del.mutate({ x, y, layer });
      return;
    }
    if (!selectedSprite) return;
    const payload: any = { x, y, layer, tile_id: selectedSprite.id, blocking };
    if (layer === "spawn") {
      if (!selectedMonsterId) return;
      payload.spawn_monster_id = selectedMonsterId;
      payload.blocking = false;
    }
    upsert.mutate(payload);
  }

  function cellFromEvent(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / TILE);
    const y = Math.floor((e.clientY - rect.top) / TILE);
    return { x, y };
  }

  return (
    <div className="grid grid-cols-[280px_1fr] gap-4">
      <div className="dev-panel space-y-3 p-3">
        <div className="space-y-2">
          <label className="block text-[10px] uppercase tracking-wider text-slate-400">
            Camada
          </label>
          <div className="flex gap-1">
            {(["floor", "obstacles", "spawn"] as Layer[]).map((l) => (
              <Button
                key={l}
                size="sm"
                variant={layer === l ? "default" : "outline"}
                onClick={() => setLayer(l)}
                className="flex-1 text-xs"
              >
                {l === "spawn" ? "Spawn" : l === "floor" ? "Floor" : "Obs."}
              </Button>
            ))}
          </div>

          <div className="flex gap-1">
            {(["paint", "erase"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={tool === t ? "default" : "outline"}
                onClick={() => setTool(t)}
                className="flex-1"
              >
                {t === "paint" ? "Pincel" : "Borracha"}
              </Button>
            ))}
          </div>

          {layer !== "spawn" && (
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <Checkbox
                checked={blocking}
                onCheckedChange={(v) => setBlocking(v === true)}
              />
              Bloqueia passagem
            </label>
          )}

          {layer === "spawn" && (
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-red-400">
                <Skull className="h-3 w-3" /> Monstro
              </label>
              <Select value={selectedMonsterId} onValueChange={setSelectedMonsterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o monstro…" />
                </SelectTrigger>
                <SelectContent>
                  {monsters.length === 0 ? (
                    <div className="px-2 py-2 text-xs text-slate-500">
                      Cadastre monstros primeiro
                    </div>
                  ) : (
                    monsters.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="border-t border-slate-700 pt-3">
          <Input
            placeholder="Buscar tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="mt-2 max-h-[460px] overflow-y-auto">
            <div className="grid grid-cols-5 gap-1">
              {(spritesQ.data?.rows ?? []).map((r: any) => {
                const active = selectedSprite?.id === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedSprite(r)}
                    title={`#${r.id}`}
                    className="rounded border p-1"
                    style={{
                      borderColor: active ? "var(--dev-accent)" : "rgb(51,65,85)",
                    }}
                  >
                    <SpriteThumb
                      sheetUrl={spritesQ.data!.urlMap[r.sheet_url] ?? null}
                      x={r.x}
                      y={r.y}
                      width={r.width}
                      height={r.height}
                      scale={1.2}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-500">
          Clique esquerdo pinta · direito apaga · segure e arraste
        </div>
      </div>

      <div className="dev-panel p-2">
        <div
          className="relative select-none"
          style={{
            width: COLS * TILE,
            height: ROWS * TILE,
            background: "#111",
            imageRendering: "pixelated",
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
            const { x, y } = cellFromEvent(e);
            applyAt(x, y, draggingRef.current);
          }}
        >
          <svg
            className="pointer-events-none absolute inset-0"
            width={COLS * TILE}
            height={ROWS * TILE}
          >
            {Array.from({ length: COLS + 1 }).map((_, i) => (
              <line
                key={`v${i}`}
                x1={i * TILE}
                y1={0}
                x2={i * TILE}
                y2={ROWS * TILE}
                stroke="rgba(255,255,255,0.05)"
              />
            ))}
            {Array.from({ length: ROWS + 1 }).map((_, i) => (
              <line
                key={`h${i}`}
                x1={0}
                y1={i * TILE}
                x2={COLS * TILE}
                y2={i * TILE}
                stroke="rgba(255,255,255,0.05)"
              />
            ))}
          </svg>

          {(["floor", "obstacles", "spawn"] as Layer[]).map((lyr) =>
            Array.from(byCell.values())
              .filter((t) => t.layer === lyr)
              .map((t) => {
                const sp = spriteById.get(t.tile_id);
                if (!sp) return null;
                const url = urlMap[sp.sheet_url];
                if (!url) return null;
                return (
                  <div
                    key={`${t.layer}:${t.x}:${t.y}`}
                    className="pointer-events-none absolute"
                    style={{
                      left: t.x * TILE,
                      top: t.y * TILE,
                      width: TILE,
                      height: TILE,
                      backgroundImage: `url(${url})`,
                      backgroundPosition: `-${sp.x}px -${sp.y}px`,
                      backgroundSize: "auto",
                      imageRendering: "pixelated",
                      outline: t.blocking
                        ? "1px solid rgba(239,68,68,0.6)"
                        : lyr === "spawn"
                          ? "1px solid rgba(168,85,247,0.7)"
                          : undefined,
                      zIndex: lyr === "floor" ? 1 : lyr === "obstacles" ? 2 : 3,
                    }}
                  />
                );
              }),
          )}

          {Array.from(byCell.values())
            .filter((t) => t.layer === "spawn")
            .map((t) => (
              <div
                key={`skull:${t.x}:${t.y}`}
                className="pointer-events-none absolute grid place-items-center"
                style={{
                  left: t.x * TILE,
                  top: t.y * TILE,
                  width: TILE,
                  height: TILE,
                  zIndex: 4,
                }}
              >
                <Skull className="h-4 w-4 text-purple-300 drop-shadow" />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
