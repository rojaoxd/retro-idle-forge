import { Client, Room } from "colyseus.js";

export const COLYSEUS_ENDPOINT = import.meta.env.VITE_COLYSEUS_URL || "ws://localhost:2567";
export const ROOM_NAME = "game";

let client: Client | null = null;

export function getClient(): Client {
  if (!client) client = new Client(COLYSEUS_ENDPOINT);
  return client;
}

export type PlayerState = { x: number; y: number; name: string };

export async function joinGameRoom(name: string): Promise<Room> {
  return getClient().joinOrCreate(ROOM_NAME, { name });
}
