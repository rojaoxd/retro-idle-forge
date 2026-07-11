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
  Palette,
  Code2,
  MessagesSquare,
  Boxes,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type Item = { to: string; label: string; icon: any };
type Group = { title: string; items: Item[] };

const groups: Group[] = [
  {
    title: "Painel",
    items: [{ to: "/dev/overview", label: "Overview", icon: LayoutDashboard }],
  },
  {
    title: "Mundo",
    items: [
      { to: "/dev/map", label: "Editor de Mapa (RME)", icon: Map },
      { to: "/dev/palettes", label: "Paletas de Criação", icon: Palette },
    ],
  },
  {
    title: "Objetos",
    items: [
      { to: "/dev/sprites", label: "Sprites", icon: Image },
      { to: "/dev/objects", label: "Object Builder", icon: Boxes },
      { to: "/dev/items", label: "Itens (legado)", icon: Package },
      { to: "/dev/monsters", label: "Monstros", icon: Skull },
    ],
  },
  {
    title: "Gameplay",
    items: [
      { to: "/dev/vocations", label: "Vocações & Magias", icon: Wand2 },
      { to: "/dev/npcs", label: "NPCs & Quests", icon: MessagesSquare },
      { to: "/dev/scripts", label: "Actions & Movements", icon: Code2 },
      { to: "/dev/spells", label: "Efeitos Visuais", icon: Sparkles },
    ],
  },
  {
    title: "Sistema",
    items: [{ to: "/dev/config", label: "Config Global", icon: Settings }],
  },
];

export function DevSidebar({ email }: { email?: string | null }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside
      className="flex h-screen w-64 shrink-0 flex-col border-r"
      style={{ background: "var(--dev-surface)", borderColor: "var(--dev-border)" }}
    >
      <div
        className="flex h-14 items-center gap-2 border-b px-4"
        style={{ borderColor: "var(--dev-border)" }}
      >
        <div className="grid h-8 w-8 place-items-center rounded"
          style={{ background: "var(--dev-accent)", color: "#052e2b" }}>
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold" style={{ color: "var(--dev-text)" }}>
            Engine Console
          </span>
          <span className="text-[10px] uppercase tracking-widest"
            style={{ color: "var(--dev-text-dim)" }}>
            MMORPG · Admin
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-3">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--dev-text-dim)" }}>
              {g.title}
            </div>
            <div className="space-y-1">
              {g.items.map((it) => {
                const active = pathname.startsWith(it.to);
                return (
                  <Link key={it.to} to={it.to}
                    className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors")}
                    style={{
                      background: active ? "var(--dev-surface-2)" : "transparent",
                      color: active ? "var(--dev-text)" : "var(--dev-text-dim)",
                      borderLeft: active ? "2px solid var(--dev-accent)" : "2px solid transparent",
                    }}>
                    <it.icon className="h-4 w-4" />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t p-3 text-xs"
        style={{ borderColor: "var(--dev-border)", color: "var(--dev-text-dim)" }}>
        <div className="truncate">{email ?? "—"}</div>
        <button type="button"
          onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
          className="mt-2 flex items-center gap-2 text-xs hover:underline"
          style={{ color: "var(--dev-accent-2)" }}>
          <LogOut className="h-3 w-3" /> Sair
        </button>
      </div>
    </aside>
  );
}
