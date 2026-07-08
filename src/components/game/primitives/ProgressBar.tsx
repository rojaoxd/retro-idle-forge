import { type CSSProperties } from "react";

type Props = {
  value: number;
  max: number;
  color: string; // css color var
  dim?: string;
  label?: string;
  height?: number;
  segments?: number;
};

export function ProgressBar({ value, max, color, dim, label, height = 14, segments = 20 }: Props) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const style: CSSProperties = {
    height,
    background: dim ?? "var(--color-panel-inset)",
  };
  return (
    <div className="relative w-full rpg-inset overflow-hidden" style={style}>
      <div
        className="h-full transition-[width] duration-300 ease-out"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(180deg, ${color} 0%, color-mix(in oklab, ${color} 60%, black) 100%)`,
        }}
      />
      {/* segment ticks */}
      <div
        className="pointer-events-none absolute inset-0 flex"
        aria-hidden
      >
        {Array.from({ length: segments - 1 }).map((_, i) => (
          <div
            key={i}
            className="h-full border-r"
            style={{ width: `${100 / segments}%`, borderColor: "oklch(0 0 0 / 0.35)" }}
          />
        ))}
      </div>
      {label && (
        <div className="absolute inset-0 flex items-center justify-center pixel-text text-[9px] text-foreground">
          {label}
        </div>
      )}
    </div>
  );
}
