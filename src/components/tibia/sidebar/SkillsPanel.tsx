import { useTibiaStore } from "@/stores/tibiaStore";
import { TibiaWindow } from "../primitives/TibiaWindow";

function Tabs() {
  const { activeSideTab, setSideTab } = useTibiaStore();
  const tabs: { id: typeof activeSideTab; label: string }[] = [
    { id: "skills", label: "Skills" },
    { id: "battle", label: "Battle" },
    { id: "vip", label: "Vip" },
    { id: "analyzer", label: "Analyz." },
  ];
  const row2 = ["Bestiary", "Stash", "Hotkeys"];
  return (
    <div className="flex flex-col gap-[2px]">
      <div className="grid grid-cols-4 gap-[2px]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSideTab(t.id)}
            className={
              "tibia-tab text-[10px] py-[2px] " + (activeSideTab === t.id ? "tibia-tab-active" : "")
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-[2px]">
        {row2.map((t) => (
          <button key={t} className="tibia-tab text-[10px] py-[2px]">
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-1 px-1 py-[1px]" style={{ fontSize: 11 }}>
      <span className="text-[color:var(--tibia-accent-green)] w-3 text-center">{icon}</span>
      <span className="flex-1">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function SkillsPanel() {
  const { character, skills } = useTibiaStore();
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-[2px] bg-black">
      <div className="p-1 bg-[color:var(--tibia-panel)]">
        <Tabs />
      </div>
      <TibiaWindow title="Skills" className="flex-1 min-h-0">
        <div className="tibia-inset m-1 py-1 flex-1 overflow-auto">
          <Row icon="XP" label="Exp." value={character.exp} />
          <Row icon="IV" label="Level" value={character.level} />
          <Row icon="♥" label="Hitpoints" value={character.hp} />
          <Row icon="◆" label="Mana" value={character.mana} />
          <Row icon="»" label="Speed" value={character.speed} />
          <Row icon="⚖" label="Capacity" value={character.cap} />
          <Row icon="🍗" label="Food" value={character.food} />
          <Row icon="⏱" label="Stamina" value={character.stamina} />
          <Row icon="✦" label="Magic Level" value={character.magicLevel} />
          <div className="border-t border-[color:var(--tibia-border-dark)] my-1" />
          {skills.map((s) => (
            <Row key={s.key} icon="🗡" label={s.label} value={s.level} />
          ))}
        </div>
      </TibiaWindow>
    </div>
  );
}
