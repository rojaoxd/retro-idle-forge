import { create } from "zustand";

export type ChatChannel = "default" | "serverLog";
export type ChatMsgType = "system" | "info" | "say" | "login";

export type ChatMsg = {
  id: string;
  channel: ChatChannel;
  ts: string; // "HH:MM"
  type: ChatMsgType;
  text: string;
  author?: string;
};

export type EquipSlot =
  | "head"
  | "amulet"
  | "backpack"
  | "weapon"
  | "armor"
  | "shield"
  | "ring"
  | "ammo"
  | "legs"
  | "boots";

export type Skill = {
  key: string;
  label: string;
  level: number;
  pct: number; // 0..100
};

type State = {
  character: {
    name: string;
    level: number;
    exp: number;
    hp: number;
    hpMax: number;
    mana: number;
    manaMax: number;
    cap: number;
    capMax: number;
    speed: number;
    food: string;
    stamina: string;
    magicLevel: number;
  };
  server: { fps: number; latency: number; title: string };
  equipment: Partial<Record<EquipSlot, { name: string; icon: string } | null>>;
  skills: Skill[];
  activeSideTab: "skills" | "battle" | "vip" | "analyzer";
  activeChat: ChatChannel;
  chatOn: boolean;
  chat: ChatMsg[];
  setSideTab: (t: State["activeSideTab"]) => void;
  setChat: (c: ChatChannel) => void;
  toggleChat: () => void;
  sendChat: (text: string) => void;
  setFps: (fps: number) => void;
  setLatency: (ms: number) => void;
};

const now = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const useTibiaStore = create<State>((set) => ({
  character: {
    name: "Morgado",
    level: 1,
    exp: 0,
    hp: 150,
    hpMax: 150,
    mana: 0,
    manaMax: 0,
    cap: 336,
    capMax: 336,
    speed: 220,
    food: "0:00",
    stamina: "42:00",
    magicLevel: 0,
  },
  server: { fps: 60, latency: 77, title: "Mythera 7.4" },
  equipment: {
    head: null,
    amulet: null,
    backpack: null,
    weapon: null,
    armor: null,
    shield: null,
    ring: null,
    ammo: null,
    legs: null,
    boots: null,
  },
  skills: [
    { key: "fist", label: "Fist Fighting", level: 10, pct: 0 },
    { key: "club", label: "Club Fighting", level: 10, pct: 0 },
    { key: "sword", label: "Sword Fighting", level: 10, pct: 0 },
    { key: "axe", label: "Axe Fighting", level: 10, pct: 0 },
    { key: "distance", label: "Distance Fighting", level: 10, pct: 0 },
    { key: "shielding", label: "Shielding", level: 10, pct: 0 },
    { key: "fishing", label: "Fishing", level: 10, pct: 0 },
  ],
  activeSideTab: "skills",
  activeChat: "default",
  chatOn: true,
  chat: [
    { id: "1", channel: "serverLog", ts: "01:22", type: "system", text: "We hope you enjoy our game!" },
    { id: "2", channel: "serverLog", ts: "01:22", type: "info", text: "Website: https://mythera74.com" },
    { id: "3", channel: "serverLog", ts: "01:22", type: "info", text: "Discord: https://discord.gg/D776cgpby3" },
    { id: "4", channel: "serverLog", ts: "01:22", type: "info", text: "Wiki: https://mythera74.gitbook.io/mythera74" },
  ],
  setSideTab: (t) => set({ activeSideTab: t }),
  setChat: (c) => set({ activeChat: c }),
  toggleChat: () => set((s) => ({ chatOn: !s.chatOn })),
  sendChat: (text) =>
    set((s) => ({
      chat: [
        ...s.chat,
        {
          id: `m-${Date.now()}`,
          channel: s.activeChat,
          ts: now(),
          type: "say",
          author: s.character.name,
          text,
        },
      ],
    })),
}));
