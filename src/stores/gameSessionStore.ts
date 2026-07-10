import { create } from "zustand";
import type { Room } from "colyseus.js";

export type CharacterRow = {
  id: string;
  name: string;
  vocation: string;
  level: number;
  experience: number;
  hp: number;
  hp_max: number;
  mana: number;
  mana_max: number;
  cap: number;
  speed: number;
  pos_x: number;
  pos_y: number;
  pos_z: number;
};

type State = {
  character: CharacterRow | null;
  room: Room | null;
  setSession: (s: { character: CharacterRow; room: Room }) => void;
  clear: () => void;
};

export const useGameSessionStore = create<State>((set) => ({
  character: null,
  room: null,
  setSession: ({ character, room }) => set({ character, room }),
  clear: () => set({ character: null, room: null }),
}));
