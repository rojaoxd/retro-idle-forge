import { CharacterBadge } from "./CharacterBadge";
import { StatBars } from "./StatBars";
import { CurrencyDisplay } from "./CurrencyDisplay";
import { StoreButton } from "./StoreButton";

export function TopBar() {
  return (
    <header
      className="rpg-bevel bg-panel px-3 py-2 flex items-center gap-4 flex-wrap"
      style={{ borderRadius: 0 }}
    >
      <CharacterBadge />
      <div className="h-12 w-px bg-panel-border-dark" />
      <StatBars />
      <div className="flex-1" />
      <CurrencyDisplay />
      <StoreButton />
    </header>
  );
}
