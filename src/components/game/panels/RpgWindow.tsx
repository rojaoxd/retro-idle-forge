import { type ReactNode } from "react";
import { Minus, X, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGameStore, type PanelId } from "@/stores/gameStore";

type Props = {
  id?: PanelId;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  headerActions?: ReactNode;
  onClose?: () => void;
  onMinimize?: () => void;
  minimized?: boolean;
};

export function RpgWindow({
  id,
  title,
  icon,
  children,
  className,
  headerActions,
  onClose,
  onMinimize,
  minimized,
}: Props) {
  const panels = useGameStore((s) => s.panels);
  const togglePanel = useGameStore((s) => s.togglePanel);
  const minimizePanel = useGameStore((s) => s.minimizePanel);

  const state = id ? panels[id] : undefined;
  const isMinimized = minimized ?? state?.minimized ?? false;

  const handleMinimize = onMinimize ?? (id ? () => minimizePanel(id) : undefined);
  const handleClose = onClose ?? (id ? () => togglePanel(id) : undefined);

  return (
    <section
      className={cn(
        "rpg-bevel bg-panel text-foreground flex flex-col",
        className,
      )}
    >
      <header
        className="flex items-center justify-between gap-2 px-2 py-1.5"
        style={{
          background:
            "linear-gradient(180deg, var(--color-panel-header) 0%, color-mix(in oklab, var(--color-panel-header) 70%, black) 100%)",
          borderBottom: "1px solid var(--color-panel-border-dark)",
          boxShadow: "inset 0 1px 0 0 oklch(1 0 0 / 0.08)",
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {icon && <span className="text-primary shrink-0">{icon}</span>}
          <h2 className="pixel-text text-[10px] text-primary truncate">{title}</h2>
        </div>
        <div className="flex items-center gap-1">
          {headerActions}
          {handleMinimize && (
            <button
              type="button"
              onClick={handleMinimize}
              className="w-5 h-5 grid place-items-center rpg-inset hover:brightness-125"
              aria-label="Minimize"
            >
              {isMinimized ? <Square size={10} /> : <Minus size={10} />}
            </button>
          )}
          {handleClose && (
            <button
              type="button"
              onClick={handleClose}
              className="w-5 h-5 grid place-items-center rpg-inset hover:brightness-125 text-destructive"
              aria-label="Close"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </header>
      {!isMinimized && <div className="flex-1 min-h-0 overflow-hidden">{children}</div>}
    </section>
  );
}
