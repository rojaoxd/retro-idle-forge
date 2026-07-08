import { useGameStore } from "@/stores/gameStore";

// Dev-only reactivity demo. Remove when real game loop is wired.
export function DebugStrip() {
  const takeDamage = useGameStore((s) => s.takeDamage);
  const heal = useGameStore((s) => s.heal);
  const spendMana = useGameStore((s) => s.spendMana);
  const regenMana = useGameStore((s) => s.regenMana);
  const addGold = useGameStore((s) => s.addGold);
  const addPremium = useGameStore((s) => s.addPremium);
  const trigger = useGameStore((s) => s.triggerCooldown);

  const btn =
    "pixel-text text-[9px] px-2 py-1 rpg-inset hover:brightness-125 active:translate-y-px";

  return (
    <div className="rpg-bevel bg-panel px-2 py-1 flex items-center gap-1 flex-wrap">
      <span className="pixel-text text-[9px] text-muted-foreground mr-1">
        DEBUG
      </span>
      <button className={btn} onClick={() => takeDamage(15)}>-15 HP</button>
      <button className={btn} onClick={() => heal(20)}>+20 HP</button>
      <button className={btn} onClick={() => spendMana(10)}>-10 MP</button>
      <button className={btn} onClick={() => regenMana(15)}>+15 MP</button>
      <button className={btn} onClick={() => addGold(100)}>+100 Gold</button>
      <button className={btn} onClick={() => addGold(-50)}>-50 Gold</button>
      <button className={btn} onClick={() => addPremium(1)}>+1 💎</button>
      <button className={btn} onClick={() => trigger(0, 5000)}>CD Slot 1</button>
    </div>
  );
}
