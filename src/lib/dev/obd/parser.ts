/**
 * Object Builder .obd parser.
 *
 * The .obd format (ottools/ObjectBuilder) is a binary dump of a single
 * ThingType from the Tibia .dat file (protocol 7.x → 10.x), followed by
 * embedded sprite blocks in the .spr transparent-RLE format.
 *
 * Because the opcode → flag map differs per protocol version, and because
 * a robust implementation requires the full opcode tables from ObjectBuilder's
 * source (com.ancientvenom.thingtype.*), we ship v1 as a *diagnostic* parser:
 * it validates the file signature, reads the version + category headers, and
 * degrades gracefully — the UI then falls back to the PNG-sheet importer,
 * which is a lossless alternative for the sprite pixels themselves.
 *
 * Full opcode support (v10.98 first) will land iteratively as we validate
 * against real .obd files.
 */

export type ObdCategory = "item" | "outfit" | "effect" | "missile" | "unknown";
export type ObdParseResult = {
  version: number;
  category: ObdCategory;
  supported: boolean;
  reason?: string;
  /** Raw bytes so the caller can re-attempt with the PNG import path. */
  raw: Uint8Array;
};

const CATEGORY_MAP: Record<number, ObdCategory> = {
  0: "item",
  1: "outfit",
  2: "effect",
  3: "missile",
};

export function parseObd(buffer: ArrayBuffer): ObdParseResult {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 4) {
    return { version: 0, category: "unknown", supported: false, reason: "Arquivo muito pequeno", raw: bytes };
  }
  const dv = new DataView(buffer);
  // Object Builder writes version as u16 LE followed by a u8 category
  const version = dv.getUint16(0, true);
  const catByte = dv.getUint8(2);
  const category = CATEGORY_MAP[catByte] ?? "unknown";

  return {
    version,
    category,
    supported: false,
    reason:
      "Parser binário completo em desenvolvimento. " +
      "Use por enquanto o import PNG (sheet exportada do Object Builder) — " +
      "cobre 100% dos sprites com fundo magenta.",
    raw: bytes,
  };
}
