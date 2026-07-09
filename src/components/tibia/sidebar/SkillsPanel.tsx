import { useTibiaStore } from "@/stores/tibiaStore";
import { TibiaWindow } from "../primitives/TibiaWindow";

type TabDef = { id: string; label: string; icon: string; color: string };

const row1: TabDef[] = [
  { id: "skills", label: "Skills", icon: "♥", color: "#40c040" },
  { id: "battle", label: "Battle", icon: "⚔", color: "#c04040" },
  { id: "vip", label: "Vip", icon: "★", color: "#4080ff" },
  { id: "analyzer", label: "Analyz.", icon: "🔍", color: "#c0c0c0" },
];
const row2: TabDef[] = [
  { id: "bestiary", label: "Bestiary", icon: "🐉", color: "#e08040" },
  { id: "stash", label: "Stash", icon: "▣", color: "#a06040" },
  { id: "hotkeys", label: "Hotkeys", icon: "⌨", color: "#c0c0c0" },
];

function Tab({ tab, active, onClick }: { tab: TabDef; active: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1"
      style={{
        fontSize: 10,
        height: 18,
        padding: "0 4px",
        background: active ? "#484848" : "#3a3a3a",
        color: active ? "#fff" : "#a0a0a0",
        boxShadow: active
          ? "inset 1px 1px 0 #000, inset -1px -1px 0 #6a6a6a"
          : "inset 1px 1px 0 #808080, inset -1px -1px 0 #000",
        cursor: "pointer",
      }}
    >
      <span style={{ color: tab.color, fontSize: 9 }}>{tab.icon}</span>
      <span>{tab.label}</span>
    </button>
  );
}

function Row({ icon, iconColor, label, value }: { icon: string; iconColor: string; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-1 px-1" style={{ fontSize: 11, height: 15 }}>
      <span style={{ color: iconColor, width: 12, textAlign: "center", fontSize: 10 }}>{icon}</span>
      <span className="flex-1 text-[#b8b8b8]">{label}</span>
      <span className="text-[#b8b8b8]">{value}</span>
    </div>
  );
}

export function SkillsPanel() {
  const { character, skills, activeSideTab, setSideTab } = useTibiaStore();
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-[2px]">
      <div className="p-[2px] bg-[#2a2a2a] flex flex-col gap-[2px]">
        <div className="grid grid-cols-4 gap-[2px]">
          {row1.map((t) => (
            <Tab key={t.id} tab={t} active={activeSideTab === t.id} onClick={() => setSideTab(t.id as typeof activeSideTab)} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-[2px]">
          {row2.map((t) => (
            <Tab key={t.id} tab={t} active={false} />
          ))}
        </div>
      </div>
      <TibiaWindow title="Skills" icon={<span style={{ color: "#40c040" }}>◆</span>} className="flex-1 min-h-0">
        <div className="tibia-inset m-[2px] py-[2px] flex-1 overflow-auto">
          <Row icon="XP" iconColor="#c0c000" label="Exp." value={character.exp} />
          <Row icon="IV" iconColor="#c0c000" label="Level" value={character.level} />
          <Row icon="♥" iconColor="#c04040" label="Hitpoints" value={character.hp} />
          <Row icon="◆" iconColor="#4080ff" label="Mana" value={character.mana} />
          <Row icon="»" iconColor="#40c040" label="Speed" value={character.speed} />
          <Row icon="⚖" iconColor="#c08040" label="Capacity" value={character.cap} />
          <Row icon="🍗" iconColor="#c08040" label="Food" value={character.food} />
          <Row icon="⏱" iconColor="#40c040" label="Stamina" value={character.stamina} />
          <Row icon="✦" iconColor="#4080ff" label="Magic Level" value={character.magicLevel} />
          <div className="border-t border-[#000] mx-1 my-[2px]" />
          {skills.map((s) => (
            <Row key={s.key} icon="🗡" iconColor="#c0c0c0" label={s.label} value={s.level} />
          ))}
        </div>
      </TibiaWindow>
    </div>
  );
}
