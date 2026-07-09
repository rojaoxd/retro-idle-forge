import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  sprite_id: z.number().int().nullable().optional(),
  weight: z.number().default(0),
  capacity: z.number().int().default(0),
  attack: z.number().int().default(0),
  defense: z.number().int().default(0),
  armor: z.number().int().default(0),
  weapon_type: z.string().nullable().optional(),
  is_solid: z.boolean().default(false),
  is_container: z.boolean().default(false),
  is_stackable: z.boolean().default(false),
  is_useable: z.boolean().default(false),
  is_liquid_container: z.boolean().default(false),
  has_height: z.boolean().default(false),
  extra: z.record(z.string(), z.any()).default({}),
});

export const listItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("game_items")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const upsertItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => itemSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("game_items")
      .upsert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("game_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
