import { useGameStore } from "@/stores/gameStore";

export function CharacterBadge() {
  const c = useGameStore((s) => s.character);
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-14 h-14 rpg-inset grid place-items-center text-3xl"
        style={{ outline: "1px solid var(--color-primary)", outlineOffset: -3 }}
      >
        🧙
      </div>
      <div className="flex flex-col leading-tight">
        <span className="pixel-text text-[10px] text-primary">
          Lv {c.level}
        </span>
        <span className="pixel-text text-[11px] text-foreground">{c.name}</span>
        <span className="text-muted-foreground text-sm italic">{c.title}</span>
      </div>
    </div>
  );
}
