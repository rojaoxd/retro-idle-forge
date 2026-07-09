import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getServerStatus,
  setServerStatus,
  getOnlinePlayers,
  getRecentLogs,
  getDashboardStats,
} from "@/lib/dev/server.functions";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Users,
  Server,
  Package,
  Skull,
  Map as MapIcon,
  Sparkles,
  Pause,
  Play,
  Trash2,
} from "lucide-react";

type LogRow = {
  id: string;
  created_at: string;
  level: "info" | "warn" | "error" | "debug";
  source: string;
  message: string;
  meta: any;
};

const LEVEL_COLOR: Record<LogRow["level"], string> = {
  info: "#cbd5e1",
  warn: "#fbbf24",
  error: "#f87171",
  debug: "#64748b",
};

export function OverviewPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Overview & Controle</h1>
          <p className="text-sm text-slate-400">
            Painel principal do servidor · realtime · database-driven
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="grid h-2 w-2 place-items-center rounded-full bg-emerald-500 shadow-[0_0_10px] shadow-emerald-500" />
          Console conectado
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ServerStatusCard />
        <OnlinePlayersCard />
        <QuickStatsCard />
      </div>

      <LiveLogsTerminal />
    </div>
  );
}

function ServerStatusCard() {
  const qc = useQueryClient();
  const getFn = useServerFn(getServerStatus);
  const setFn = useServerFn(setServerStatus);

  const q = useQuery({ queryKey: ["server-config"], queryFn: () => getFn() });
  const mut = useMutation({
    mutationFn: (status: "online" | "maintenance") => setFn({ data: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["server-config"] }),
  });

  useEffect(() => {
    const ch = supabase
      .channel("server_configs_watch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "server_configs" },
        () => qc.invalidateQueries({ queryKey: ["server-config"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const status = q.data?.config?.status ?? "online";
  const online = status === "online";

  return (
    <div className="dev-panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-emerald-400" />
          <span className="text-[11px] uppercase tracking-widest text-slate-400">
            Status do Servidor
          </span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            background: online ? "rgba(16,185,129,0.15)" : "rgba(251,191,36,0.15)",
            color: online ? "#34d399" : "#fbbf24",
          }}
        >
          {online ? "● Online" : "◐ Manutenção"}
        </span>
      </div>

      <div className="mb-4 flex items-baseline gap-3">
        <div
          className="text-3xl font-bold"
          style={{ color: online ? "#34d399" : "#fbbf24" }}
        >
          {online ? "ONLINE" : "MAINTENANCE"}
        </div>
      </div>

      <div className="dev-inset flex items-center justify-between p-3">
        <div>
          <div className="text-sm text-slate-200">Modo de manutenção</div>
          <div className="text-xs text-slate-500">
            Desativa o login dos jogadores
          </div>
        </div>
        <Switch
          checked={!online}
          disabled={mut.isPending || q.isLoading}
          onCheckedChange={(v) => mut.mutate(v ? "maintenance" : "online")}
        />
      </div>
    </div>
  );
}

function OnlinePlayersCard() {
  const qc = useQueryClient();
  const getFn = useServerFn(getOnlinePlayers);
  const q = useQuery({
    queryKey: ["online-players"],
    queryFn: () => getFn(),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("online_players_watch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "online_players" },
        () => qc.invalidateQueries({ queryKey: ["online-players"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const count = q.data?.count ?? 0;
  const rows = q.data?.rows ?? [];

  return (
    <div className="dev-panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-sky-400" />
          <span className="text-[11px] uppercase tracking-widest text-slate-400">
            Jogadores Online
          </span>
        </div>
        <Activity className="h-3 w-3 animate-pulse text-sky-400" />
      </div>

      <div className="mb-4">
        <div className="text-4xl font-bold text-sky-300">{count}</div>
        <div className="text-xs text-slate-500">conectados nos últimos 30s</div>
      </div>

      <div className="dev-inset max-h-32 overflow-y-auto p-2 text-xs">
        {rows.length === 0 ? (
          <div className="p-2 text-center text-slate-600">— sem jogadores online —</div>
        ) : (
          rows.map((r: any) => (
            <div
              key={r.id}
              className="flex items-center justify-between border-b border-slate-800/60 px-1 py-1 last:border-b-0"
            >
              <span className="text-slate-200">{r.character_name}</span>
              <span className="font-mono text-[10px] text-slate-500">
                ({r.x}, {r.y})
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function QuickStatsCard() {
  const getFn = useServerFn(getDashboardStats);
  const q = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => getFn() });

  const stats = [
    { label: "Itens", value: q.data?.items ?? 0, icon: Package, color: "#f59e0b" },
    { label: "Monstros", value: q.data?.monsters ?? 0, icon: Skull, color: "#ef4444" },
    { label: "Tiles", value: q.data?.tiles ?? 0, icon: MapIcon, color: "#10b981" },
    { label: "Magias", value: q.data?.spells ?? 0, icon: Sparkles, color: "#a855f7" },
  ];

  return (
    <div className="dev-panel p-5">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-amber-400" />
        <span className="text-[11px] uppercase tracking-widest text-slate-400">
          Estatísticas do Mundo
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="dev-inset flex items-center gap-3 p-3">
            <s.icon className="h-5 w-5" style={{ color: s.color }} />
            <div>
              <div className="text-lg font-bold text-slate-100">{s.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveLogsTerminal() {
  const getFn = useServerFn(getRecentLogs);
  const [paused, setPaused] = useState(false);
  const [levelFilter, setLevelFilter] = useState<LogRow["level"] | "all">("all");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const q = useQuery({
    queryKey: ["server-logs-initial"],
    queryFn: () => getFn({ data: { limit: 200 } }),
  });

  useEffect(() => {
    if (q.data?.rows) setLogs(q.data.rows as LogRow[]);
  }, [q.data]);

  useEffect(() => {
    const ch = supabase
      .channel("server_logs_watch")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "server_logs" },
        (payload) => {
          if (paused) return;
          setLogs((prev) => {
            const next = [...prev, payload.new as LogRow];
            return next.slice(-500);
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [paused]);

  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, paused]);

  const filtered = levelFilter === "all" ? logs : logs.filter((l) => l.level === levelFilter);

  return (
    <div className="dev-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="h-3 w-3 rounded-full bg-red-500/60" />
            <span className="h-3 w-3 rounded-full bg-amber-500/60" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/60" />
          </div>
          <span className="ml-3 text-xs font-mono text-slate-400">
            server_logs — live tail
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(["all", "info", "warn", "error", "debug"] as const).map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => setLevelFilter(lv)}
              className="rounded px-2 py-0.5 text-[10px] uppercase tracking-wider transition"
              style={{
                background:
                  levelFilter === lv ? "var(--dev-surface-2)" : "transparent",
                color: levelFilter === lv ? "var(--dev-accent)" : "var(--dev-text-dim)",
              }}
            >
              {lv}
            </button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPaused((p) => !p)}
            className="h-7 text-xs"
          >
            {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            <span className="ml-1">{paused ? "Retomar" : "Pausar"}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setLogs([])}
            className="h-7 text-xs"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="h-[380px] overflow-y-auto p-3 font-mono text-[11px] leading-relaxed"
        style={{ background: "#000", color: "#cbd5e1" }}
      >
        {filtered.length === 0 ? (
          <div className="grid h-full place-items-center text-slate-700">
            aguardando eventos do servidor…
          </div>
        ) : (
          filtered.map((l) => (
            <div key={l.id} className="flex gap-3 py-0.5">
              <span className="shrink-0 text-slate-600">
                {new Date(l.created_at).toLocaleTimeString("pt-BR", { hour12: false })}
              </span>
              <span
                className="shrink-0 uppercase"
                style={{ color: LEVEL_COLOR[l.level], width: 44 }}
              >
                {l.level}
              </span>
              <span className="shrink-0 text-slate-500">[{l.source}]</span>
              <span className="min-w-0 break-words" style={{ color: LEVEL_COLOR[l.level] }}>
                {l.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
