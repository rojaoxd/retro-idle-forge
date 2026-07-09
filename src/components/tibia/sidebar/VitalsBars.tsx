import { useTibiaStore } from "@/stores/tibiaStore";

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="tibia-inset relative h-[14px] w-full">
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
    <div className="tibia-bevel p-1 flex flex-col gap-[2px] bg-[color:var(--tibia-panel)]">
      <div className="flex items-center gap-1">
        <div className="w-4 text-center text-[#c03030]">♥</div>
        <Bar value={character.hp} max={character.hpMax} color="var(--tibia-hp)" label={character.hp} />
      </div>
      <div className="flex items-center gap-1">
        <div className="w-4 text-center text-[#3060c0]">◆</div>
        <Bar value={character.mana} max={Math.max(character.manaMax, 1)} color="var(--tibia-mp)" label={character.mana} />
      </div>
    </div>
  );
}
