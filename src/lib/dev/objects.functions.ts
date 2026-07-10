import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}

const BUCKET = "game-sprites";

async function signSheets(supabase: any, paths: string[]) {
  const urlMap: Record<string, string | null> = {};
  await Promise.all(
    Array.from(new Set(paths)).map(async (p) => {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(p, 3600);
      urlMap[p] = data?.signedUrl ?? null;
    }),
  );
  return urlMap;
}

export const listObjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: objects, error } = await (context.supabase as any)
      .from("game_objects").select("*").order("name");
    if (error) throw new Error(error.message);
    const { data: sprites } = await (context.supabase as any)
      .from("game_object_sprites").select("*")
      .in("object_id", (objects ?? []).map((o: any) => o.id));

    // resolve one preview sprite per object
    const spriteIds = Array.from(new Set((sprites ?? []).map((s: any) => s.sprite_id)));
    let spriteRows: any[] = [];
    if (spriteIds.length) {
      const { data } = await (context.supabase as any)
        .from("game_sprites").select("id, sheet_url, x, y, width, height")
        .in("id", spriteIds);
      spriteRows = data ?? [];
    }
    const urlMap = await signSheets(
      context.supabase,
      spriteRows.map((s) => s.sheet_url),
    );
    return { objects: objects ?? [], compositions: sprites ?? [], sprites: spriteRows, urlMap };
  });

const objectSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.number().int().nullable().optional(),
  name: z.string().min(1),
  object_kind: z.enum([
    "item", "ground", "container", "weapon", "armor",
    "fluid", "splash", "deco", "creature", "wall", "effect",
  ]).default("item"),
  width: z.number().int().min(1).max(4).default(1),
  height: z.number().int().min(1).max(4).default(1),
  layers: z.number().int().min(1).default(1),
  pattern_x: z.number().int().min(1).default(1),
  pattern_y: z.number().int().min(1).default(1),
  pattern_z: z.number().int().min(1).default(1),
  frames: z.number().int().min(1).default(1),
  frame_duration_ms: z.number().int().default(250),
  flags: z.record(z.string(), z.any()).default({}),
  palette_group: z.string().nullable().optional(),
});

export const upsertObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => objectSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await (context.supabase as any)
      .from("game_objects").upsert(data).select().single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).from("game_objects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const compSchema = z.object({
  object_id: z.string().uuid(),
  cells: z.array(z.object({
    sprite_id: z.number().int(),
    layer: z.number().int().default(0),
    pattern_x: z.number().int().default(0),
    pattern_y: z.number().int().default(0),
    pattern_z: z.number().int().default(0),
    frame: z.number().int().default(0),
    cell_x: z.number().int().default(0),
    cell_y: z.number().int().default(0),
  })),
});

export const setObjectComposition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => compSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    // wipe & reinsert (small tables, simple approach)
    const del = await (context.supabase as any).from("game_object_sprites")
      .delete().eq("object_id", data.object_id);
    if (del.error) throw new Error(del.error.message);
    if (data.cells.length) {
      const rows = data.cells.map((c) => ({ ...c, object_id: data.object_id }));
      const ins = await (context.supabase as any).from("game_object_sprites").insert(rows);
      if (ins.error) throw new Error(ins.error.message);
    }
    return { ok: true };
  });

/* ---------- Object Builder helpers ---------- */

const KIND_LIST = [
  "item", "ground", "container", "weapon", "armor",
  "fluid", "splash", "deco", "creature", "wall", "effect",
] as const;

