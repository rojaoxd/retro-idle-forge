import { GameViewport } from "./GameViewport";
import { Minimap } from "./sidebar/Minimap";
import { VitalsBars } from "./sidebar/VitalsBars";
import { QuickInventory } from "./sidebar/QuickInventory";
import { StoreVipRow } from "./sidebar/StoreVipRow";
import { SkillsPanel } from "./sidebar/SkillsPanel";
import { ChatDock } from "./chat/ChatDock";

export function TibiaShell() {
  return (
    <div
      className="h-screen w-screen flex bg-black text-[color:var(--tibia-text)] overflow-hidden"
      style={{ fontFamily: "Verdana, Tahoma, sans-serif", fontSize: 11 }}
    >
      {/* Main area (canvas + chat below) */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 min-h-0 bg-black">
          <GameViewport />
        </div>
        <div className="h-52 shrink-0 border-t border-[color:var(--tibia-border-dark)]">
          <ChatDock />
        </div>
      </div>

      {/* Right sidebar */}
      <aside className="w-[188px] shrink-0 bg-black flex flex-col gap-[2px] border-l border-[color:var(--tibia-border-dark)]">
        <Minimap />
        <VitalsBars />
        <QuickInventory />
        <StoreVipRow />
        <SkillsPanel />
      </aside>
    </div>
  );
}
