import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}

export const getConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("game_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { config: (data?.config as Record<string, any>) ?? {} };
  });

export const saveConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ config: z.record(z.string(), z.any()) }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("game_config")
      .upsert({ id: 1, config: data.config });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
