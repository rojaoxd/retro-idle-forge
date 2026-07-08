import { useGameStore } from "@/stores/gameStore";

export function CurrencyDisplay() {
  const r = useGameStore((s) => s.resources);
  return (
    <div className="flex items-center gap-2">
      <div className="rpg-inset px-3 py-1.5 flex items-center gap-2">
        <span className="text-xl">🪙</span>
        <span className="pixel-text text-[10px] text-gold">
          {r.gold.toLocaleString()}
        </span>
      </div>
      <div className="rpg-inset px-3 py-1.5 flex items-center gap-2">
        <span className="text-xl">💎</span>
        <span className="pixel-text text-[10px] text-premium">
          {r.premium.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
