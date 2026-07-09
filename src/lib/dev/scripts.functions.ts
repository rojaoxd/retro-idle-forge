import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}

const actionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  target_kind: z.enum(["item_id", "action_id", "unique_id"]).default("item_id"),
  target_value: z.number().int(),
  code: z.string().default(""),
  enabled: z.boolean().default(true),
  notes: z.string().nullable().optional(),
});

const moveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  target_kind: z.enum(["tile_object_id", "action_id", "unique_id", "equip_slot"]).default("tile_object_id"),
  target_value: z.number().int(),
  event: z.enum(["onStepIn", "onStepOut", "onEquip", "onDeEquip", "onAddItem", "onRemoveItem"]).default("onStepIn"),
  code: z.string().default(""),
  enabled: z.boolean().default(true),
  notes: z.string().nullable().optional(),
});

export const listActions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await (context.supabase as any)
      .from("scripts_actions").select("*").order("name");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const upsertAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => actionSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await (context.supabase as any)
      .from("scripts_actions").upsert(data).select().single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).from("scripts_actions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMovements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await (context.supabase as any)
      .from("scripts_movements").select("*").order("name");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const upsertMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => moveSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await (context.supabase as any)
      .from("scripts_movements").upsert(data).select().single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).from("scripts_movements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
