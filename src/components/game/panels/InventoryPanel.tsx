import { Backpack } from "lucide-react";
import { RpgWindow } from "./RpgWindow";
import { SlotFrame } from "../primitives/SlotFrame";
import { useGameStore } from "@/stores/gameStore";

export function InventoryPanel() {
  const { capacity, slots } = useGameStore((s) => s.inventory);
  const used = slots.filter(Boolean).length;
  const pct = Math.round((used / capacity) * 100);

  return (
    <RpgWindow id="inventory" title="Inventory" icon={<Backpack size={12} />}>
      <div className="p-3 flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-1.5">
          {slots.map((item, i) => (
            <SlotFrame
              key={i}
              size={44}
              rarity={item?.rarity}
              stack={item?.stack}
              title={item?.name}
            >
              {item?.icon}
            </SlotFrame>
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="pixel-text text-[9px] text-muted-foreground">Cap</span>
          <div className="flex-1 h-2 rpg-inset overflow-hidden">
            <div
              className="h-full transition-[width]"
              style={{
                width: `${pct}%`,
                background:
                  pct > 85
                    ? "var(--color-hp)"
                    : "linear-gradient(180deg, var(--color-gold), color-mix(in oklab, var(--color-gold) 60%, black))",
              }}
            />
          </div>
          <span className="pixel-text text-[9px] text-foreground">
            {used}/{capacity}
          </span>
        </div>
      </div>
    </RpgWindow>
  );
}
