import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getConfig, saveConfig } from "@/lib/dev/config.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Settings, Save, Download } from "lucide-react";

export const Route = createFileRoute("/dev/config")({
  component: ConfigPage,
});

type ChatColors = {
  public: string;
  server_error: string;
  guild: string;
  party: string;
  private: string;
  npc: string;
};

type Config = {
  chat: ChatColors;
  name_font_size: number;
  hp_bar_height: number;
  panel_align: "left" | "right";
};

const defaults: Config = {
  chat: {
    public: "#ffff00",
    server_error: "#ff3030",
    guild: "#40ff40",
    party: "#40aaff",
    private: "#ff88ff",
    npc: "#5fffff",
  },
  name_font_size: 12,
  hp_bar_height: 4,
  panel_align: "right",
};

function ConfigPage() {
  const qc = useQueryClient();
  const get = useServerFn(getConfig);
  const save = useServerFn(saveConfig);

  const q = useQuery({ queryKey: ["config"], queryFn: () => get() });
  const [v, setV] = useState<Config>(defaults);

  useEffect(() => {
    if (q.data?.config) {
      setV({ ...defaults, ...(q.data.config as Partial<Config>) } as Config);
    }
  }, [q.data]);

  const saveMut = useMutation({
    mutationFn: (config: Config) => save({ data: { config } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config"] });
    },
  });

  function exportJson() {
    const blob = new Blob([JSON.stringify(v, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "game_config.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const chatFields: [keyof ChatColors, string][] = [
    ["public", "Public Chat"],
    ["server_error", "Server / Erro"],
    ["guild", "Guild"],
    ["party", "Party"],
    ["private", "Private"],
    ["npc", "NPC"],
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-emerald-400" />
        <h1 className="text-2xl font-bold text-slate-100">Configurações Globais</h1>
      </div>

      <div className="dev-panel space-y-6 p-6">
        <section>
          <div className="mb-3 text-xs uppercase tracking-wider text-emerald-400">
            Paleta de Cores do Chat
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {chatFields.map(([k, label]) => (
              <label key={k} className="dev-inset flex items-center gap-3 p-3">
                <input
                  type="color"
                  value={v.chat[k]}
                  onChange={(e) =>
                    setV((p) => ({ ...p, chat: { ...p.chat, [k]: e.target.value } }))
                  }
                  className="h-10 w-14 cursor-pointer rounded border border-slate-700 bg-transparent"
                />
                <div className="flex-1">
                  <div className="text-sm text-slate-200">{label}</div>
                  <div className="font-mono text-xs" style={{ color: v.chat[k] }}>
                    {v.chat[k]}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 text-xs uppercase tracking-wider text-emerald-400">
            Fontes & UI
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="dev-inset space-y-3 p-4">
              <div className="flex justify-between text-sm text-slate-300">
                <span>Nome flutuante — font size</span>
                <span className="font-mono text-emerald-400">{v.name_font_size}px</span>
              </div>
              <Slider
                min={8}
                max={24}
                step={1}
                value={[v.name_font_size]}
                onValueChange={([n]) => setV((p) => ({ ...p, name_font_size: n }))}
              />
            </div>

            <div className="dev-inset space-y-3 p-4">
              <div className="flex justify-between text-sm text-slate-300">
                <span>HP/MP bar — altura</span>
                <span className="font-mono text-emerald-400">{v.hp_bar_height}px</span>
              </div>
              <Slider
                min={2}
                max={12}
                step={1}
                value={[v.hp_bar_height]}
                onValueChange={([n]) => setV((p) => ({ ...p, hp_bar_height: n }))}
              />
            </div>

            <div className="dev-inset space-y-2 p-4 md:col-span-2">
              <div className="text-sm text-slate-300">Alinhamento dos painéis laterais</div>
              <div className="flex gap-2">
                {(["left", "right"] as const).map((a) => (
                  <Button
                    key={a}
                    variant={v.panel_align === a ? "default" : "outline"}
                    onClick={() => setV((p) => ({ ...p, panel_align: a }))}
                    style={
                      v.panel_align === a
                        ? { background: "var(--dev-accent)", color: "#052e2b" }
                        : undefined
                    }
                  >
                    {a === "left" ? "Esquerda" : "Direita"}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-2 text-xs uppercase tracking-wider text-emerald-400">
            JSON gerado
          </div>
          <pre className="dev-inset max-h-64 overflow-auto p-3 text-xs text-slate-300">
{JSON.stringify(v, null, 2)}
          </pre>
        </section>

        <div className="flex gap-2 border-t border-slate-800 pt-4">
          <Button
            onClick={() => saveMut.mutate(v)}
            disabled={saveMut.isPending}
            style={{ background: "var(--dev-accent)", color: "#052e2b" }}
          >
            <Save className="mr-2 h-4 w-4" />
            {saveMut.isPending ? "Salvando…" : "Salvar no banco"}
          </Button>
          <Button variant="outline" onClick={exportJson}>
            <Download className="mr-2 h-4 w-4" /> Exportar JSON
          </Button>
          {saveMut.isSuccess && (
            <span className="self-center text-xs text-emerald-400">✔ Salvo</span>
          )}
        </div>
      </div>
    </div>
  );
}
