/**
 * Object Builder (.obd) full decoder.
 *
 * File layout (ObjectBuilder V2, protocol 10.x):
 *   [LZMA-ALONE compressed payload]
 *   The compressed payload is a raw ThingType dump followed by sprite blocks:
 *     [properties opcodes ... 0xFF terminator]
 *     [width u8][height u8]
 *     [exactSize u8]  (only if width>1 or height>1)
 *     [layers u8][patternX u8][patternY u8][patternZ u8][frames u8]
 *     if frames > 1:
 *       [animationMode u8][loopCount i32 LE][startFrame i8]
 *       frames × ([minDuration u32 LE][maxDuration u32 LE])
 *     totalSprites × ([spriteId u32 LE][4096 ARGB bytes])
 *
 * We don't decode the property opcodes here (they differ per version). We
 * preserve them as an opaque blob and reconstruct geometry + sprites, which
 * is what the UI needs to display and animate the object.
 */
import LZMA from "lzma-web";

export type ObdSprite = {
  id: number;
  /** 32×32 RGBA bytes (already alpha-corrected) */
  rgba: Uint8Array;
};

export type ObdGeometry = {
  width: number;
  height: number;
  exactSize: number;
  layers: number;
  patternX: number;
  patternY: number;
  patternZ: number;
  frames: number;
  animationMode: number;
  loopCount: number;
  startFrame: number;
  durations: { min: number; max: number }[];
};

export type ObdParseResult = {
  ok: true;
  /** Raw bytes of the property opcode blob (before geometry) */
  propertiesBlob: Uint8Array;
  geometry: ObdGeometry;
  sprites: ObdSprite[];
} | {
  ok: false;
  reason: string;
};

async function decompressLzma(bytes: Uint8Array): Promise<Uint8Array> {
  const lzma = new LZMA();
  const result = await lzma.decompress(bytes);
  if (typeof result === "string") return new TextEncoder().encode(result);
  return result;
}

/**
 * Locate the [w,h,(exact),layers,pX,pY,pZ,frames] block by brute-force:
 * try every offset and check whether the remaining bytes exactly match
 * (animation block + totalSprites × 4100).
 */
function findGeometry(d: Uint8Array): { offset: number; geomLen: number; g: Omit<ObdGeometry, "durations"> } | null {
  const SPRITE_BLOCK = 4 + 4096;
  for (let p = 0; p < Math.min(d.length - 8, 4096); p++) {
    const w = d[p], h = d[p + 1];
    if (w < 1 || w > 8 || h < 1 || h > 8) continue;
    let cur = p + 2;
    let exact = 32;
    if (w > 1 || h > 1) {
      exact = d[cur]; cur += 1;
      if (exact < 1 || exact > 64) continue;
    }
    const layers = d[cur], patternX = d[cur + 1], patternY = d[cur + 2],
      patternZ = d[cur + 3], frames = d[cur + 4];
    if (layers < 1 || layers > 8) continue;
    if (patternX < 1 || patternX > 12) continue;
    if (patternY < 1 || patternY > 12) continue;
    if (patternZ < 1 || patternZ > 12) continue;
    if (frames < 1 || frames > 64) continue;
    const geomLen = (cur + 5) - p;

    let animLen = 0;
    if (frames > 1) animLen = 1 + 4 + 1 + frames * 8; // mode+loop+start + durations

    const total = w * h * layers * patternX * patternY * patternZ * frames;
    if (total < 1 || total > 4096) continue;

    const expectedEnd = p + geomLen + animLen + total * SPRITE_BLOCK;
    if (expectedEnd === d.length) {
      return {
        offset: p,
        geomLen,
        g: { width: w, height: h, exactSize: exact, layers, patternX, patternY, patternZ, frames,
             animationMode: 0, loopCount: 0, startFrame: 0 },
      };
    }
  }
  return null;
}

/**
 * Convert ARGB (as stored by Object Builder: A,R,G,B per pixel) to RGBA.
 * Also treat A=0 pixels as transparent black.
 */
function argbToRgba(argb: Uint8Array): Uint8Array {
  const rgba = new Uint8Array(argb.length);
  for (let i = 0; i < argb.length; i += 4) {
    const a = argb[i];
    rgba[i]     = argb[i + 1];
    rgba[i + 1] = argb[i + 2];
    rgba[i + 2] = argb[i + 3];
    rgba[i + 3] = a;
  }
  return rgba;
}

export async function parseObd(buffer: ArrayBuffer): Promise<ObdParseResult> {
  const raw = new Uint8Array(buffer);
  if (raw.length < 20) return { ok: false, reason: "Arquivo muito pequeno" };

  let d: Uint8Array;
  try {
    d = await decompressLzma(raw);
  } catch (e: any) {
    return { ok: false, reason: `Falha ao descomprimir LZMA: ${e.message}` };
  }

  const found = findGeometry(d);
  if (!found) return { ok: false, reason: "Não foi possível localizar geometria (formato não suportado)" };

  const { offset, geomLen, g } = found;
  const propertiesBlob = d.slice(0, offset);
  let cur = offset + geomLen;

  let animationMode = 0, loopCount = 0, startFrame = 0;
  const durations: { min: number; max: number }[] = [];
  if (g.frames > 1) {
    animationMode = d[cur]; cur += 1;
    loopCount = new DataView(d.buffer, d.byteOffset + cur, 4).getInt32(0, true); cur += 4;
    startFrame = new DataView(d.buffer, d.byteOffset + cur, 1).getInt8(0); cur += 1;
    for (let i = 0; i < g.frames; i++) {
      const dv = new DataView(d.buffer, d.byteOffset + cur, 8);
      durations.push({ min: dv.getUint32(0, true), max: dv.getUint32(4, true) });
      cur += 8;
    }
  }

  const total = g.width * g.height * g.layers * g.patternX * g.patternY * g.patternZ * g.frames;
  const sprites: ObdSprite[] = [];
  for (let i = 0; i < total; i++) {
    const id = new DataView(d.buffer, d.byteOffset + cur, 4).getUint32(0, true);
    cur += 4;
    const argb = d.slice(cur, cur + 4096);
    cur += 4096;
    sprites.push({ id, rgba: argbToRgba(argb) });
  }

  return {
    ok: true,
    propertiesBlob,
    geometry: { ...g, animationMode, loopCount, startFrame, durations },
    sprites,
  };
}

/** Convert a 32×32 RGBA sprite to a PNG (base64) + SHA-1 hash. */
export async function spriteToTile(
  sprite: ObdSprite,
  index: number,
): Promise<{ hash: string; base64Png: string; width: number; height: number; index: number }> {
  const canvas = document.createElement("canvas");
  canvas.width = 32; canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  const img = new ImageData(new Uint8ClampedArray(sprite.rgba), 32, 32);
  ctx.putImageData(img, 0, 0);
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"),
  );
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const digest = await crypto.subtle.digest("SHA-1", bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return { hash, base64Png: btoa(bin), width: 32, height: 32, index };
}
