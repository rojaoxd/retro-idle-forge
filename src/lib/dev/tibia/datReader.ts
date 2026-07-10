/**
 * Tibia .dat reader for client versions 7.40 – 7.50 (MetadataFlags2, no patternZ).
 * Header (little-endian):
 *   u32 signature
 *   u16 itemsCount     (IDs start at 100)
 *   u16 outfitsCount   (IDs start at 1)
 *   u16 effectsCount   (IDs start at 1)
 *   u16 missilesCount  (IDs start at 1)
 *
 * For each ThingType, opcodes terminated by 0xFF, then:
 *   u8 width, u8 height, [u8 exactSize if w>1||h>1],
 *   u8 layers, u8 patternX, u8 patternY, u8 frames  (no patternZ pre-7.55)
 *   u16 spriteIds[w*h*layers*patternX*patternY*frames]
 */

export type ThingCategory = "item" | "outfit" | "effect" | "missile";

export type DatFlags = {
  isGround?: boolean;      groundSpeed?: number;
  isOnBottom?: boolean;    isOnTop?: boolean;
  isContainer?: boolean;   isStackable?: boolean;
  isMultiUse?: boolean;    isForceUse?: boolean;
  isWritable?: boolean;    isWritableOnce?: boolean; maxTextLength?: number;
  isFluidContainer?: boolean; isFluid?: boolean;
  isUnpassable?: boolean;  isUnmoveable?: boolean;
  blockMissile?: boolean;  blockPathfind?: boolean;
  isPickupable?: boolean;  isHangable?: boolean;
  hasLight?: boolean;      lightLevel?: number; lightColor?: number;
  isFloorChange?: boolean; isFullGround?: boolean;
  hasElevation?: boolean;  elevation?: number;
  hasOffset?: boolean;
  hasMiniMap?: boolean;    miniMapColor?: number;
  isRotatable?: boolean;   isLyingObject?: boolean;
  isVertical?: boolean;    isHorizontal?: boolean;
  isAnimateAlways?: boolean;
  isLensHelp?: boolean;    lensHelp?: number;
};

export type ThingType = {
  category: ThingCategory;
  id: number;
  flags: DatFlags;
  width: number; height: number; exactSize: number;
  layers: number; patternX: number; patternY: number; patternZ: number; frames: number;
  spriteIds: number[]; // u16[] of length w*h*L*PX*PY*PZ*F (PZ always 1 here)
};

export type DatParseResult = {
  signature: number;
  itemsCount: number; outfitsCount: number; effectsCount: number; missilesCount: number;
  items: ThingType[]; outfits: ThingType[]; effects: ThingType[]; missiles: ThingType[];
  /** True if the file ended before all header-declared things were parsed */
  truncated: boolean;
  warnings: string[];
};

const LAST_FLAG = 0xff;

function readOpcodes(bytes: Uint8Array, dv: DataView, start: number):
  { flags: DatFlags; end: number } {
  const flags: DatFlags = {};
  let off = start;
  while (true) {
    const op = bytes[off]; off += 1;
    if (op === LAST_FLAG) break;
    switch (op) {
      case 0x00: flags.isGround = true; flags.groundSpeed = dv.getUint16(off, true); off += 2; break;
      case 0x01: flags.isOnBottom = true; break;
      case 0x02: flags.isOnTop = true; break;
      case 0x03: flags.isContainer = true; break;
      case 0x04: flags.isStackable = true; break;
      case 0x05: flags.isMultiUse = true; break;
      case 0x06: flags.isForceUse = true; break;
      case 0x07: flags.isWritable = true; flags.maxTextLength = dv.getUint16(off, true); off += 2; break;
      case 0x08: flags.isWritableOnce = true; flags.maxTextLength = dv.getUint16(off, true); off += 2; break;
      case 0x09: flags.isFluidContainer = true; break;
      case 0x0a: flags.isFluid = true; break;
      case 0x0b: flags.isUnpassable = true; break;
      case 0x0c: flags.isUnmoveable = true; break;
      case 0x0d: flags.blockMissile = true; break;
      case 0x0e: flags.blockPathfind = true; break;
      case 0x0f: flags.isPickupable = true; break;
      case 0x10: flags.hasLight = true;
        flags.lightLevel = dv.getUint16(off, true); flags.lightColor = dv.getUint16(off + 2, true);
        off += 4; break;
      case 0x11: flags.isFloorChange = true; break;
      case 0x12: flags.isFullGround = true; break;
      case 0x13: flags.hasElevation = true; flags.elevation = dv.getUint16(off, true); off += 2; break;
      case 0x14: flags.hasOffset = true; break;
      case 0x16: flags.hasMiniMap = true; flags.miniMapColor = dv.getUint16(off, true); off += 2; break;
      case 0x17: flags.isRotatable = true; break;
      case 0x18: flags.isLyingObject = true; break;
      case 0x19: flags.isHangable = true; break;
      case 0x1a: flags.isVertical = true; break;
      case 0x1b: flags.isHorizontal = true; break;
      case 0x1c: flags.isAnimateAlways = true; break;
      case 0x1d: flags.isLensHelp = true; flags.lensHelp = dv.getUint16(off, true); off += 2; break;
      default:
        throw new Error(`Unknown .dat opcode 0x${op.toString(16)} at offset 0x${(off - 1).toString(16)}`);
    }
  }
  return { flags, end: off };
}

