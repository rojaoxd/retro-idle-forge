import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Image,
  Package,
  Skull,
  Sparkles,
  Wand2,
  Settings,
  LogOut,
  Map,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { to: "/dev/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/dev/map", label: "Mapa & Spawns", icon: Map },
  { to: "/dev/items", label: "Itens & Equipamentos", icon: Package },
  { to: "/dev/monsters", label: "Criaturas (Monstros)", icon: Skull },
  { to: "/dev/vocations", label: "Vocações & Magias", icon: Wand2 },
  { to: "/dev/sprites", label: "Sprites & Outfits", icon: Image },
  { to: "/dev/spells", label: "Efeitos Visuais", icon: Sparkles },
  { to: "/dev/config", label: "Config Global", icon: Settings },
] as const;

export function DevSidebar({ email }: { email?: string | null }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside
      className="flex h-screen w-60 shrink-0 flex-col border-r"
      style={{ background: "var(--dev-surface)", borderColor: "var(--dev-border)" }}
    >
      <div
        className="flex h-14 items-center gap-2 border-b px-4"
        style={{ borderColor: "var(--dev-border)" }}
      >
        <div
          className="grid h-8 w-8 place-items-center rounded"
          style={{ background: "var(--dev-accent)", color: "#052e2b" }}
        >
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold" style={{ color: "var(--dev-text)" }}>
            Engine Console
          </span>
          <span
            className="text-[10px] uppercase tracking-widest"
            style={{ color: "var(--dev-text-dim)" }}
          >
            MMORPG · Admin
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {items.map((it) => {
          const active = pathname.startsWith(it.to);
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              )}
              style={{
                background: active ? "var(--dev-surface-2)" : "transparent",
                color: active ? "var(--dev-text)" : "var(--dev-text-dim)",
                borderLeft: active
                  ? "2px solid var(--dev-accent)"
                  : "2px solid transparent",
              }}
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div
        className="border-t p-3 text-xs"
        style={{ borderColor: "var(--dev-border)", color: "var(--dev-text-dim)" }}
      >
        <div className="truncate">{email ?? "—"}</div>
        <button
          type="button"
          onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
          className="mt-2 flex items-center gap-2 text-xs hover:underline"
          style={{ color: "var(--dev-accent-2)" }}
        >
          <LogOut className="h-3 w-3" /> Sair
        </button>
      </div>
    </aside>
  );
}
