import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCreatures, upsertCreature, deleteCreature } from "@/lib/dev/creatures.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpritePicker, SpritePreview } from "@/components/dev/SpritePicker";
import { Users, Plus, Trash2, Save, Play } from "lucide-react";

export const Route = createFileRoute("/dev/creatures")({
  component: CreaturesPage,
});

type Dir = "north" | "south" | "east" | "west";
type Frame = "idle" | "step1" | "step2";
const DIRS: [Dir, string][] = [
  ["north", "Norte ↑"],
  ["south", "Sul ↓"],
  ["east", "Leste →"],
  ["west", "Oeste ←"],
];
const FRAMES: Frame[] = ["idle", "step1", "step2"];

type DirFrames = Partial<Record<Frame, number | null>>;
type Animations = Record<Dir, DirFrames>;

type Creature = {
  id?: string;
  look_id: number;
  name: string;
  animations: Animations;
};

const emptyAnim: Animations = {
  north: {},
  south: {},
  east: {},
  west: {},
};

const empty: Creature = { look_id: 0, name: "", animations: emptyAnim };

function CreaturesPage() {
  const [selected, setSelected] = useState<Creature>(empty);
  const qc = useQueryClient();
  const list = useServerFn(listCreatures);
  const upsert = useServerFn(upsertCreature);
  const del = useServerFn(deleteCreature);

  const q = useQuery({ queryKey: ["creatures"], queryFn: () => list() });
  const saveMut = useMutation({
    mutationFn: (v: Creature) => upsert({ data: v }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["creatures"] });
      setSelected(r.row as any);
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creatures"] });
      setSelected(empty);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6 text-emerald-400" />
        <h1 className="text-2xl font-bold text-slate-100">Outfits & Criaturas</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="dev-panel flex flex-col p-3">
          <Button
            size="sm"
            onClick={() => setSelected(empty)}
            className="mb-2"
            style={{ background: "var(--dev-accent)", color: "#052e2b" }}
          >
            <Plus className="mr-2 h-4 w-4" /> Nova criatura
          </Button>
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
                <span className="font-mono text-xs text-slate-500">
                  {String(r.look_id).padStart(4, "0")}
                </span>
                <span className="flex-1 truncate">{r.name}</span>
              </button>
            ))}
          </div>
        </div>

        <CreatureForm
          key={selected.id ?? "new"}
          initial={selected}
          saving={saveMut.isPending}
          onSave={(v) => saveMut.mutate(v)}
          onDelete={selected.id ? () => confirm("Excluir?") && delMut.mutate(selected.id!) : undefined}
        />
      </div>
    </div>
  );
}

function CreatureForm({
  initial,
  saving,
  onSave,
  onDelete,
}: {
  initial: Creature;
  saving: boolean;
  onSave: (v: Creature) => void;
  onDelete?: () => void;
}) {
  const [v, setV] = useState<Creature>({
    ...initial,
    animations: { ...emptyAnim, ...initial.animations },
  });
  useEffect(
    () => setV({ ...initial, animations: { ...emptyAnim, ...initial.animations } }),
    [initial],
  );

  function setDirFrame(dir: Dir, frame: Frame, id: number | null) {
    setV((p) => ({
      ...p,
      animations: { ...p.animations, [dir]: { ...p.animations[dir], [frame]: id } },
    }));
  }

  return (
    <div className="dev-panel space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs uppercase text-slate-400">LookID (único)</label>
          <Input
            type="number"
            value={v.look_id}
            onChange={(e) => setV((p) => ({ ...p, look_id: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-slate-400">Nome</label>
          <Input
            value={v.name}
            onChange={(e) => setV((p) => ({ ...p, name: e.target.value }))}
            placeholder="ex.: Citizen Male"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs uppercase tracking-wider text-emerald-400">
          Matriz de Animação (4 direções × 3 frames)
        </div>
        <div className="dev-inset space-y-2 p-3">
          <div className="grid grid-cols-[100px_repeat(3,1fr)] gap-2 border-b border-slate-800 pb-2 text-xs text-slate-400">
            <div />
            <div className="text-center">Idle (parado)</div>
            <div className="text-center">Passo 1</div>
            <div className="text-center">Passo 2</div>
          </div>
          {DIRS.map(([dir, label]) => (
            <div key={dir} className="grid grid-cols-[100px_repeat(3,1fr)] items-center gap-2">
              <div className="text-xs font-semibold text-slate-300">{label}</div>
              {FRAMES.map((f) => (
                <SpritePicker
                  key={f}
                  value={v.animations[dir]?.[f] ?? null}
                  onChange={(id) => setDirFrame(dir, f, id)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <PreviewPlayer animations={v.animations} />

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

function PreviewPlayer({ animations }: { animations: Animations }) {
  const [dir, setDir] = useState<Dir>("south");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => (v + 1) % 4), 220);
    return () => clearInterval(t);
  }, []);
  const cycle: Frame[] = ["idle", "step1", "idle", "step2"];
  const frame = cycle[tick];
  const spriteId = animations[dir]?.[frame] ?? animations[dir]?.idle ?? null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Play className="h-4 w-4 text-emerald-400" />
        <div className="text-xs uppercase tracking-wider text-emerald-400">Preview em loop</div>
      </div>
      <div className="dev-inset flex items-center gap-4 p-4">
        <div className="dev-panel grid h-24 w-24 place-items-center">
          <SpritePreview spriteId={spriteId ?? undefined} size={72} />
        </div>
        <div className="flex flex-col gap-1">
          {DIRS.map(([d, label]) => (
            <Button
              key={d}
              variant={d === dir ? "default" : "outline"}
              size="sm"
              onClick={() => setDir(d)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="text-xs text-slate-400">
          Frame: <span className="font-mono text-emerald-400">{frame}</span>
        </div>
      </div>
    </div>
  );
}
