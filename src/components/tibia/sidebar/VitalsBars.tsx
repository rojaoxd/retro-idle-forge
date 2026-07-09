import { useTibiaStore } from "@/stores/tibiaStore";

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="tibia-inset relative h-[12px] w-full">
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
      <Bar value={character.hp} max={character.hpMax} color="#c00000" label={character.hp} />
      <Bar value={character.mana} max={Math.max(character.manaMax, 1)} color="#0000c8" label={character.mana} />
    </div>
  );
}
