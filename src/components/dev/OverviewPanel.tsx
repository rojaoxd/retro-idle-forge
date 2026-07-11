import { Server, Activity, Database } from "lucide-react";

/**
 * Overview provisório após o reset. As fontes de dados reais (ping do EC2,
 * jogadores online no engine, tail de server_logs) chegam junto com a fase §5
 * do plano — quando a nova /dev for cabeada ao canal admin do game-server.
 */
export function OverviewPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Overview</h1>
        <p className="text-sm text-slate-400">
          Painel principal · será cabeado ao game-server (Tibia74-JS-Engine) na próxima fase.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PlaceholderCard
          icon={<Server className="h-4 w-4 text-emerald-400" />}
          label="Status do servidor"
          value="—"
          hint="ping /health do EC2"
        />
        <PlaceholderCard
          icon={<Activity className="h-4 w-4 text-sky-400" />}
          label="Jogadores online"
          value="—"
          hint="canal admin do engine"
        />
        <PlaceholderCard
          icon={<Database className="h-4 w-4 text-amber-400" />}
          label="Personagens no banco"
          value="—"
          hint="Supabase: characters"
        />
      </div>

      <div className="dev-panel p-6 text-sm text-slate-400">
        <p className="mb-2 font-semibold text-slate-200">Próximos passos</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Fase §3: subir <code>game-server/</code> no EC2 (engine fork + adapters Supabase)</li>
          <li>Fase §4: portar renderer Canvas 2D do engine para o cliente React</li>
          <li>Fase §5: reconectar esta /dev ao canal admin do engine (online, kick, broadcast, logs)</li>
        </ul>
      </div>
    </div>
  );
}

function PlaceholderCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="dev-panel p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <span className="text-[11px] uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      <div className="text-3xl font-bold text-slate-300">{value}</div>
      <div className="mt-2 text-[10px] uppercase tracking-wider text-slate-600">{hint}</div>
    </div>
  );
}
