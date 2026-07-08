import { create } from "zustand";

// TODO(supabase): subscribe to character/inventory/party rows for live updates.
// TODO(ws): pipe chat messages via WebSocket channel per tab.

export type ChatTab = "server" | "local" | "party" | "trade";

export type ChatMessage = {
  id: string;
  tab: ChatTab;
  author: string;
  text: string;
  ts: number;
};

export type Item = {
  id: string;
  name: string;
  icon: string; // emoji placeholder
  rarity?: "common" | "uncommon" | "rare" | "epic" | "legendary";
  stack?: number;
};

export type EquipmentSlot =
  | "head"
  | "chest"
  | "legs"
  | "boots"
  | "weapon"
  | "shield"
  | "amulet"
  | "ring";

export type Friend = {
  id: string;
  name: string;
  level: number;
  location?: string;
  lastSeen?: string;
};

export type PartyMember = {
  id: string;
  name: string;
  level: number;
  hpPct: number;
  role: "tank" | "healer" | "dps";
};

export type PanelId = "inventory" | "equipment" | "friends" | "party";

type PanelState = { open: boolean; minimized: boolean };

export type Cooldown = { until: number; duration: number };

type GameState = {
  character: {
    name: string;
    title: string;
    level: number;
    xp: number;
    xpMax: number;
    hp: number;
    hpMax: number;
    mp: number;
    mpMax: number;
  };
  resources: { gold: number; premium: number };
  equipment: Record<EquipmentSlot, Item | null>;
  inventory: { capacity: number; slots: (Item | null)[] };
  friends: { online: Friend[]; offline: Friend[] };
  party: { leaderId: string; members: PartyMember[] };
  chat: { activeTab: ChatTab; messages: ChatMessage[] };
  panels: Record<PanelId, PanelState>;
  cooldowns: Record<number, Cooldown | undefined>;

  // actions
  takeDamage: (n: number) => void;
  heal: (n: number) => void;
  spendMana: (n: number) => void;
  regenMana: (n: number) => void;
  addGold: (n: number) => void;
  addPremium: (n: number) => void;
  togglePanel: (id: PanelId) => void;
  minimizePanel: (id: PanelId) => void;
  openPanel: (id: PanelId) => void;
  setChatTab: (tab: ChatTab) => void;
  sendChat: (tab: ChatTab, text: string) => void;
  triggerCooldown: (slot: number, ms: number) => void;
  kickMember: (id: string) => void;
  disbandParty: () => void;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const seedInventory: (Item | null)[] = Array.from({ length: 20 }, (_, i) => {
  const seed: (Item | null)[] = [
    { id: "i1", name: "Health Potion", icon: "🧪", rarity: "common", stack: 12 },
    { id: "i2", name: "Mana Potion", icon: "🔷", rarity: "common", stack: 8 },
    { id: "i3", name: "Bread", icon: "🍞", rarity: "common", stack: 4 },
    { id: "i4", name: "Iron Ore", icon: "⛏️", rarity: "uncommon", stack: 22 },
    { id: "i5", name: "Ancient Rune", icon: "🔯", rarity: "rare" },
    { id: "i6", name: "Gold Pouch", icon: "💰", rarity: "uncommon" },
    { id: "i7", name: "Silver Key", icon: "🗝️", rarity: "rare" },
    { id: "i8", name: "Dragon Scale", icon: "🐉", rarity: "epic" },
    null,
    { id: "i9", name: "Torch", icon: "🔥", rarity: "common", stack: 3 },
  ];
  return seed[i] ?? null;
});

export const useGameStore = create<GameState>((set) => ({
  character: {
    name: "Aldric",
    title: "the Bold",
    level: 12,
    xp: 3450,
    xpMax: 5000,
    hp: 184,
    hpMax: 240,
    mp: 96,
    mpMax: 150,
  },
  resources: { gold: 12480, premium: 42 },
  equipment: {
    head: { id: "e-head", name: "Iron Helm", icon: "⛑️", rarity: "uncommon" },
    chest: { id: "e-chest", name: "Steel Cuirass", icon: "🛡️", rarity: "rare" },
    legs: { id: "e-legs", name: "Chain Greaves", icon: "👖", rarity: "uncommon" },
    boots: { id: "e-boots", name: "Leather Boots", icon: "🥾", rarity: "common" },
    weapon: { id: "e-weap", name: "Runed Longsword", icon: "⚔️", rarity: "epic" },
    shield: { id: "e-shield", name: "Oaken Bulwark", icon: "🛡️", rarity: "rare" },
    amulet: { id: "e-amu", name: "Amulet of Vigor", icon: "📿", rarity: "rare" },
    ring: null,
  },
  inventory: { capacity: 40, slots: seedInventory },
  friends: {
    online: [
      { id: "f1", name: "Mira Silverhand", level: 18, location: "Ashen Vale" },
      { id: "f2", name: "Barok Ironjaw", level: 14, location: "Ember Keep" },
      { id: "f3", name: "Thessa Nightbloom", level: 22, location: "Wychwood" },
    ],
    offline: [
      { id: "f4", name: "Corvin Ash", level: 9, lastSeen: "2h ago" },
      { id: "f5", name: "Yulia Fen", level: 16, lastSeen: "yesterday" },
    ],
  },
  party: {
    leaderId: "p-self",
    members: [
      { id: "p-self", name: "Aldric", level: 12, hpPct: 76, role: "tank" },
      { id: "p2", name: "Mira Silverhand", level: 18, hpPct: 92, role: "healer" },
      { id: "p3", name: "Barok Ironjaw", level: 14, hpPct: 58, role: "dps" },
    ],
  },
  chat: {
    activeTab: "server",
    messages: [
      { id: "c1", tab: "server", author: "System", text: "Welcome to Aetheric Realms.", ts: Date.now() - 60000 },
      { id: "c2", tab: "server", author: "System", text: "Server tick rate: 20Hz.", ts: Date.now() - 55000 },
      { id: "c3", tab: "local", author: "Mira", text: "Meet me at the shrine.", ts: Date.now() - 40000 },
      { id: "c4", tab: "party", author: "Barok", text: "Pulling next pack in 3.", ts: Date.now() - 20000 },
      { id: "c5", tab: "trade", author: "Corvin", text: "WTS Dragon Scale x1 — 500g.", ts: Date.now() - 10000 },
    ],
  },
  panels: {
    inventory: { open: true, minimized: false },
    equipment: { open: true, minimized: false },
    friends: { open: true, minimized: false },
    party: { open: true, minimized: false },
  },
  cooldowns: {},

  takeDamage: (n) =>
    set((s) => ({ character: { ...s.character, hp: clamp(s.character.hp - n, 0, s.character.hpMax) } })),
  heal: (n) =>
    set((s) => ({ character: { ...s.character, hp: clamp(s.character.hp + n, 0, s.character.hpMax) } })),
  spendMana: (n) =>
    set((s) => ({ character: { ...s.character, mp: clamp(s.character.mp - n, 0, s.character.mpMax) } })),
  regenMana: (n) =>
    set((s) => ({ character: { ...s.character, mp: clamp(s.character.mp + n, 0, s.character.mpMax) } })),
  addGold: (n) => set((s) => ({ resources: { ...s.resources, gold: Math.max(0, s.resources.gold + n) } })),
  addPremium: (n) =>
    set((s) => ({ resources: { ...s.resources, premium: Math.max(0, s.resources.premium + n) } })),
  togglePanel: (id) =>
    set((s) => ({ panels: { ...s.panels, [id]: { ...s.panels[id], open: !s.panels[id].open } } })),
  minimizePanel: (id) =>
    set((s) => ({
      panels: { ...s.panels, [id]: { ...s.panels[id], minimized: !s.panels[id].minimized } },
    })),
  openPanel: (id) =>
    set((s) => ({ panels: { ...s.panels, [id]: { open: true, minimized: false } } })),
  setChatTab: (tab) => set((s) => ({ chat: { ...s.chat, activeTab: tab } })),
  sendChat: (tab, text) =>
    set((s) => ({
      chat: {
        ...s.chat,
        messages: [
          ...s.chat.messages,
          { id: `c-${Date.now()}`, tab, author: s.character.name, text, ts: Date.now() },
        ],
      },
    })),
  triggerCooldown: (slot, ms) =>
    set((s) => ({ cooldowns: { ...s.cooldowns, [slot]: { until: Date.now() + ms, duration: ms } } })),
  kickMember: (id) =>
    set((s) => ({ party: { ...s.party, members: s.party.members.filter((m) => m.id !== id) } })),
  disbandParty: () =>
    set((s) => ({ party: { ...s.party, members: s.party.members.filter((m) => m.id === s.party.leaderId) } })),
}));
