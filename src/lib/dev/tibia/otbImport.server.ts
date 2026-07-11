// Server-only OTB import: parses items.otb from storage and upserts
// otserv_items.client_id (and inserts stub rows for unknown server_ids).
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseOtb, type OtbItem } from "@/lib/dev/tibia/otbReader";

const BUCKET = "game-sprites";

function groupToKind(g: number): string {
  // OTB item groups (Tibia 7.x): 0 none, 1 ground, 2 container, 3 weapon, 4 ammo,
  // 5 armor, 6 charges, 7 teleport, 8 magicfield, 9 writable, 10 key, 11 splash,
  // 12 fluid, 13 door, 14 deprecated
  switch (g) {
    case 1: return "ground";
    case 2: return "container";
    case 7: return "teleport";
    case 8: return "magicfield";
    case 11: return "splash";
    case 12: return "fluid";
    case 13: return "door";
    default: return "item";
  }
}

export type OtbImportResult = {
  version: { major: number; minor: number; build: number };
  parsed: number;
  updated: number;
  inserted: number;
  unchanged: number;
  errors: string[];
};

export async function runOtbImport(otbPath: string): Promise<OtbImportResult> {
  const { data: file, error: dlErr } = await supabaseAdmin.storage.from(BUCKET).download(otbPath);
  if (dlErr) throw new Error(`otb download: ${dlErr.message}`);
  const buf = await file.arrayBuffer();
  const parsed = parseOtb(buf);

  const errors: string[] = [];
  let updated = 0, inserted = 0, unchanged = 0;

  // Batch fetch existing rows in chunks to know which need INSERT vs UPDATE.
  const items = parsed.items.filter((i) => i.serverId != null);
  const CHUNK = 500;
  for (let i = 0; i < items.length; i += CHUNK) {
    const slice = items.slice(i, i + CHUNK);
    const ids = slice.map((s) => s.serverId as number);
    const { data: existing, error: selErr } = await supabaseAdmin
      .from("otserv_items")
      .select("id, client_id, attributes, flags")
      .in("id", ids);
    if (selErr) throw new Error(`select existing: ${selErr.message}`);
    const byId = new Map<number, { id: number; client_id: number | null; attributes: any; flags: any }>();
    for (const r of existing ?? []) byId.set(Number(r.id), r as any);

    const toInsert: any[] = [];
    const toUpdate: { id: number; patch: any }[] = [];

    for (const it of slice) {
      const sid = it.serverId as number;
      const cid = it.clientId;
      const cur = byId.get(sid);
      const otbAttrs = otbExtras(it);
      if (!cur) {
        toInsert.push({
          id: sid,
          client_id: cid,
          name: it.name && it.name.length > 0 ? it.name : `item_${sid}`,
          flags: { otb: it.flags, group: it.group },
          attributes: { otb: otbAttrs },
        });
      } else {
        const patch: any = {};
        if (cur.client_id !== cid) patch.client_id = cid;
        const mergedFlags = { ...(cur.flags ?? {}), otb: it.flags, group: it.group };
        patch.flags = mergedFlags;
        const mergedAttrs = { ...(cur.attributes ?? {}), otb: otbAttrs };
        patch.attributes = mergedAttrs;
        if (Object.keys(patch).length === 0) unchanged++;
        else toUpdate.push({ id: sid, patch });
      }
    }

    if (toInsert.length) {
      const { error } = await supabaseAdmin.from("otserv_items").insert(toInsert);
      if (error) errors.push(`insert chunk @${i}: ${error.message}`);
      else inserted += toInsert.length;
    }
    for (const u of toUpdate) {
      const { error } = await supabaseAdmin.from("otserv_items").update(u.patch).eq("id", u.id);
      if (error) errors.push(`update id=${u.id}: ${error.message}`);
      else updated++;
    }
  }

  return {
    version: { major: parsed.majorVersion, minor: parsed.minorVersion, build: parsed.buildNumber },
    parsed: items.length,
    updated, inserted, unchanged,
    errors: errors.slice(0, 20),
  };
}

function otbExtras(i: OtbItem) {
  return {
    kind: groupToKind(i.group),
    topOrder: i.topOrder,
    minimapColor: i.minimapColor,
    lightLevel: i.lightLevel,
    lightColor: i.lightColor,
  };
}
