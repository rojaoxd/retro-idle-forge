import { Shirt } from "lucide-react";
import { RpgWindow } from "./RpgWindow";
import { SlotFrame } from "../primitives/SlotFrame";
import { useGameStore, type EquipmentSlot } from "@/stores/gameStore";

const layout: (EquipmentSlot | null)[][] = [
  [null, "head", "amulet"],
  ["weapon", "chest", "shield"],
  [null, "legs", "ring"],
  [null, "boots", null],
];

const slotLabel: Record<EquipmentSlot, string> = {
  head: "Head",
  chest: "Chest",
  legs: "Legs",
  boots: "Boots",
  weapon: "Wpn",
  shield: "Shd",
  amulet: "Amu",
  ring: "Ring",
};

const emptyIcon: Record<EquipmentSlot, string> = {
  head: "⛑️",
  chest: "🎽",
  legs: "👖",
  boots: "🥾",
  weapon: "⚔️",
  shield: "🛡️",
  amulet: "📿",
  ring: "💍",
};

export function EquipmentPanel() {
  const equipment = useGameStore((s) => s.equipment);
  return (
    <RpgWindow id="equipment" title="Equipment" icon={<Shirt size={12} />}>
      <div className="p-3 grid grid-cols-3 gap-2 place-items-center">
        {layout.flat().map((slot, i) => {
          if (!slot) return <div key={i} className="w-11 h-11" />;
          const item = equipment[slot];
          return (
            <SlotFrame
              key={i}
              size={46}
              label={slotLabel[slot]}
              rarity={item?.rarity}
              title={item ? item.name : `Empty ${slotLabel[slot]}`}
            >
              {item ? (
                item.icon
              ) : (
                <span className="opacity-30">{emptyIcon[slot]}</span>
              )}
            </SlotFrame>
          );
        })}
      </div>
    </RpgWindow>
  );
}
