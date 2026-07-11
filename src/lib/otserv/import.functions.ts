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

const TABLES = {
  items: { table: "otserv_items", onConflict: "id" },
  vocations: { table: "otserv_vocations", onConflict: "id" },
  outfits: { table: "otserv_outfits", onConflict: "look_type,gender" },
  channels: { table: "otserv_channels", onConflict: "id" },
  stages: { table: "otserv_stages", onConflict: undefined }, // sem chave natural fácil
  groups: { table: "otserv_groups", onConflict: "id" },
  spells: { table: "otserv_spells", onConflict: "kind,name" },
  monsters: { table: "otserv_monsters", onConflict: "name" },
  npcs: { table: "otserv_npcs", onConflict: "name,script_file" },
  houses: { table: "otserv_houses", onConflict: "id" },
  spawns: { table: "otserv_spawns", onConflict: undefined },
  scripts: { table: "otserv_scripts_registry", onConflict: "script_type,file_path" },
  towns: { table: "otserv_towns", onConflict: "id" },
  raids: { table: "otserv_raids", onConflict: "name" },
  world_tiles: { table: "otserv_world_tiles", onConflict: "x,y,z" },
} as const;

export const importOtservBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        table: z.enum(
          Object.keys(TABLES) as [keyof typeof TABLES, ...(keyof typeof TABLES)[]],
        ),
        rows: z.array(z.record(z.string(), z.any())).max(500),
        dryRun: z.boolean().default(false),
        replace: z.boolean().default(false),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const cfg = TABLES[data.table];
    if (data.dryRun) {
      return { ok: true, count: data.rows.length, dryRun: true };
    }
    if (data.rows.length === 0) return { ok: true, count: 0 };

    const q = (context.supabase as any).from(cfg.table);
    const { error, count } = cfg.onConflict
      ? await q.upsert(data.rows, { onConflict: cfg.onConflict, count: "exact" })
      : await q.insert(data.rows, { count: "exact" });
    if (error) throw new Error(`${cfg.table}: ${error.message}`);
    return { ok: true, count: count ?? data.rows.length };
  });

export const clearOtservTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        table: z.enum(
          Object.keys(TABLES) as [keyof typeof TABLES, ...(keyof typeof TABLES)[]],
        ),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const cfg = TABLES[data.table];
    const { error } = await (context.supabase as any).from(cfg.table).delete().gte(
      cfg.onConflict?.split(",")[0] ?? "created_at",
      cfg.onConflict?.split(",")[0] === "id" ? -999999999 : "1900-01-01",
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const otservCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const out: Record<string, number> = {};
    for (const [key, cfg] of Object.entries(TABLES)) {
      const { count } = await (context.supabase as any)
        .from(cfg.table)
        .select("*", { count: "exact", head: true });
      out[key] = count ?? 0;
    }
    return out;
  });
