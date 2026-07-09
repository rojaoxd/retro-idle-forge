import { useTibiaStore } from "@/stores/tibiaStore";

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="tibia-inset relative h-[13px] flex-1">
      <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      <div
        className="absolute inset-0 flex items-center justify-end pr-1 text-white font-bold"
        style={{ fontSize: 10, textShadow: "1px 1px 0 #000" }}
      >
        {label}
      </div>
    </div>
  );
}

export function VitalsBars() {
  const { character } = useTibiaStore();
  return (
    <div className="tibia-bevel p-[3px] flex flex-col gap-[2px]">
      <div className="flex items-center gap-1">
        <div
          className="shrink-0"
          style={{ width: 12, height: 12, background: "var(--tibia-hp)", boxShadow: "inset -1px -1px 0 #000, inset 1px 1px 0 #f08080" }}
        />
        <Bar value={character.hp} max={character.hpMax} color="var(--tibia-hp)" label={character.hp} />
      </div>
      <div className="flex items-center gap-1">
        <div
          className="shrink-0"
          style={{ width: 12, height: 12, background: "var(--tibia-mp)", boxShadow: "inset -1px -1px 0 #000, inset 1px 1px 0 #8090f0" }}
        />
        <Bar value={character.mana} max={Math.max(character.manaMax, 1)} color="var(--tibia-mp)" label={character.mana} />
      </div>
    </div>
  );
}

