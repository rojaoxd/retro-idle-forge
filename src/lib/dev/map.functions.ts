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

/** Lista tiles do andar Z + tiles do Z-1 (para silhueta). Admin only. */
export const listMapTiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({ z: z.number().int().min(0).max(15).default(7) }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const zBelow = data.z + 1; // Tibia: z maior = mais fundo
    const { data: tiles, error } = await (context.supabase as any)
      .from("map_tiles")
      .select("id, x, y, z, layer, tile_id, blocking, spawn_monster_id")
      .in("z", [data.z, zBelow]);
    if (error) throw new Error(error.message);

    const spriteIds = Array.from(new Set((tiles ?? []).map((t: any) => t.tile_id)));
    let sprites: any[] = [];
    if (spriteIds.length) {
      const { data: sp, error: se } = await (context.supabase as any)
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

    const { data: monsters } = await (context.supabase as any)
      .from("monsters").select("id, name");

    return { tiles: tiles ?? [], sprites, urlMap, monsters: monsters ?? [], z: data.z };
  });

const tileSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  z: z.number().int().min(0).max(15).default(7),
  layer: z.enum(["floor", "obstacles", "spawn"]),
  tile_id: z.number().int(),
  blocking: z.boolean().default(false),
  spawn_monster_id: z.string().uuid().nullable().optional(),
});

export const upsertMapTile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => tileSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any)
      .from("map_tiles")
      .upsert(data, { onConflict: "x,y,z,layer" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Paint em lote (brush 3x3/5x5/fill). */
export const paintMapTiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({ tiles: z.array(tileSchema) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.tiles.length) return { ok: true, count: 0 };
    const { error } = await (context.supabase as any)
      .from("map_tiles")
      .upsert(data.tiles, { onConflict: "x,y,z,layer" });
    if (error) throw new Error(error.message);
    return { ok: true, count: data.tiles.length };
  });

export const deleteMapTile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({
      x: z.number().int(),
      y: z.number().int(),
      z: z.number().int().min(0).max(15).default(7),
      layer: z.enum(["floor", "obstacles", "spawn"]),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any)
      .from("map_tiles")
      .delete()
      .eq("x", data.x).eq("y", data.y).eq("z", data.z).eq("layer", data.layer);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMapTilesBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({
      cells: z.array(z.object({
        x: z.number().int(), y: z.number().int(), z: z.number().int(),
        layer: z.enum(["floor", "obstacles", "spawn"]),
      })),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    for (const c of data.cells) {
      await (context.supabase as any).from("map_tiles").delete()
        .eq("x", c.x).eq("y", c.y).eq("z", c.z).eq("layer", c.layer);
    }
    return { ok: true };
  });
