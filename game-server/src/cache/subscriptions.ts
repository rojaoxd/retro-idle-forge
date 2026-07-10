import { supabase } from "../supabase.js";
import { WorldCache } from "./WorldCache.js";

/**
 * Um único canal Realtime por processo. Quando o admin edita algo
 * no painel /dev, disparamos o reload da tabela correspondente.
 *
 * Debounce simples pra evitar 500 reloads se o admin pintar 500 tiles em 2s.
 */
const debouncers = new Map<string, NodeJS.Timeout>();
function debounce(key: string, ms: number, fn: () => Promise<void>) {
  const prev = debouncers.get(key);
  if (prev) clearTimeout(prev);
  debouncers.set(
    key,
    setTimeout(() => {
      debouncers.delete(key);
      fn().catch((e) => console.error(`[Realtime] reload ${key} falhou:`, e));
    }, ms),
  );
}

export function startWorldSubscriptions() {
  const channel = supabase()
    .channel("world-admin")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "map_tiles" },
      () => debounce("tiles", 500, () => WorldCache.reloadTiles()),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "game_objects" },
      () => debounce("objects", 500, () => WorldCache.reloadObjects()),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "server_configs" },
      () => debounce("config", 100, () => WorldCache.reloadConfig()),
    )
    .subscribe((status) => {
      console.log(`[Realtime] canal world-admin: ${status}`);
    });

  return channel;
}
