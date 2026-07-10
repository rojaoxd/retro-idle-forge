import { createClient, SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

/**
 * Cliente Supabase ÚNICO por processo.
 *
 * Regras de ouro (não quebre):
 *  - Nunca chame createClient() dentro de onJoin/onMessage/loops.
 *  - Toda leitura "quente" (a cada tick) passa pelo WorldCache, não por aqui.
 *  - Toda escrita alta-frequência (posição/HP/logs) passa pelo PlayerWriter/Logger em batch.
 */
let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltando SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env do game-server.",
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 10 }, transport: ws as any },
    global: { headers: { "x-application": "olddungeons-colyseus" } },
  });

  return _client;
}
