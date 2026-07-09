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

const vocationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  hp_per_level: z.number().int().min(0).default(5),
  mana_per_level: z.number().int().min(0).default(5),
  capacity_per_level: z.number().int().min(0).default(10),
  hp_regen_ms: z.number().int().min(100).default(6000),
  mana_regen_ms: z.number().int().min(100).default(4000),
});

export const listVocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("vocations")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const upsertVocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => vocationSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("vocations")
      .upsert(data, { onConflict: "name" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteVocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("vocations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const spellSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  words: z.string().min(1),
  mana_cost: z.number().int().min(0).default(0),
  min_level: z.number().int().min(1).default(1),
  vocation_id: z.string().uuid().nullable().optional(),
  kind: z.enum(["healing", "attack", "support", "rune"]).default("attack"),
  effect_id: z.string().uuid().nullable().optional(),
});

export const listSpells = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("spells")
      .select("*")
      .order("min_level");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const upsertSpell = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => spellSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("spells")
      .upsert(data, { onConflict: "words" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteSpell = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("spells").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
