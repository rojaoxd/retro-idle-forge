import { useTibiaStore, type EquipSlot } from "@/stores/tibiaStore";

const slotGlyph: Record<EquipSlot, string> = {
  head: "⛑",
  amulet: "◈",
  backpack: "▤",
  weapon: "⚔",
  armor: "▨",
  shield: "⛨",
  ring: "○",
  ammo: "➵",
  legs: "⊓",
  boots: "⏗",
};

function Slot({ slot }: { slot: EquipSlot | null }) {
  return (
    <div
      className="tibia-inset flex items-center justify-center"
      style={{ width: 32, height: 32 }}
    >
      {slot && (
        <span style={{ fontSize: 16, color: "#3a3a3a" }}>{slotGlyph[slot]}</span>
      )}
    </div>
  );
}

function AuxBtn({
  children,
  color = "#c0c0c0",
  label,
}: {
  children: React.ReactNode;
  color?: string;
  label?: string;
}) {
  return (
    <button
      className="tibia-btn flex items-center justify-center"
      style={{ width: 20, height: 16, fontSize: 10, color }}
      title={label}
    >
      {children}
    </button>
  );
}

export function QuickInventory() {
  const { character } = useTibiaStore();

  const grid: (EquipSlot | null)[] = [
    null, "amulet", null,
    "head", "backpack", null,
    "weapon", "armor", "shield",
    "ring", "legs", "ammo",
    null, "boots", null,
  ];

  return (
    <div className="tibia-bevel p-1 flex gap-1">
      <div className="grid grid-cols-3 gap-[2px]">
        {grid.map((s, i) => (
          <Slot key={i} slot={s} />
        ))}
      </div>
      <div className="flex flex-col gap-[2px] flex-1">
        <div className="grid grid-cols-2 gap-[2px]">
          <AuxBtn label="Stop" color="#ff6060">✖</AuxBtn>
          <AuxBtn label="Follow" color="#40c040">➤</AuxBtn>
          <AuxBtn label="Stand" color="#c0c0c0">■</AuxBtn>
          <AuxBtn label="Chase" color="#c0c0c0">↷</AuxBtn>
          <AuxBtn label="Offensive" color="#ff6060">⚔</AuxBtn>
          <AuxBtn label="Balanced" color="#e0c040">⚖</AuxBtn>
          <AuxBtn label="Defensive" color="#40a0ff">⛨</AuxBtn>
          <AuxBtn label="PvP" color="#ffffff">☠</AuxBtn>
        </div>
        <button className="tibia-btn text-[10px]" style={{ height: 14 }}>Quests</button>
        <button className="tibia-btn text-[10px]" style={{ height: 14 }}>Options</button>
        <button className="tibia-btn text-[10px]" style={{ height: 14 }}>Logout</button>
      </div>
      <div
        className="absolute"
        style={{
          fontSize: 10,
          color: "#b8b8b8",
          lineHeight: 1.1,
        }}
      />
      <div className="text-[10px] text-[#b8b8b8] leading-tight self-end" style={{ position: "absolute", left: 4, marginTop: 96 }}>
        <div>Cap:</div>
        <div>{character.cap}</div>
      </div>
    </div>
  );
}
