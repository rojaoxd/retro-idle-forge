import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listEffects, upsertEffect, deleteEffect } from "@/lib/dev/effects.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpritePicker, SpritePreview } from "@/components/dev/SpritePicker";
import { Sparkles, Plus, Trash2, Save, ArrowUp, ArrowDown, X } from "lucide-react";

export const Route = createFileRoute("/dev/spells")({
  component: SpellsPage,
});

type MissileFrames = Record<"N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW", number | null>;

type Effect = {
  id?: string;
  name: string;
  kind: "missile" | "effect";
  frames: any;
  frame_rate_ms: number;
};

const DIRS8: (keyof MissileFrames)[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

const emptyMissile: Effect = {
  name: "",
  kind: "missile",
  frames: Object.fromEntries(DIRS8.map((d) => [d, null])),
  frame_rate_ms: 120,
};
const emptyEffect: Effect = {
  name: "",
  kind: "effect",
  frames: [],
  frame_rate_ms: 120,
};

function SpellsPage() {
  const [selected, setSelected] = useState<Effect>(emptyEffect);
  const qc = useQueryClient();

  const list = useServerFn(listEffects);
  const upsert = useServerFn(upsertEffect);
  const del = useServerFn(deleteEffect);

  const q = useQuery({ queryKey: ["effects"], queryFn: () => list() });
  const saveMut = useMutation({
    mutationFn: (v: Effect) => upsert({ data: v }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["effects"] });
      setSelected(r.row as any);
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["effects"] });
      setSelected(emptyEffect);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-emerald-400" />
        <h1 className="text-2xl font-bold text-slate-100">Efeitos Mágicos & Projéteis</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="dev-panel flex flex-col p-3">
          <div className="mb-2 flex gap-2">
            <Button
              size="sm"
              onClick={() => setSelected(emptyEffect)}
              variant="outline"
              className="flex-1"
            >
              <Plus className="mr-1 h-4 w-4" /> Effect
            </Button>
            <Button
              size="sm"
              onClick={() => setSelected(emptyMissile)}
              variant="outline"
              className="flex-1"
            >
              <Plus className="mr-1 h-4 w-4" /> Missile
            </Button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {(q.data?.rows ?? []).map((r: any) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r as any)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-800"
                style={{
                  color: selected.id === r.id ? "var(--dev-accent)" : "var(--dev-text)",
                  background: selected.id === r.id ? "var(--dev-surface-2)" : "transparent",
                }}
              >
                <span
                  className="rounded px-1 text-[9px] uppercase"
                  style={{
                    background: r.kind === "missile" ? "#0369a1" : "#065f46",
                    color: "white",
                  }}
                >
                  {r.kind}
                </span>
                <span className="flex-1 truncate">{r.name}</span>
              </button>
            ))}
          </div>
        </div>

        <EffectForm
          key={selected.id ?? selected.kind + "-new"}
          initial={selected}
          saving={saveMut.isPending}
          onSave={(v) => saveMut.mutate(v)}
          onDelete={selected.id ? () => confirm("Excluir?") && delMut.mutate(selected.id!) : undefined}
        />
      </div>
    </div>
  );
}

function EffectForm({
  initial,
  saving,
  onSave,
  onDelete,
}: {
  initial: Effect;
  saving: boolean;
  onSave: (v: Effect) => void;
  onDelete?: () => void;
}) {
  const [v, setV] = useState<Effect>(initial);
  useEffect(() => setV(initial), [initial]);

  return (
    <div className="dev-panel space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-[1fr_180px]">
        <div>
          <label className="mb-1 block text-xs uppercase text-slate-400">Nome</label>
          <Input value={v.name} onChange={(e) => setV((p) => ({ ...p, name: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-slate-400">Frame rate (ms)</label>
          <Input
            type="number"
            value={v.frame_rate_ms}
            onChange={(e) => setV((p) => ({ ...p, frame_rate_ms: Number(e.target.value) }))}
          />
        </div>
      </div>

      <Tabs value={v.kind} onValueChange={(k) => setV((p) => ({
        ...p,
        kind: k as any,
        frames: k === "missile" ? emptyMissile.frames : [],
      }))}>
        <TabsList>
          <TabsTrigger value="missile">Missile (Projétil)</TabsTrigger>
          <TabsTrigger value="effect">Magic Effect (Área)</TabsTrigger>
        </TabsList>

        <TabsContent value="missile" className="pt-4">
          <div className="grid gap-3 md:grid-cols-4">
            {DIRS8.map((d) => (
              <div key={d} className="dev-inset space-y-2 p-3">
                <div className="text-center text-xs font-semibold text-emerald-400">{d}</div>
                <SpritePicker
                  value={(v.frames as MissileFrames)[d] ?? null}
                  onChange={(id) =>
                    setV((p) => ({ ...p, frames: { ...(p.frames as any), [d]: id } }))
                  }
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="effect" className="pt-4">
          <EffectFrames
            frames={Array.isArray(v.frames) ? v.frames : []}
            onChange={(frames) => setV((p) => ({ ...p, frames }))}
            frameRate={v.frame_rate_ms}
          />
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 border-t border-slate-800 pt-4">
        <Button
          onClick={() => onSave(v)}
          disabled={saving || !v.name}
          style={{ background: "var(--dev-accent)", color: "#052e2b" }}
        >
          <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando…" : "Salvar"}
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

function EffectFrames({
  frames,
  onChange,
  frameRate,
}: {
  frames: (number | null)[];
  onChange: (frames: (number | null)[]) => void;
  frameRate: number;
}) {
  const [playIdx, setPlayIdx] = useState(0);
  useEffect(() => {
    if (frames.length === 0) return;
    const t = setInterval(() => setPlayIdx((i) => (i + 1) % frames.length), frameRate);
    return () => clearInterval(t);
  }, [frames.length, frameRate]);

  function add() {
    onChange([...frames, null]);
  }
  function remove(i: number) {
    onChange(frames.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const ni = i + dir;
    if (ni < 0 || ni >= frames.length) return;
    const c = [...frames];
    [c[i], c[ni]] = [c[ni], c[i]];
    onChange(c);
  }
  function set(i: number, id: number | null) {
    const c = [...frames];
    c[i] = id;
    onChange(c);
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_200px]">
      <div className="dev-inset space-y-2 p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase text-slate-400">Timeline</div>
          <Button size="sm" variant="outline" onClick={add}>
            <Plus className="mr-1 h-3 w-3" /> Frame
          </Button>
        </div>
        {frames.length === 0 && (
          <div className="p-4 text-center text-xs text-slate-500">
            Adicione frames à sequência.
          </div>
        )}
        {frames.map((id, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 text-center text-[10px] text-slate-500">{i + 1}</span>
            <div className="flex-1">
              <SpritePicker value={id} onChange={(nid) => set(i, nid)} />
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => move(i, -1)}>
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => move(i, 1)}>
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(i)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="dev-inset flex flex-col items-center gap-2 p-4">
        <div className="text-xs uppercase text-slate-400">Preview</div>
        <div className="dev-panel grid h-24 w-24 place-items-center">
          <SpritePreview spriteId={frames[playIdx] ?? undefined} size={72} />
        </div>
        <div className="text-[10px] text-slate-500">
          {frames.length > 0 ? `frame ${playIdx + 1}/${frames.length}` : "—"}
        </div>
      </div>
    </div>
  );
}