export const nextClientId = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({ object_kind: z.enum(KIND_LIST) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await (context.supabase as any)
      .from("game_objects")
      .select("client_id")
      .eq("object_kind", data.object_kind)
      .not("client_id", "is", null)
      .order("client_id", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    const max = rows?.[0]?.client_id ?? 99; // start at 100 (Tibia convention)
    return { next: (max as number) + 1 };
  });

/**
 * Import a batch of 32×32 tiles decoded on the client (magenta already stripped).
 * Each tile is uploaded to game-sprites bucket, deduplicated by SHA-1 hash.
 * Returns spriteIds in the same order as input (dedup entries share an id).
 */
export const importSpriteSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({
      tiles: z
        .array(
          z.object({
            hash: z.string().min(8),
            base64Png: z.string().min(4),
            width: z.number().int().default(32),
            height: z.number().int().default(32),
          }),
        )
        .min(1)
        .max(4096),
      tagPrefix: z.string().optional(),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const supa = context.supabase as any;

    const uniq = new Map<string, (typeof data.tiles)[number]>();
    for (const t of data.tiles) if (!uniq.has(t.hash)) uniq.set(t.hash, t);

    // Look up existing sprites by hash
    const hashes = Array.from(uniq.keys());
    const { data: existing, error: exErr } = await supa
      .from("game_sprites")
      .select("id, hash, sheet_url")
      .in("hash", hashes);
    if (exErr) throw new Error(exErr.message);
    const byHash = new Map<string, { id: number; sheet_url: string }>();
    for (const r of existing ?? []) byHash.set(r.hash, r);

    // Upload + insert missing
    for (const [hash, t] of uniq) {
      if (byHash.has(hash)) continue;
      const bytes = Uint8Array.from(atob(t.base64Png), (c) => c.charCodeAt(0));
      const path = `imported/${hash}.png`;
      const up = await supa.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: "image/png", upsert: true });
      if (up.error && !String(up.error.message).includes("exists")) {
        throw new Error(up.error.message);
      }
      const tags = data.tagPrefix ? [data.tagPrefix] : [];
      const ins = await supa
        .from("game_sprites")
        .insert({ sheet_url: path, x: 0, y: 0, width: t.width, height: t.height, hash, tags })
        .select("id, hash, sheet_url")
        .single();
      if (ins.error) throw new Error(ins.error.message);
      byHash.set(hash, ins.data);
    }

    // Sign URLs
    const paths = Array.from(new Set(Array.from(byHash.values()).map((v) => v.sheet_url)));
    const urlMap = await signSheets(supa, paths);

    const spriteIds = data.tiles.map((t) => byHash.get(t.hash)!.id);
    const spriteRows = Array.from(byHash.values()).map((v) => ({
      id: v.id, sheet_url: v.sheet_url, x: 0, y: 0, width: 32, height: 32,
    }));
    return { spriteIds, spriteRows, urlMap, unique: byHash.size, total: data.tiles.length };
  });

/**
 * Create a full object from parsed OBD/PNG data: object row + composition rows.
 */
const importObjectSchema = z.object({
  object: objectSchema,
  cells: z.array(z.object({
    sprite_id: z.number().int(),
    layer: z.number().int().default(0),
    pattern_x: z.number().int().default(0),
    pattern_y: z.number().int().default(0),
    pattern_z: z.number().int().default(0),
    frame: z.number().int().default(0),
    cell_x: z.number().int().default(0),
    cell_y: z.number().int().default(0),
  })),
});

export const importObjectFull = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => importObjectSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const supa = context.supabase as any;
    const { data: obj, error } = await supa
      .from("game_objects").insert(data.object).select().single();
    if (error) throw new Error(error.message);
    if (data.cells.length) {
      const rows = data.cells.map((c) => ({ ...c, object_id: obj.id }));
      const ins = await supa.from("game_object_sprites").insert(rows);
      if (ins.error) throw new Error(ins.error.message);
    }
    return { object: obj };
  });

/* ---------- Bulk import for tibia.dat/spr ---------- */

const bulkTileSchema = z.object({
  hash: z.string().min(8),
  base64Png: z.string().min(4),
});

