import { useEffect, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { cn } from "@/lib/utils";

const slotIcons = ["⚔️", "🏹", "🔥", "❄️", "⚡", "🧪", "🔷", "💚", "🌟", "💀"];
const slotLabels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const defaultCooldown = 5000;

export function ActionBar() {
  const cooldowns = useGameStore((s) => s.cooldowns);
  const trigger = useGameStore((s) => s.triggerCooldown);
  // tick to redraw cooldown overlays
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="rpg-bevel bg-panel p-2 flex items-center justify-center gap-1.5">
      {slotIcons.map((icon, i) => {
        const cd = cooldowns[i];
        const now = Date.now();
        const remaining = cd ? Math.max(0, cd.until - now) : 0;
        const pct = cd && remaining > 0 ? (remaining / cd.duration) * 100 : 0;
        const onCd = remaining > 0;
        return (
          <button
            key={i}
            type="button"
            onClick={() => trigger(i, defaultCooldown)}
            className={cn(
              "relative rpg-inset w-12 h-12 grid place-items-center text-2xl overflow-hidden",
              "hover:brightness-125 active:translate-y-px",
            )}
          >
            <span className={cn("pixelated", onCd && "opacity-40")}>{icon}</span>
            {onCd && (
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `conic-gradient(oklch(0 0 0 / 0.7) ${pct}%, transparent ${pct}%)`,
                }}
              />
            )}
            {onCd && (
              <span className="pixel-text absolute inset-0 grid place-items-center text-[10px] text-foreground">
                {(remaining / 1000).toFixed(1)}
              </span>
            )}
            <span className="pixel-text absolute bottom-0.5 right-1 text-[8px] text-primary">
              {slotLabels[i]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
