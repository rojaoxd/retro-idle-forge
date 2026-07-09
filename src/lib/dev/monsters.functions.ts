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

const lootEntry = z.object({
  item_id: z.string().uuid(),
  chance: z.number().min(0).max(100),
  min: z.number().int().min(1).default(1),
  max: z.number().int().min(1).default(1),
});

const monsterSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  hp: z.number().int().min(1).default(100),
  speed: z.number().int().min(0).default(100),
  exp_reward: z.number().int().min(0).default(0),
  max_damage: z.number().int().min(0).default(0),
  sprite_id: z.number().int().nullable().optional(),
  loot_table: z.array(lootEntry).default([]),
});

export const listMonsters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("monsters")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const upsertMonster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => monsterSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("monsters")
      .upsert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteMonster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("monsters").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
