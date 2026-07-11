import { Minimap } from "./sidebar/Minimap";
import { VitalsBars } from "./sidebar/VitalsBars";
import { QuickInventory } from "./sidebar/QuickInventory";
import { StoreVipRow } from "./sidebar/StoreVipRow";
import { SkillsPanel } from "./sidebar/SkillsPanel";
import { ChatDock } from "./chat/ChatDock";

/**
 * Shell visual estilo Tibia. O canvas central é apenas placeholder — a versão
 * portada do renderer do engine (Canvas 2D lendo Tibia.dat/.spr) entra aqui
 * na fase §4 do plano.
 */
export function TibiaShell() {
  return (
    <div
      className="h-screen w-screen flex bg-black text-[color:var(--tibia-text)] overflow-hidden"
      style={{ fontFamily: "Verdana, Tahoma, sans-serif", fontSize: 11 }}
    >
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 min-h-0 bg-black grid place-items-center text-white/40">
          <div className="text-center space-y-2">
            <div className="text-6xl opacity-30">⚔️</div>
            <p className="text-xs">renderer do engine — em portabilização</p>
          </div>
        </div>
        <div className="h-52 shrink-0 border-t border-[color:var(--tibia-border-dark)]">
          <ChatDock />
        </div>
      </div>

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
