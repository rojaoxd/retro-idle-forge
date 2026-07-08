import { useGameStore } from "@/stores/gameStore";
import { ProgressBar } from "../primitives/ProgressBar";

export function StatBars() {
  const c = useGameStore((s) => s.character);
  return (
    <div className="flex flex-col gap-1 min-w-[220px]">
      <ProgressBar
        value={c.hp}
        max={c.hpMax}
        color="var(--color-hp)"
        dim="var(--color-hp-dim)"
        label={`HP ${c.hp} / ${c.hpMax}`}
      />
      <ProgressBar
        value={c.mp}
        max={c.mpMax}
        color="var(--color-mp)"
        dim="var(--color-mp-dim)"
        label={`MP ${c.mp} / ${c.mpMax}`}
      />
      <ProgressBar
        value={c.xp}
        max={c.xpMax}
        color="var(--color-xp)"
        height={6}
        segments={40}
      />
    </div>
  );
}
