import { create } from "zustand";
import type { Room } from "colyseus.js";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error" | "closed";

type NetState = {
  room: Room | null;
  sessionId: string | null;
  status: ConnectionStatus;
  error: string | null;
  setRoom: (room: Room | null) => void;
  setStatus: (s: ConnectionStatus, error?: string | null) => void;
};

export const useNetStore = create<NetState>((set) => ({
  room: null,
  sessionId: null,
  status: "idle",
  error: null,
  setRoom: (room) => set({ room, sessionId: room?.sessionId ?? null }),
  setStatus: (status, error = null) => set({ status, error }),
}));