function readThing(
  bytes: Uint8Array, dv: DataView, off: number, category: ThingCategory, id: number,
): { thing: ThingType; end: number } {
  const { flags, end: afterFlags } = readOpcodes(bytes, dv, off);
  let p = afterFlags;
  const width = bytes[p]; const height = bytes[p + 1]; p += 2;
  let exactSize = 32;
  if (width > 1 || height > 1) { exactSize = bytes[p]; p += 1; }
  const layers = bytes[p];
  const patternX = bytes[p + 1];
  const patternY = bytes[p + 2];
  const frames = bytes[p + 3];
  p += 4;
  const patternZ = 1;
  const total = width * height * layers * patternX * patternY * patternZ * frames;
  if (total > 4096) throw new Error(`Thing ${category}#${id} has ${total} sprites (>4096)`);
  const spriteIds: number[] = new Array(total);
  for (let i = 0; i < total; i++) {
    spriteIds[i] = dv.getUint16(p, true);
    p += 2;
  }
  return {
    thing: { category, id, flags, width, height, exactSize, layers, patternX, patternY, patternZ, frames, spriteIds },
    end: p,
  };
}

export function parseDat(buffer: ArrayBuffer): DatParseResult {
  const bytes = new Uint8Array(buffer);
  const dv = new DataView(buffer);
  if (bytes.length < 12) throw new Error(".dat muito pequeno");
  const signature = dv.getUint32(0, true);
  const itemsCount = dv.getUint16(4, true);
  const outfitsCount = dv.getUint16(6, true);
  const effectsCount = dv.getUint16(8, true);
  const missilesCount = dv.getUint16(10, true);

  const items: ThingType[] = [];
  const outfits: ThingType[] = [];
  const effects: ThingType[] = [];
  const missiles: ThingType[] = [];
  const warnings: string[] = [];
  let off = 12;

  const buckets: [ThingType[], ThingCategory, number, number][] = [
    [items, "item", 100, itemsCount],
    [outfits, "outfit", 1, outfitsCount],
    [effects, "effect", 1, effectsCount],
    [missiles, "missile", 1, missilesCount],
  ];

  let truncated = false;
  for (const [arr, cat, startId, count] of buckets) {
    for (let i = 0; i < count; i++) {
      if (off >= bytes.length) {
        truncated = true;
        warnings.push(`Arquivo terminou dentro de ${cat}s (${arr.length}/${count})`);
        break;
      }
      try {
        const { thing, end } = readThing(bytes, dv, off, cat, startId + i);
        arr.push(thing);
        off = end;
      } catch (e: any) {
        truncated = true;
        warnings.push(`${cat}#${startId + i}: ${e.message}`);
        break;
      }
    }
    if (truncated) break;
  }

  return {
    signature, itemsCount, outfitsCount, effectsCount, missilesCount,
    items, outfits, effects, missiles, truncated, warnings,
  };
}
