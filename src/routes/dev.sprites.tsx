import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listSprites,
  createSpritesBatch,
  updateSpriteTags,
  deleteSprite,
} from "@/lib/dev/sprites.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SpriteThumb } from "@/components/dev/SpriteThumb";
import { Upload, Search, Trash2, Grid3x3 } from "lucide-react";

export const Route = createFileRoute("/dev/sprites")({
  component: SpritesPage,
});

const BUCKET = "game-sprites";

function SpritesPage() {
  return (
    <div className="space-y-6">
      <Header />
      <SpriteUploader />
      <Gallery />
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100">Banco de Sprites</h1>
      <p className="text-sm text-slate-400">
        Upload de folhas .PNG, corte automático em blocos 32×32 e catalogação com IDs sequenciais.
      </p>
    </div>
  );
}

function SpriteUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [tileSize, setTileSize] = useState(32);
  const [preview, setPreview] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const qc = useQueryClient();
  const createBatch = useServerFn(createSpritesBatch);
  const registerMut = useMutation({
    mutationFn: (input: { sheet_url: string; cols: number; rows: number }) =>
      createBatch({ data: { ...input, tileSize } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["sprites-list"] });
      alert(`✔ ${r.inserted} sprites registrados.`);
      setFile(null);
      setPreview(null);
      setDims(null);
      setUploadedPath(null);
    },
    onError: (e: Error) => setErr(e.message),
  });

  function onFile(f: File | null) {
    setErr(null);
    setUploadedPath(null);
    setFile(f);
    if (!f) {
      setPreview(null);
      setDims(null);
      return;
    }
    const url = URL.createObjectURL(f);
    setPreview(url);
    const img = new Image();
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    setErr(null);
    const path = `sheets/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    setUploading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setUploadedPath(path);
  }

  const cols = dims ? Math.floor(dims.w / tileSize) : 0;
  const rows = dims ? Math.floor(dims.h / tileSize) : 0;
  const total = cols * rows;

  return (
    <div className="dev-panel p-6">
      <div className="mb-4 flex items-center gap-2">
        <Upload className="h-5 w-5 text-emerald-400" />
        <h2 className="text-lg font-semibold text-slate-100">Upload de Folha</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className="dev-inset flex min-h-[220px] flex-col items-center justify-center gap-2 p-4 text-center"
        >
          {preview ? (
            <div className="relative max-h-[320px] overflow-auto">
              <img
                src={preview}
                alt="preview"
                style={{ imageRendering: "pixelated", display: "block" }}
              />
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-slate-500" />
              <div className="text-sm text-slate-400">Arraste um .PNG aqui</div>
              <div className="text-xs text-slate-500">ou clique para escolher</div>
            </>
          )}
          <input
            type="file"
            accept="image/png,image/webp"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            className="mt-2 block w-full cursor-pointer text-xs text-slate-400 file:mr-2 file:rounded file:border-0 file:bg-emerald-600 file:px-3 file:py-1 file:text-white"
          />
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
              Tamanho do bloco (px)
            </label>
            <Input
              type="number"
              min={4}
              max={256}
              value={tileSize}
              onChange={(e) => setTileSize(Number(e.target.value) || 32)}
            />
          </div>
          {dims && (
            <div className="dev-inset space-y-1 p-3 text-xs text-slate-300">
              <div>Dimensões: <b>{dims.w}×{dims.h}px</b></div>
              <div>Grid: <b>{cols} colunas × {rows} linhas</b></div>
              <div>Total: <b className="text-emerald-400">{total} sprites</b></div>
            </div>
          )}
          {err && <div className="text-xs text-red-400">{err}</div>}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={upload}
              disabled={!file || uploading || !!uploadedPath}
              className="w-full"
            >
              {uploading ? "Enviando…" : uploadedPath ? "✔ Enviado" : "1. Enviar folha ao Storage"}
            </Button>
            <Button
              type="button"
              disabled={!uploadedPath || total === 0 || registerMut.isPending}
              onClick={() =>
                uploadedPath && registerMut.mutate({ sheet_url: uploadedPath, cols, rows })
              }
              className="w-full"
              style={{ background: "var(--dev-accent)", color: "#052e2b" }}
            >
              {registerMut.isPending
                ? "Registrando…"
                : `2. Fatiar e registrar ${total} sprites`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Gallery() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<any | null>(null);
  const limit = 120;

  const qc = useQueryClient();
  const fetchList = useServerFn(listSprites);
  const updTagsFn = useServerFn(updateSpriteTags);
  const delFn = useServerFn(deleteSprite);

  const q = useQuery({
    queryKey: ["sprites-list", search, page],
    queryFn: () =>
      fetchList({ data: { search: search || undefined, limit, offset: page * limit } }),
  });

  const updTags = useMutation({
    mutationFn: (v: { id: number; tags: string[] }) => updTagsFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sprites-list"] }),
  });
  const del = useMutation({
    mutationFn: (id: number) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sprites-list"] });
      setSelected(null);
    },
  });

  const totalPages = Math.max(1, Math.ceil((q.data?.count ?? 0) / limit));

  return (
    <div className="dev-panel p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Grid3x3 className="h-5 w-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-slate-100">
            Galeria <span className="text-xs text-slate-500">({q.data?.count ?? 0})</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Buscar por tag…"
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {q.isLoading ? (
        <div className="p-8 text-center text-sm text-slate-500">Carregando…</div>
      ) : (q.data?.rows.length ?? 0) === 0 ? (
        <div className="dev-inset p-8 text-center text-sm text-slate-500">
          Nenhum sprite ainda. Envie uma folha acima.
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-16">
          {q.data!.rows.map((r: any) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r)}
              className="rounded border border-slate-700 p-1 transition-colors hover:border-emerald-500"
              title={`#${r.id} — ${r.tags?.join(", ") || "sem tags"}`}
            >
              <SpriteThumb
                sheetUrl={q.data!.urlMap[r.sheet_url] ?? null}
                x={r.x}
                y={r.y}
                width={r.width}
                height={r.height}
                scale={2}
              />
              <div className="mt-1 text-center text-[9px] text-slate-500">
                #{String(r.id).padStart(4, "0")}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <div>Página {page + 1} de {totalPages}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Próximo
          </Button>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Sprite #{selected ? String(selected.id).padStart(4, "0") : ""}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="dev-inset grid place-items-center p-4">
                <SpriteThumb
                  sheetUrl={q.data!.urlMap[selected.sheet_url] ?? null}
                  x={selected.x}
                  y={selected.y}
                  width={selected.width}
                  height={selected.height}
                  scale={8}
                />
              </div>
              <div className="text-xs text-slate-400">
                Folha: <code>{selected.sheet_url}</code> · pos: ({selected.x}, {selected.y}) ·
                tamanho: {selected.width}×{selected.height}
              </div>
              <TagsEditor
                initial={selected.tags ?? []}
                onSave={(tags) => updTags.mutate({ id: selected.id, tags })}
              />
              <Button
                variant="destructive"
                onClick={() => confirm(`Remover sprite #${selected.id}?`) && del.mutate(selected.id)}
                disabled={del.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TagsEditor({
  initial,
  onSave,
}: {
  initial: string[];
  onSave: (tags: string[]) => void;
}) {
  const [txt, setTxt] = useState(initial.join(", "));
  return (
    <div className="space-y-2">
      <label className="block text-xs uppercase tracking-wider text-slate-400">
        Tags (separadas por vírgula)
      </label>
      <Input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="floor, grass, walkable" />
      <Button
        size="sm"
        onClick={() => onSave(txt.split(",").map((s) => s.trim()).filter(Boolean))}
        style={{ background: "var(--dev-accent)", color: "#052e2b" }}
      >
        Salvar tags
      </Button>
    </div>
  );
}
