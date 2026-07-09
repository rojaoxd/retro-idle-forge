import { useGameStore } from "@/stores/gameStore";

// Locale-independent formatter to avoid SSR/CSR hydration mismatches.
const formatNumber = (n: number) =>
  n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export function CurrencyDisplay() {
  const r = useGameStore((s) => s.resources);
  return (
    <div className="flex items-center gap-2">
      <div className="rpg-inset px-3 py-1.5 flex items-center gap-2">
        <span className="text-xl">🪙</span>
        <span className="pixel-text text-[10px] text-gold">
          {formatNumber(r.gold)}
        </span>
      </div>
      <div className="rpg-inset px-3 py-1.5 flex items-center gap-2">
        <span className="text-xl">💎</span>
        <span className="pixel-text text-[10px] text-premium">
          {formatNumber(r.premium)}
        </span>
      </div>
    </div>
  );
}
