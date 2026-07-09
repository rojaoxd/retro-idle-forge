import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}

const directionSchema = z.object({
  idle: z.number().int().nullable().optional(),
  step1: z.number().int().nullable().optional(),
  step2: z.number().int().nullable().optional(),
});

const creatureSchema = z.object({
  id: z.string().uuid().optional(),
  look_id: z.number().int(),
  name: z.string().min(1),
  animations: z.object({
    north: directionSchema.default({}),
    south: directionSchema.default({}),
    east: directionSchema.default({}),
    west: directionSchema.default({}),
  }),
});

export const listCreatures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("game_creatures")
      .select("*")
      .order("look_id", { ascending: true });
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const upsertCreature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => creatureSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("game_creatures")
      .upsert(data, { onConflict: "look_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteCreature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("game_creatures").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
