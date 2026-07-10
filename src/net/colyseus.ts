import { Client, Room } from "colyseus.js";
import { supabase } from "@/integrations/supabase/client";

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
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new GameServerConnectionError("Sessão expirada. Entre novamente para jogar.");

  try {
    return await withTimeout(
      getClient().joinOrCreate(ROOM_NAME, { name, characterId, accessToken }),
      CONNECT_TIMEOUT_MS,
    );
  } catch (error) {
    if (error instanceof GameServerConnectionError) throw error;
    console.error("[colyseus] joinOrCreate falhou", { endpoint: COLYSEUS_ENDPOINT, error });
    const raw = error instanceof Error ? error.message : String(error);
    // Erros vindos do onJoin do servidor (ex.: "Personagem não encontrado", "Sessão inválida")
    // chegam como Error com message não-vazia. Mantemos a mensagem original nesse caso.
    if (raw && !/network|websocket|failed to connect|timeout|econn|refused|closed before/i.test(raw)) {
      throw new GameServerConnectionError(raw);
    }
    throw new GameServerConnectionError(
      `Não foi possível conectar em ${COLYSEUS_ENDPOINT}. Verifique DNS, TLS (WSS) e se o Colyseus está online.`,
    );
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
