import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}

const npcSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  sprite_object_id: z.string().uuid().nullable().optional(),
  outfit: z.record(z.string(), z.any()).default({}),
  walk_radius: z.number().int().default(0),
  speech_greet: z.array(z.string()).default([]),
  speech_farewell: z.array(z.string()).default([]),
  idle_messages: z.array(z.string()).default([]),
  spawn_x: z.number().int().nullable().optional(),
  spawn_y: z.number().int().nullable().optional(),
  spawn_z: z.number().int().default(7),
});

export const listNpcs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await (context.supabase as any)
      .from("npcs").select("*").order("name");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const upsertNpc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => npcSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await (context.supabase as any)
      .from("npcs").upsert(data).select().single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteNpc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).from("npcs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* Trades */
export const listTrades = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ npc_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await (context.supabase as any)
      .from("npc_trades").select("*").eq("npc_id", data.npc_id);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

const tradeSchema = z.object({
  id: z.string().uuid().optional(),
  npc_id: z.string().uuid(),
  object_id: z.string().uuid(),
  buy_price: z.number().int().nullable().optional(),
  sell_price: z.number().int().nullable().optional(),
  currency: z.string().default("gold"),
  stock: z.number().int().nullable().optional(),
});

export const upsertTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => tradeSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await (context.supabase as any)
      .from("npc_trades").upsert(data).select().single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).from("npc_trades").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* Keywords */
export const listKeywords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ npc_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await (context.supabase as any)
      .from("npc_keywords").select("*").eq("npc_id", data.npc_id);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

const kwSchema = z.object({
  id: z.string().uuid().optional(),
  npc_id: z.string().uuid(),
  keywords: z.array(z.string()).default([]),
  answer: z.string().default(""),
});

export const upsertKeyword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => kwSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await (context.supabase as any)
      .from("npc_keywords").upsert(data).select().single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteKeyword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).from("npc_keywords").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
