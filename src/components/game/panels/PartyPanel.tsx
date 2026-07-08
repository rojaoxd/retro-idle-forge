import { Swords, Crown, UserMinus, XCircle } from "lucide-react";
import { RpgWindow } from "./RpgWindow";
import { useGameStore } from "@/stores/gameStore";
import { ProgressBar } from "../primitives/ProgressBar";

const roleIcon: Record<string, string> = {
  tank: "🛡️",
  healer: "✨",
  dps: "⚔️",
};

export function PartyPanel() {
  const party = useGameStore((s) => s.party);
  const kick = useGameStore((s) => s.kickMember);
  const disband = useGameStore((s) => s.disbandParty);

  return (
    <RpgWindow
      id="party"
      title="Party"
      icon={<Swords size={12} />}
      headerActions={
        <button
          type="button"
          onClick={disband}
          className="pixel-text text-[8px] px-1.5 py-0.5 rpg-inset text-destructive hover:brightness-125 flex items-center gap-1"
          title="Desfazer Party"
        >
          <XCircle size={9} /> Disband
        </button>
      }
    >
      <ul className="p-2 flex flex-col gap-1.5">
        {party.members.map((m) => {
          const isLeader = m.id === party.leaderId;
          const isSelf = m.id === "p-self";
          return (
            <li key={m.id} className="rpg-inset p-2 flex items-center gap-2">
              <div className="w-8 h-8 grid place-items-center text-lg rpg-inset">
                {roleIcon[m.role]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {isLeader && <Crown size={10} className="text-gold" />}
                  <span className="text-sm truncate leading-tight">{m.name}</span>
                  <span className="pixel-text text-[8px] text-primary">Lv{m.level}</span>
                </div>
                <ProgressBar
                  value={m.hpPct}
                  max={100}
                  color="var(--color-hp)"
                  dim="var(--color-hp-dim)"
                  height={6}
                  segments={20}
                />
              </div>
              {!isSelf && (
                <button
                  type="button"
                  onClick={() => kick(m.id)}
                  className="pixel-text text-[8px] px-1.5 py-1 rpg-inset text-destructive hover:brightness-125 flex items-center gap-1"
                  title="Kick"
                >
                  <UserMinus size={9} /> Kick
                </button>
              )}
            </li>
          );
        })}
        {party.members.length <= 1 && (
          <li className="text-center text-xs text-muted-foreground italic py-2">
            No party members. Invite a friend from the roster.
          </li>
        )}
      </ul>
    </RpgWindow>
  );
}
