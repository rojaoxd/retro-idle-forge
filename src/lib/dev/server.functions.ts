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

export const getServerStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("server_configs")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { config: data };
  });

export const setServerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        status: z.enum(["online", "maintenance"]),
        motd: z.string().max(500).nullable().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: any = { status: data.status, updated_by: context.userId };
    if (data.motd !== undefined) patch.motd = data.motd;
    const { error } = await context.supabase
      .from("server_configs")
      .update(patch)
      .eq("id", 1);
    if (error) throw new Error(error.message);

    await context.supabase.from("server_logs").insert({
      level: "info",
      source: "admin",
      message: `Server status changed to ${data.status}`,
      meta: { by: context.userId },
    });
    return { ok: true };
  });

export const getOnlinePlayers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const cutoff = new Date(Date.now() - 30_000).toISOString();
    const { data, error, count } = await context.supabase
      .from("online_players")
      .select("id, character_name, x, y, last_heartbeat", { count: "exact" })
      .gte("last_heartbeat", cutoff)
      .order("last_heartbeat", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { rows: data ?? [], count: count ?? 0 };
  });

export const getRecentLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({ limit: z.number().int().min(1).max(500).default(200) }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("server_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []).reverse() };
  });

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [items, monsters, tiles, spells] = await Promise.all([
      context.supabase.from("game_items").select("id", { count: "exact", head: true }),
      context.supabase.from("monsters").select("id", { count: "exact", head: true }),
      context.supabase.from("map_tiles").select("id", { count: "exact", head: true }),
      context.supabase.from("spells").select("id", { count: "exact", head: true }),
    ]);
    return {
      items: items.count ?? 0,
      monsters: monsters.count ?? 0,
      tiles: tiles.count ?? 0,
      spells: spells.count ?? 0,
    };
  });
