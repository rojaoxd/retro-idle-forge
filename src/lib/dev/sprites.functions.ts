import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}

const BUCKET = "game-sprites";

async function signSheet(supabase: any, path: string) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export const listSprites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        search: z.string().optional(),
        limit: z.number().int().min(1).max(500).default(100),
        offset: z.number().int().min(0).default(0),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("game_sprites")
      .select("*", { count: "exact" })
      .order("id", { ascending: true })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.search && data.search.trim()) {
      q = q.contains("tags", [data.search.trim().toLowerCase()]);
    }
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);

    const paths = Array.from(new Set((rows ?? []).map((r: any) => r.sheet_url)));
    const urlMap: Record<string, string | null> = {};
    await Promise.all(
      paths.map(async (p) => {
        urlMap[p as string] = await signSheet(context.supabase, p as string);
      }),
    );
    return { rows: rows ?? [], count: count ?? 0, urlMap };
  });

export const createSpritesBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        sheet_url: z.string().min(1),
        tileSize: z.number().int().min(4).max(256).default(32),
        cols: z.number().int().min(1),
        rows: z.number().int().min(1),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const inserts: {
      sheet_url: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }[] = [];
    for (let ry = 0; ry < data.rows; ry++) {
      for (let cx = 0; cx < data.cols; cx++) {
        inserts.push({
          sheet_url: data.sheet_url,
          x: cx * data.tileSize,
          y: ry * data.tileSize,
          width: data.tileSize,
          height: data.tileSize,
        });
      }
    }
    const { data: rows, error } = await context.supabase
      .from("game_sprites")
      .insert(inserts)
      .select("id");
    if (error) throw new Error(error.message);
    return { inserted: rows?.length ?? 0 };
  });

export const updateSpriteTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({ id: z.number().int(), tags: z.array(z.string()) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const tags = data.tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
    const { error } = await context.supabase
      .from("game_sprites")
      .update({ tags })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSprite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.number().int() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("game_sprites").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSignedSheetUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ path: z.string() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return { url: await signSheet(context.supabase, data.path) };
  });

export const getSpritesByIds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ ids: z.array(z.number().int()) }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.ids.length === 0) return { rows: [], urlMap: {} };
    const { data: rows, error } = await context.supabase
      .from("game_sprites")
      .select("*")
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    const paths = Array.from(new Set((rows ?? []).map((r: any) => r.sheet_url)));
    const urlMap: Record<string, string | null> = {};
    await Promise.all(
      paths.map(async (p) => {
        urlMap[p as string] = await signSheet(context.supabase, p as string);
      }),
    );
    return { rows: rows ?? [], urlMap };
  });
