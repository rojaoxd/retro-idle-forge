import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}

export const listPalettes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await (context.supabase as any)
      .from("map_palettes").select("*").order("palette_group").order("name");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

const paletteSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  palette_group: z.enum(["nature", "town", "dungeon", "walls", "creatures", "items", "effects", "misc"]).default("nature"),
  object_ids: z.array(z.string().uuid()).default([]),
});

export const upsertPalette = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => paletteSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await (context.supabase as any)
      .from("map_palettes").upsert(data).select().single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deletePalette = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).from("map_palettes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
