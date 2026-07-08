import { TopBar } from "./hud/TopBar";
import { GameCanvas } from "./canvas/GameCanvas";
import { EquipmentPanel } from "./panels/EquipmentPanel";
import { InventoryPanel } from "./panels/InventoryPanel";
import { FriendsPanel } from "./panels/FriendsPanel";
import { PartyPanel } from "./panels/PartyPanel";
import { ActionBar } from "./footer/ActionBar";
import { ChatBox } from "./footer/ChatBox";
import { DebugStrip } from "./DebugStrip";
import { useGameStore, type PanelId } from "@/stores/gameStore";

const trayLabels: Record<PanelId, string> = {
  inventory: "Inventory",
  equipment: "Equipment",
  friends: "Friends",
  party: "Party",
};

function ReopenTray() {
  const panels = useGameStore((s) => s.panels);
  const open = useGameStore((s) => s.openPanel);
  const closed = (Object.keys(panels) as PanelId[]).filter((id) => !panels[id].open);
  if (closed.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {closed.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => open(id)}
          className="pixel-text text-[9px] px-2 py-1 rpg-inset hover:brightness-125"
        >
          + {trayLabels[id]}
        </button>
      ))}
    </div>
  );
}

export function GameShell() {
  const panels = useGameStore((s) => s.panels);

  return (
    <div className="h-screen w-screen flex flex-col gap-1.5 p-1.5 overflow-hidden">
      <TopBar />

      <div className="flex-1 min-h-0 flex gap-1.5">
        {/* Main canvas area */}
        <div className="flex-1 min-w-0 relative">
          <GameCanvas />

          {/* Floating social panels */}
          <div className="absolute top-2 left-2 w-64">
            {panels.friends.open && <FriendsPanel />}
          </div>
          <div className="absolute bottom-2 left-2 w-72">
            {panels.party.open && <PartyPanel />}
          </div>
        </div>

        {/* Right column */}
        <aside className="w-64 flex flex-col gap-1.5 shrink-0">
          {panels.equipment.open && <EquipmentPanel />}
          {panels.inventory.open && <InventoryPanel />}
          <div className="mt-auto">
            <ReopenTray />
          </div>
        </aside>
      </div>

      {/* Footer: chat left, action bar right */}
      <div className="flex gap-1.5 items-stretch">
        <div className="w-[420px] h-52 shrink-0">
          <ChatBox />
        </div>
        <div className="flex-1 flex flex-col gap-1.5 justify-end">
          <DebugStrip />
          <ActionBar />
        </div>
      </div>
    </div>
  );
}
