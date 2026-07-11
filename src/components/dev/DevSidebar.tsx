import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type Item = { to: string; label: string; icon: any };
type Group = { title: string; items: Item[] };

/**
 * Sidebar do painel /dev após o reset.
 * Depois que a fase §5 do plano cabear o /dev ao canal admin do game-server
 * (players online, broadcast, kick, tail de logs), novos grupos entram aqui.
 */
const groups: Group[] = [
  {
    title: "Painel",
    items: [{ to: "/dev/overview", label: "Overview", icon: LayoutDashboard }],
  },
];

export function DevSidebar({ email }: { email: string | null }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="dev-panel w-60 shrink-0 border-r border-slate-800/60 flex flex-col">
      <div className="border-b border-slate-800/60 p-4">
        <div className="text-sm font-semibold text-slate-100">Engine Console</div>
        <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
          {email ?? "—"}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="mb-1 px-2 text-[10px] uppercase tracking-widest text-slate-500">
              {g.title}
            </div>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = pathname === it.to || pathname.startsWith(it.to + "/");
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      className={cn(
                        "flex items-center gap-2 rounded px-2 py-1.5 text-xs transition",
                        active
                          ? "bg-slate-800 text-slate-100"
                          : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200",
                      )}
                    >
                      <it.icon className="h-3.5 w-3.5" />
                      <span>{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="flex items-center gap-2 border-t border-slate-800/60 px-4 py-3 text-xs text-slate-400 hover:text-slate-200"
      >
        <LogOut className="h-3.5 w-3.5" /> Sair
      </button>
    </aside>
  );
}
