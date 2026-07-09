import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listSprites, getSpritesByIds } from "@/lib/dev/sprites.functions";
import { SpriteThumb } from "./SpriteThumb";

export function SpritePreview({ spriteId, size = 40 }: { spriteId?: number | null; size?: number }) {
  const fetchByIds = useServerFn(getSpritesByIds);
  const q = useQuery({
    queryKey: ["sprite-preview", spriteId],
    queryFn: () => (spriteId ? fetchByIds({ data: { ids: [spriteId] } }) : Promise.resolve({ rows: [], urlMap: {} })),
    enabled: !!spriteId,
    staleTime: 60_000,
  });
  const row: any = q.data?.rows?.[0];
  if (!spriteId || !row) {
    return (
      <div
        style={{
          width: size,
          height: size,
          border: "1px dashed var(--dev-border)",
          borderRadius: 4,
        }}
        className="grid place-items-center text-[10px] text-slate-500"
      >
        —
      </div>
    );
  }
  return (
    <SpriteThumb
      sheetUrl={q.data!.urlMap[row.sheet_url] ?? null}
      x={row.x}
      y={row.y}
      width={row.width}
      height={row.height}
      scale={size / row.width}
    />
  );
}

export function SpritePicker({
  value,
  onChange,
  label,
}: {
  value?: number | null;
  onChange: (id: number | null) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 96;

  const fetchList = useServerFn(listSprites);
  const q = useQuery({
    queryKey: ["sprites-picker", search, page],
    queryFn: () => fetchList({ data: { search: search || undefined, limit, offset: page * limit } }),
    enabled: open,
  });

  return (
    <div className="flex items-center gap-2">
      <SpritePreview spriteId={value ?? undefined} size={40} />
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wider text-slate-400">{label ?? "Sprite"}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-300">
            {value ? `#${String(value).padStart(4, "0")}` : "não definido"}
          </span>
          <Button size="sm" variant="secondary" type="button" onClick={() => setOpen(true)}>
            Escolher…
          </Button>
          {value != null && (
            <Button size="sm" variant="ghost" type="button" onClick={() => onChange(null)}>
              limpar
            </Button>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Selecionar sprite</DialogTitle>
          </DialogHeader>
          <div className="mb-3 flex gap-2">
            <Input
              placeholder="Buscar por tag…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
            <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))}>
              ‹
            </Button>
            <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
              ›
            </Button>
          </div>
          <div className="grid max-h-[60vh] grid-cols-12 gap-1 overflow-y-auto">
            {q.data?.rows.map((r: any) => (
              <button
                key={r.id}
                type="button"
                title={`#${r.id}`}
                onClick={() => {
                  onChange(r.id);
                  setOpen(false);
                }}
                className="rounded border border-slate-700 p-1 hover:border-emerald-500"
              >
                <SpriteThumb
                  sheetUrl={q.data!.urlMap[r.sheet_url] ?? null}
                  x={r.x}
                  y={r.y}
                  width={r.width}
                  height={r.height}
                  scale={2}
                />
                <div className="mt-1 text-center text-[9px] text-slate-400">#{r.id}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
