import { useTibiaStore, type EquipSlot } from "@/stores/tibiaStore";

const slotIcons: Record<EquipSlot, string> = {
  head: "⛑",
  amulet: "📿",
  backpack: "🎒",
  weapon: "⚔",
  armor: "🛡",
  shield: "🛡",
  ring: "💍",
  ammo: "🏹",
  legs: "👖",
  boots: "🥾",
};

function Slot({ slot }: { slot: EquipSlot | null }) {
  return (
    <div
      className="tibia-inset flex items-center justify-center"
      style={{ width: 34, height: 34 }}
    >
      {slot && (
        <span className="opacity-25" style={{ fontSize: 16 }}>
          {slotIcons[slot]}
        </span>
      )}
    </div>
  );
}

function AuxBtn({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <button
      className="tibia-btn flex items-center justify-center"
      style={{ width: 22, height: 18, fontSize: 10 }}
      title={label}
    >
      {children}
    </button>
  );
}

export function QuickInventory() {
  const { character } = useTibiaStore();

  // Tibia 7.4 classic layout:
  // row1: [empty] [head] [amulet] | aux column
  // row2: [weapon] [armor] [shield]
  // row3: [ring] [legs] [ammo]  (approx)
  // row4: [empty] [boots] [backpack]
  const grid: (EquipSlot | null)[] = [
    null, "amulet", null,
    "head", "backpack", null,
    "weapon", "armor", "shield",
    "ring", "legs", "ammo",
    null, "boots", null,
  ];

  return (
    <div className="tibia-bevel bg-[color:var(--tibia-panel)] p-1 flex gap-1">
      <div className="grid grid-cols-3 gap-[2px]">
        {grid.map((s, i) => (
          <Slot key={i} slot={s} />
        ))}
      </div>
      <div className="flex flex-col gap-[2px] flex-1">
        <div className="grid grid-cols-2 gap-[2px]">
          <AuxBtn label="Stop attack">✖</AuxBtn>
          <AuxBtn label="Follow">👣</AuxBtn>
          <AuxBtn label="Stand">■</AuxBtn>
          <AuxBtn label="Chase">➤</AuxBtn>
          <AuxBtn label="Defensive">🛡</AuxBtn>
          <AuxBtn label="Balanced">⚖</AuxBtn>
          <AuxBtn label="Offensive">⚔</AuxBtn>
          <AuxBtn label="PvP">☠</AuxBtn>
        </div>
        <button className="tibia-btn text-[10px] py-[1px]">Quests</button>
        <button className="tibia-btn text-[10px] py-[1px]">Options</button>
        <button className="tibia-btn text-[10px] py-[1px]">Logout</button>
        <div className="mt-auto text-[10px] text-[color:var(--tibia-text)] leading-tight">
          <div>Cap:</div>
          <div>{character.cap}</div>
        </div>
      </div>
    </div>
  );
}
