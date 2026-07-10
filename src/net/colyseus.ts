import { Client, Room } from "colyseus.js";

export const COLYSEUS_ENDPOINT = import.meta.env.VITE_COLYSEUS_URL || "ws://localhost:2567";
export const ROOM_NAME = "game";
const CONNECT_TIMEOUT_MS = 8000;

let client: Client | null = null;

export function getClient(): Client {
  if (!client) client = new Client(COLYSEUS_ENDPOINT);
  return client;
}

export type PlayerState = { x: number; y: number; name: string };

export class GameServerConnectionError extends Error {
  constructor(message = "Servidor do jogo indisponível. Verifique se o Colyseus está online e tente novamente.") {
    super(message);
    this.name = "GameServerConnectionError";
  }
}

export async function joinGameRoom(name: string, characterId?: string): Promise<Room> {
  try {
    return await withTimeout(
      getClient().joinOrCreate(ROOM_NAME, { name, characterId }),
      CONNECT_TIMEOUT_MS,
    );
  } catch (error) {
    if (error instanceof GameServerConnectionError) throw error;
    throw new GameServerConnectionError();
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new GameServerConnectionError()), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}
