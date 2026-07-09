import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
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

export const listObjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: objects, error } = await (context.supabase as any)
      .from("game_objects").select("*").order("name");
    if (error) throw new Error(error.message);
    const { data: sprites } = await (context.supabase as any)
      .from("game_object_sprites").select("*")
      .in("object_id", (objects ?? []).map((o: any) => o.id));

    // resolve one preview sprite per object
    const spriteIds = Array.from(new Set((sprites ?? []).map((s: any) => s.sprite_id)));
    let spriteRows: any[] = [];
    if (spriteIds.length) {
      const { data } = await (context.supabase as any)
        .from("game_sprites").select("id, sheet_url, x, y, width, height")
        .in("id", spriteIds);
      spriteRows = data ?? [];
    }
    const urlMap = await signSheets(
      context.supabase,
      spriteRows.map((s) => s.sheet_url),
    );
    return { objects: objects ?? [], compositions: sprites ?? [], sprites: spriteRows, urlMap };
  });

const objectSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.number().int().nullable().optional(),
  name: z.string().min(1),
  object_kind: z.enum([
    "item", "ground", "container", "weapon", "armor",
    "fluid", "splash", "deco", "creature", "wall", "effect",
  ]).default("item"),
  width: z.number().int().min(1).max(4).default(1),
  height: z.number().int().min(1).max(4).default(1),
  layers: z.number().int().min(1).default(1),
  pattern_x: z.number().int().min(1).default(1),
  pattern_y: z.number().int().min(1).default(1),
  pattern_z: z.number().int().min(1).default(1),
  frames: z.number().int().min(1).default(1),
  frame_duration_ms: z.number().int().default(250),
  flags: z.record(z.string(), z.any()).default({}),
  palette_group: z.string().nullable().optional(),
});

export const upsertObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => objectSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await (context.supabase as any)
      .from("game_objects").upsert(data).select().single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).from("game_objects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const compSchema = z.object({
  object_id: z.string().uuid(),
  cells: z.array(z.object({
    sprite_id: z.number().int(),
    layer: z.number().int().default(0),
    pattern_x: z.number().int().default(0),
    pattern_y: z.number().int().default(0),
    pattern_z: z.number().int().default(0),
    frame: z.number().int().default(0),
    cell_x: z.number().int().default(0),
    cell_y: z.number().int().default(0),
  })),
});

export const setObjectComposition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => compSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    // wipe & reinsert (small tables, simple approach)
    const del = await (context.supabase as any).from("game_object_sprites")
      .delete().eq("object_id", data.object_id);
    if (del.error) throw new Error(del.error.message);
    if (data.cells.length) {
      const rows = data.cells.map((c) => ({ ...c, object_id: data.object_id }));
      const ins = await (context.supabase as any).from("game_object_sprites").insert(rows);
      if (ins.error) throw new Error(ins.error.message);
    }
    return { ok: true };
  });