const bulkObjectSchema = z.object({
  name: z.string().min(1),
  object_kind: z.enum([
    "item", "ground", "container", "weapon", "armor",
    "fluid", "splash", "deco", "creature", "wall", "effect",
  ]),
  client_id: z.number().int(),
  width: z.number().int().min(1).max(4),
  height: z.number().int().min(1).max(4),
  layers: z.number().int().min(1),
  pattern_x: z.number().int().min(1),
  pattern_y: z.number().int().min(1),
  pattern_z: z.number().int().min(1),
  frames: z.number().int().min(1),
  frame_duration_ms: z.number().int().default(500),
  flags: z.record(z.string(), z.any()).default({}),
  cells: z.array(z.object({
    tile_hash: z.string(),
    layer: z.number().int(),
    pattern_x: z.number().int(),
    pattern_y: z.number().int(),
    pattern_z: z.number().int(),
    frame: z.number().int(),
    cell_x: z.number().int(),
    cell_y: z.number().int(),
  })),
});

const importBulkSchema = z.object({
  sprites: z.array(bulkTileSchema).max(3000),
  objects: z.array(bulkObjectSchema).max(500),
  tagPrefix: z.string().default("tibia74"),
});

export const importTibiaBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => importBulkSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const supa = context.supabase as any;

    const uniq = new Map<string, { hash: string; base64Png: string }>();
    for (const s of data.sprites) if (!uniq.has(s.hash)) uniq.set(s.hash, s);

    const hashes = Array.from(uniq.keys());
    const idByHash = new Map<string, number>();
    if (hashes.length) {
      const { data: existing, error: exErr } = await supa
        .from("game_sprites").select("id, hash").in("hash", hashes);
      if (exErr) throw new Error(exErr.message);
      for (const r of existing ?? []) idByHash.set(r.hash, r.id);
    }

    const newRows: { hash: string; sheet_url: string }[] = [];
    for (const [hash, t] of uniq) {
      if (idByHash.has(hash)) continue;
      const bytes = Uint8Array.from(atob(t.base64Png), (c) => c.charCodeAt(0));
      const path = `imported/${hash}.png`;
      const up = await supa.storage
        .from(BUCKET).upload(path, bytes, { contentType: "image/png", upsert: true });
      if (up.error && !String(up.error.message).includes("exists")) {
        throw new Error(up.error.message);
      }
      newRows.push({ hash, sheet_url: path });
    }
    if (newRows.length) {
      const ins = await supa.from("game_sprites").insert(
        newRows.map((r) => ({ ...r, x: 0, y: 0, width: 32, height: 32, tags: [data.tagPrefix] })),
      ).select("id, hash");
      if (ins.error) throw new Error(ins.error.message);
      for (const r of ins.data ?? []) idByHash.set(r.hash, r.id);
    }

    let inserted = 0, updated = 0, skipped = 0;
    for (const obj of data.objects) {
      const { cells, ...row } = obj;
      const { data: existing } = await supa
        .from("game_objects").select("id")
        .eq("object_kind", row.object_kind).eq("client_id", row.client_id).maybeSingle();

      let objectId: string;
      if (existing?.id) {
        objectId = existing.id;
        const upd = await supa.from("game_objects").update(row).eq("id", objectId);
        if (upd.error) { skipped++; continue; }
        updated++;
        await supa.from("game_object_sprites").delete().eq("object_id", objectId);
      } else {
        const ins = await supa.from("game_objects").insert(row).select("id").single();
        if (ins.error) { skipped++; continue; }
        objectId = ins.data.id;
        inserted++;
      }

      if (cells.length) {
        const rows = cells.map((c) => ({
          object_id: objectId,
          sprite_id: idByHash.get(c.tile_hash) ?? 0,
          layer: c.layer,
          pattern_x: c.pattern_x, pattern_y: c.pattern_y, pattern_z: c.pattern_z,
          frame: c.frame, cell_x: c.cell_x, cell_y: c.cell_y,
        })).filter((r) => r.sprite_id > 0);
        if (rows.length) {
          const ci = await supa.from("game_object_sprites").insert(rows);
          if (ci.error) skipped++;
        }
      }
    }

    return {
      spritesUnique: idByHash.size,
      spritesUploaded: newRows.length,
      inserted, updated, skipped,
    };
  });


