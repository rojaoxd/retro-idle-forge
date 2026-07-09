import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BUCKET = "game-sprites";

/**
 * Leitura pública do mapa. Usa cliente server-side com chave publishable
 * (respeita RLS; map_tiles tem SELECT liberado para anon).
 */
export const getMapTiles = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const supabase = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data: tiles, error } = await supabase
    .from("map_tiles")
    .select("x, y, layer, tile_id, blocking");
  if (error) throw new Error(error.message);

  const spriteIds = Array.from(new Set((tiles ?? []).map((t: any) => t.tile_id)));
  let sprites: Array<{
    id: number;
    sheet_url: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];
  if (spriteIds.length) {
    const { data: sp, error: se } = await supabase
      .from("game_sprites")
      .select("id, sheet_url, x, y, width, height")
      .in("id", spriteIds);
    if (se) throw new Error(se.message);
    sprites = (sp ?? []) as any;
  }

  const urlMap: Record<string, string | null> = {};
  await Promise.all(
    Array.from(new Set(sprites.map((s) => s.sheet_url))).map(async (p) => {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(p, 3600);
      urlMap[p] = data?.signedUrl ?? null;
    }),
  );

  return { tiles: tiles ?? [], sprites, urlMap };
});
