// Server-only heavy import logic for Tibia.dat/.spr → game_objects / game_sprites.
// Called by import.functions.ts server functions. Not importable from the client bundle.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseDat, type ThingType, type DatFlags, type ThingCategory } from "@/lib/dev/tibia/datReader";
import { SprReader } from "@/lib/dev/tibia/sprReader";
import { encodePng32, sha1Hex } from "@/lib/dev/tibia/pngEncoder.server";

const BUCKET = "game-sprites";

type Categories = { item?: boolean; outfit?: boolean; effect?: boolean; missile?: boolean };

type ParsedCache = {
  active: ThingType[];      // filtered by categories, in stable order
  spr: SprReader;
};

// Module-scope cache. Worker instances often persist between requests.
const CACHE = new Map<string, ParsedCache>();

async function downloadBucketFile(path: string): Promise<Uint8Array> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(path);
  if (error) throw new Error(`storage download ${path}: ${error.message}`);
  const buf = await data.arrayBuffer();
  return new Uint8Array(buf);
}

function classifyThing(t: ThingType): { object_kind: string; extraFlags: Record<string, any> } {
  const f: DatFlags = t.flags;
  let kind: string = "item";
  if (t.category === "outfit") kind = "creature";
  else if (t.category === "effect") kind = "effect";
  else if (t.category === "missile") kind = "effect";
  else if (f.isGround) kind = "ground";
  else if (f.isContainer) kind = "container";
  else if (f.isFluidContainer || f.isFluid) kind = "fluid";
  else if (f.isOnTop) kind = "wall";
  const extra: Record<string, any> = {};
  if (f.isUnpassable) extra.isSolid = true;
  if (f.blockMissile) extra.isBlockProjectile = true;
  if (f.blockPathfind) extra.isBlockPath = true;
  if (f.isContainer) extra.isContainer = true;
  if (f.isStackable) extra.isStackable = true;
  if (f.isMultiUse) extra.isUseable = true;
  if (f.isForceUse) extra.isForceUse = true;
  if (f.isPickupable) extra.isPickupable = true;
  if (f.isHangable) extra.isHangable = true;
  if (f.isRotatable) extra.isRotatable = true;
  if (f.isFullGround) extra.isFullGround = true;
  if (f.isOnTop) extra.isTop = true;
  if (f.isOnBottom) extra.isBottom = true;
  if (f.hasElevation) { extra.hasHeight = true; extra.elevation = f.elevation ?? 8; }
  if (f.hasOffset) extra.hasOffset = true;
  if (f.hasLight) { extra.hasLight = true; extra.lightLevel = f.lightLevel; extra.lightColor = f.lightColor; }
  if (f.isLyingObject) extra.isLyingCorpse = true;
  if (f.isAnimateAlways) extra.isAnimateAlways = true;
  if (f.hasMiniMap) extra.miniMapColor = f.miniMapColor;
  if (f.isGround && f.groundSpeed != null) extra.groundSpeed = f.groundSpeed;
  if (t.category === "missile") extra.isMissile = true;
  return { object_kind: kind, extraFlags: extra };
}

function catFilter(cats: Categories): Record<ThingCategory, boolean> {
  return {
    item: cats.item !== false,
    outfit: cats.outfit !== false,
    effect: cats.effect !== false,
    missile: cats.missile !== false,
  };
}

/** Load and cache parsed dat/spr for a job. */
async function loadCache(jobId: string, datPath: string, sprPath: string, categories: Categories): Promise<ParsedCache> {
  const existing = CACHE.get(jobId);
  if (existing) return existing;

  const [datBytes, sprBytes] = await Promise.all([
    downloadBucketFile(datPath),
    downloadBucketFile(sprPath),
  ]);
  const parsed = parseDat(datBytes.buffer.slice(datBytes.byteOffset, datBytes.byteOffset + datBytes.byteLength) as ArrayBuffer);
  const spr = new SprReader(sprBytes.buffer.slice(sprBytes.byteOffset, sprBytes.byteOffset + sprBytes.byteLength) as ArrayBuffer);
  const allow = catFilter(categories);
  const active: ThingType[] = [];
  if (allow.item) active.push(...parsed.items);
  if (allow.outfit) active.push(...parsed.outfits);
  if (allow.effect) active.push(...parsed.effects);
  if (allow.missile) active.push(...parsed.missiles);

  const cache: ParsedCache = { active, spr };
  CACHE.set(jobId, cache);
  return cache;
}

/** Compute total sprite grid count for one ThingType. */
function totalCells(t: ThingType): number {
  return t.width * t.height * t.layers * t.patternX * t.patternY * 1 * t.frames;
}

