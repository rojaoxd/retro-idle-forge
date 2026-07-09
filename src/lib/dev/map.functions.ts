import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden: admin only");
}

const BUCKET = "game-sprites";

async function signSheets(supabase: any, paths: string[]) {
  const urlMap: Record<string, string | null> = {};
  await Promise.all(
    Array.from(new Set(paths)).map(async (p) => {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(p, 3600);
      urlMap[p] = data?.signedUrl ?? null;
    }),
  );
  return urlMap;
}

/** Lista todos os tiles + sprites resolvidos. Admin only (editor). */
export const listMapTiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: tiles, error } = await context.supabase
      .from("map_tiles")
      .select("id, x, y, layer, tile_id, blocking, spawn_monster_id");
    if (error) throw new Error(error.message);

    const spriteIds = Array.from(new Set((tiles ?? []).map((t: any) => t.tile_id)));
    let sprites: any[] = [];
    if (spriteIds.length) {
      const { data: sp, error: se } = await context.supabase
        .from("game_sprites")
        .select("id, sheet_url, x, y, width, height")
        .in("id", spriteIds);
      if (se) throw new Error(se.message);
      sprites = sp ?? [];
    }
    const urlMap = await signSheets(
      context.supabase,
      sprites.map((s) => s.sheet_url),
    );

    const { data: monsters } = await context.supabase
      .from("monsters")
      .select("id, name");

    return { tiles: tiles ?? [], sprites, urlMap, monsters: monsters ?? [] };
  });

export const upsertMapTile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        x: z.number().int(),
        y: z.number().int(),
        layer: z.enum(["floor", "obstacles", "spawn"]),
        tile_id: z.number().int(),
        blocking: z.boolean().default(false),
        spawn_monster_id: z.string().uuid().nullable().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("map_tiles")
      .upsert(data, { onConflict: "x,y,layer" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMapTile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        x: z.number().int(),
        y: z.number().int(),
        layer: z.enum(["floor", "obstacles", "spawn"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("map_tiles")
      .delete()
      .eq("x", data.x)
      .eq("y", data.y)
      .eq("layer", data.layer);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