async function processOneThing(
  t: ThingType,
  spr: SprReader,
  hashToSpriteId: Map<string, number>,
): Promise<{ ok: boolean; op: "inserted" | "updated" | "skipped"; newSprites: number }> {
  const total = totalCells(t);
  if (total === 0 || t.spriteIds.length === 0) return { ok: true, op: "skipped", newSprites: 0 };

  // Build cells + upload missing sprites
  type Cell = { tile_hash: string; layer: number; pattern_x: number; pattern_y: number; pattern_z: number; frame: number; cell_x: number; cell_y: number };
  const cells: Cell[] = [];
  const perSpriteHash = new Map<number, string>(); // sprite dat-id -> hash
  let newSprites = 0;
  let idx = 0;
  for (let f = 0; f < t.frames; f++) {
    for (let pz = 0; pz < 1; pz++) {
      for (let py = 0; py < t.patternY; py++) {
        for (let px = 0; px < t.patternX; px++) {
          for (let l = 0; l < t.layers; l++) {
            for (let cy = 0; cy < t.height; cy++) {
              for (let cx = 0; cx < t.width; cx++) {
                const spriteId = t.spriteIds[idx++];
                if (!spriteId) continue;
                let hash = perSpriteHash.get(spriteId);
                if (!hash) {
                  const rgba = spr.getSprite(spriteId);
                  if (!rgba) continue;
                  const png = encodePng32(rgba);
                  hash = await sha1Hex(png);
                  perSpriteHash.set(spriteId, hash);

                  if (!hashToSpriteId.has(hash)) {
                    // Insert-or-lookup by hash
                    const { data: existing } = await supabaseAdmin
                      .from("game_sprites").select("id").eq("hash", hash).maybeSingle();
                    if (existing?.id) {
                      hashToSpriteId.set(hash, existing.id as number);
                    } else {
                      const path = `imported/${hash}.png`;
                      const up = await supabaseAdmin.storage.from(BUCKET)
                        .upload(path, png, { contentType: "image/png", upsert: true });
                      if (up.error && !String(up.error.message).includes("exists")) {
                        throw new Error(`upload sprite: ${up.error.message}`);
                      }
                      const ins = await supabaseAdmin.from("game_sprites").insert({
                        sheet_url: path, x: 0, y: 0, width: 32, height: 32, hash, tags: ["tibia74"],
                      }).select("id").single();
                      if (ins.error) {
                        // race: another row already inserted with this hash
                        const { data: retry } = await supabaseAdmin
                          .from("game_sprites").select("id").eq("hash", hash).maybeSingle();
                        if (!retry?.id) throw new Error(`insert sprite: ${ins.error.message}`);
                        hashToSpriteId.set(hash, retry.id as number);
                      } else {
                        hashToSpriteId.set(hash, ins.data!.id as number);
                        newSprites++;
                      }
                    }
                  }
                }
                cells.push({
                  tile_hash: hash, layer: l,
                  pattern_x: px, pattern_y: py, pattern_z: pz,
                  frame: f, cell_x: cx, cell_y: cy,
                });
              }
            }
          }
        }
      }
    }
  }

  const { object_kind, extraFlags } = classifyThing(t);
  const name =
    t.category === "outfit" ? `outfit_${t.id}` :
    t.category === "effect" ? `effect_${t.id}` :
    t.category === "missile" ? `missile_${t.id}` :
    `item_${t.id}`;

  const row = {
    name,
    object_kind,
    client_id: t.id,
    width: t.width, height: t.height, layers: t.layers,
    pattern_x: t.patternX, pattern_y: t.patternY, pattern_z: 1,
    frames: t.frames, frame_duration_ms: 500,
    flags: extraFlags,
  };

  const { data: existing } = await supabaseAdmin
    .from("game_objects").select("id")
    .eq("object_kind", object_kind).eq("client_id", t.id).maybeSingle();

  let objectId: string;
  let op: "inserted" | "updated";
  if (existing?.id) {
    objectId = existing.id as string;
    const upd = await supabaseAdmin.from("game_objects").update(row).eq("id", objectId);
    if (upd.error) throw new Error(`update object: ${upd.error.message}`);
    await supabaseAdmin.from("game_object_sprites").delete().eq("object_id", objectId);
    op = "updated";
  } else {
    const ins = await supabaseAdmin.from("game_objects").insert(row).select("id").single();
    if (ins.error) throw new Error(`insert object: ${ins.error.message}`);
    objectId = (ins.data!.id) as string;
    op = "inserted";
  }

  if (cells.length) {
    const rows = cells.map((c) => ({
      object_id: objectId,
      sprite_id: hashToSpriteId.get(c.tile_hash) ?? 0,
      layer: c.layer,
      pattern_x: c.pattern_x, pattern_y: c.pattern_y, pattern_z: c.pattern_z,
      frame: c.frame, cell_x: c.cell_x, cell_y: c.cell_y,
    })).filter((r) => r.sprite_id > 0);
    if (rows.length) {
      const ci = await supabaseAdmin.from("game_object_sprites").insert(rows);
      if (ci.error) throw new Error(`insert cells: ${ci.error.message}`);
    }
  }

  return { ok: true, op, newSprites };
}

export type ProcessBatchResult = {
  status: "running" | "completed";
  cursor: number;
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  spritesUploaded: number;
  processed: number;
  message?: string;
};

export async function runImportBatch(jobId: string, batchSize: number): Promise<ProcessBatchResult> {
  const { data: job, error: jobErr } = await supabaseAdmin
    .from("object_import_jobs").select("*").eq("id", jobId).maybeSingle();
  if (jobErr) throw new Error(jobErr.message);
  if (!job) throw new Error("job not found");
  if (job.status === "completed") {
    return {
      status: "completed", cursor: job.cursor, total: job.total,
      inserted: job.objects_inserted, updated: job.objects_updated, skipped: job.objects_skipped,
      spritesUploaded: job.sprites_uploaded, processed: 0, message: "already completed",
    };
  }
  if (job.status === "paused" || job.status === "failed") {
    // caller can flip to running; this batch is a no-op
    return {
      status: "running", cursor: job.cursor, total: job.total,
      inserted: job.objects_inserted, updated: job.objects_updated, skipped: job.objects_skipped,
      spritesUploaded: job.sprites_uploaded, processed: 0, message: `job is ${job.status}`,
    };
  }

  // Mark running (idempotent)
  await supabaseAdmin.from("object_import_jobs")
    .update({ status: "running", error: null }).eq("id", jobId);

  const cache = await loadCache(jobId, job.dat_path, job.spr_path, (job.categories as Categories) ?? {});
  // Persist total if first run
  if (job.total !== cache.active.length) {
    await supabaseAdmin.from("object_import_jobs")
      .update({ total: cache.active.length }).eq("id", jobId);
  }

  // Preload existing sprite hashes for dedup (avoids per-thing SELECT storm)
  const hashToId = new Map<string, number>();
  // (We fill it lazily inside processOneThing to keep memory bounded.)

  const start = job.cursor;
  const end = Math.min(start + batchSize, cache.active.length);
  let inserted = 0, updated = 0, skipped = 0, newSprites = 0;

  for (let i = start; i < end; i++) {
    // Re-check status every 10 items so pause takes effect quickly
    if ((i - start) > 0 && (i - start) % 10 === 0) {
      const { data: s } = await supabaseAdmin
        .from("object_import_jobs").select("status").eq("id", jobId).maybeSingle();
      if (s?.status === "paused") {
        end;
        break;
      }
    }
    try {
      const r = await processOneThing(cache.active[i], cache.spr, hashToId);
      if (r.op === "inserted") inserted++;
      else if (r.op === "updated") updated++;
      else skipped++;
      newSprites += r.newSprites;
    } catch (e: any) {
      const msg = `#${cache.active[i].id} ${cache.active[i].category}: ${e.message}`;
      await supabaseAdmin.from("object_import_jobs").update({
        status: "failed",
        error: msg,
        cursor: i,
      }).eq("id", jobId);
      throw new Error(msg);
    }
    // Update cursor after each thing so a crash is resumable
    if ((i - start) % 5 === 4 || i === end - 1) {
      await supabaseAdmin.from("object_import_jobs").update({
        cursor: i + 1,
      }).eq("id", jobId);
    }
  }

  const doneCursor = Math.min(end, cache.active.length);
  const completed = doneCursor >= cache.active.length;

  const { data: cur } = await supabaseAdmin.from("object_import_jobs")
    .select("objects_inserted, objects_updated, objects_skipped, sprites_uploaded")
    .eq("id", jobId).maybeSingle();

  const totals = {
    objects_inserted: (cur?.objects_inserted ?? 0) + inserted,
    objects_updated: (cur?.objects_updated ?? 0) + updated,
    objects_skipped: (cur?.objects_skipped ?? 0) + skipped,
    sprites_uploaded: (cur?.sprites_uploaded ?? 0) + newSprites,
  };

  await supabaseAdmin.from("object_import_jobs").update({
    cursor: doneCursor,
    status: completed ? "completed" : "running",
    ...totals,
  }).eq("id", jobId);

  if (completed) CACHE.delete(jobId);

  return {
    status: completed ? "completed" : "running",
    cursor: doneCursor,
    total: cache.active.length,
    inserted: totals.objects_inserted,
    updated: totals.objects_updated,
    skipped: totals.objects_skipped,
    spritesUploaded: totals.sprites_uploaded,
    processed: end - start,
  };
}
