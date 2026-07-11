/**
 * OTBM v1/v2 parser (Tibia 7.4 world.otbm).
 *
 * Reads the node tree and emits one JSON per tile to stdout.
 * Stream-friendly: constant memory, no full-tree materialization.
 *
 * Usage:
 *   bun scripts/otserv-import/parse-otbm.ts <world.otbm> > out/tiles.jsonl
 */

import fs from "node:fs";

const NODE_START = 0xfe;
const NODE_END = 0xff;
const ESCAPE = 0xfd;

// node types
const OTBM_MAP_DATA = 2;
const OTBM_TILE_AREA = 4;
const OTBM_TILE = 5;
const OTBM_ITEM = 6;
const OTBM_HOUSETILE = 14;

// attribute types
const ATTR_TILE_FLAGS = 3;
const ATTR_ACTION_ID = 4;
const ATTR_UNIQUE_ID = 5;
const ATTR_TEXT = 6;
const ATTR_TELE_DEST = 8;
const ATTR_ITEM = 9;
const ATTR_DEPOT_ID = 10;
const ATTR_RUNE_CHARGES = 12;
const ATTR_HOUSEDOORID = 14;
const ATTR_COUNT = 15;
const ATTR_MAP_DESCRIPTION = 128;
const ATTR_MAP_SPAWN_FILE = 129;
const ATTR_MAP_HOUSE_FILE = 130;

class Reader {
  pos = 0;
  constructor(public buf: Buffer) {}
  u8() { return this.buf[this.pos++]; }
  u16() { const v = this.buf.readUInt16LE(this.pos); this.pos += 2; return v; }
  u32() { const v = this.buf.readUInt32LE(this.pos); this.pos += 4; return v; }
  str() {
    const len = this.u16();
    const s = this.buf.toString("latin1", this.pos, this.pos + len);
    this.pos += len;
    return s;
  }
  peek() { return this.buf[this.pos]; }
  atEnd() { return this.pos >= this.buf.length; }
}

/**
 * Read raw node payload (bytes until matching NODE_END, respecting escapes and nesting).
 * Returns { propsBuffer, childrenStartPos } — properties are the unescaped bytes
 * BEFORE the first child NODE_START; children we walk from childrenStartPos.
 */
type NodeSpan = { type: number; propsEnd: number; nodeEnd: number };

/** Walk into a node that starts AT r.pos (r.pos points to the byte right after NODE_START).
 *  Returns the type and updates r.pos to point just past this node's NODE_END. */
function enterNode(r: Reader): { type: number; propsEnd: number; childrenStart: number; nodeEnd: number } {
  const type = r.u8();
  const propsStart = r.pos;
  // Walk raw bytes to find where properties end (first unescaped NODE_START) or nodeEnd
  let p = r.pos;
  const buf = r.buf;
  let propsEnd = -1;
  let depth = 1;
  while (p < buf.length) {
    const b = buf[p];
    if (b === ESCAPE) { p += 2; continue; }
    if (b === NODE_START) { if (propsEnd < 0) propsEnd = p; depth++; p++; continue; }
    if (b === NODE_END) {
      depth--;
      if (depth === 0) {
        if (propsEnd < 0) propsEnd = p;
        const childrenStart = propsEnd < p ? propsEnd : p;
        return { type, propsEnd, childrenStart, nodeEnd: p + 1 };
      }
      p++; continue;
    }
    p++;
  }
  throw new Error("unterminated node");
}

/** Return an unescaped Buffer from [start, end) of the source buffer. */
function unescape(buf: Buffer, start: number, end: number): Buffer {
  const out: number[] = [];
  for (let i = start; i < end; i++) {
    const b = buf[i];
    if (b === ESCAPE) { out.push(buf[++i]); continue; }
    out.push(b);
  }
  return Buffer.from(out);
}

type ItemRow = {
  id: number;
  count?: number;
  aid?: number;
  uid?: number;
  text?: string;
  dest?: { x: number; y: number; z: number };
  depot?: number;
  charges?: number;
  door?: number;
  contents?: ItemRow[];
};

function readItemProps(r: Reader, endPos: number): Omit<ItemRow, "id"> {
  const out: any = {};
  try {
    while (r.pos < endPos) {
      const attr = r.u8();
      switch (attr) {
        case ATTR_COUNT:        out.count = r.u8(); break;
        case ATTR_ACTION_ID:    out.aid = r.u16(); break;
        case ATTR_UNIQUE_ID:    out.uid = r.u16(); break;
        case ATTR_TEXT:         out.text = r.str(); break;
        case ATTR_TELE_DEST:    out.dest = { x: r.u16(), y: r.u16(), z: r.u8() }; break;
        case ATTR_DEPOT_ID:     out.depot = r.u16(); break;
        case ATTR_RUNE_CHARGES: out.charges = r.u8(); break;
        case ATTR_HOUSEDOORID:  out.door = r.u8(); break;
        default:
          return out; // unknown attr, stop
      }
    }
  } catch {
    // truncated/garbled props — return what we got
  }
  return out;
}

/** Reads an item node whose body begins at `bodyStart` (byte AFTER type byte). */
function readItemAt(
  buf: Buffer,
  bodyStart: number,
  span: { propsEnd: number; childrenStart: number; nodeEnd: number },
): ItemRow {
  const propsBuf = unescape(buf, bodyStart, span.propsEnd);
  const pr = new Reader(propsBuf);
  const id = pr.u16();
  const rest = readItemProps(pr, propsBuf.length);
  const item: ItemRow = { id, ...rest };
  walkChildren(buf, span.childrenStart, span.nodeEnd, (childBodyStart, cSpan) => {
    if (cSpan.type !== OTBM_ITEM) return;
    (item.contents ||= []).push(readItemAt(buf, childBodyStart, cSpan));
  });
  return item;
}

type TileRow = {
  x: number; y: number; z: number;
  ground_id: number | null;
  items: ItemRow[];
  house_id?: number;
  tile_flags?: number;
};

function main() {
  const path = process.argv[2];
  if (!path) { console.error("usage: parse-otbm <file.otbm>"); process.exit(1); }
  const buf = fs.readFileSync(path);
  // header: 4 bytes version, then root node
  if (buf.readUInt32LE(0) !== 0) {
    process.stderr.write(`warn: header version = ${buf.readUInt32LE(0)}\n`);
  }
  const r = new Reader(buf);
  r.pos = 4;
  if (r.u8() !== NODE_START) throw new Error("expected root NODE_START");
  const root = enterNode(r);
  // root props: u32 version, u16 width, u16 height, u32 itemsMajor, u32 itemsMinor
  const rootProps = unescape(buf, r.pos, root.propsEnd);
  const rp = new Reader(rootProps);
  const otbmVersion = rp.u32();
  const width = rp.u16(); const height = rp.u16();
  const itemsMajor = rp.u32(); const itemsMinor = rp.u32();
  process.stderr.write(`OTBM v${otbmVersion} ${width}x${height} items ${itemsMajor}.${itemsMinor}\n`);

  let tileCount = 0;
  // walk root children
  walkChildren(buf, root.childrenStart, root.nodeEnd, (childBufPos, childSpan) => {
    if (childSpan.type !== OTBM_MAP_DATA) return;
    // MAP_DATA props: attrs (map description, spawn file, house file)
    const mdPropsEnd = childSpan.propsEnd;
    const mdStart = childBufPos + 1; // after type byte
    const mdPropsBuf = unescape(buf, mdStart, mdPropsEnd);
    const mdr = new Reader(mdPropsBuf);
    while (mdr.pos < mdPropsBuf.length) {
      const a = mdr.u8();
      if (a === ATTR_MAP_DESCRIPTION || a === ATTR_MAP_SPAWN_FILE || a === ATTR_MAP_HOUSE_FILE) mdr.str();
      else break;
    }
    // walk map-data children: tile areas
    walkChildren(buf, childSpan.childrenStart, childSpan.nodeEnd, (areaBufPos, areaSpan) => {
      if (areaSpan.type !== OTBM_TILE_AREA) return;
      const areaPropsBuf = unescape(buf, areaBufPos + 1, areaSpan.propsEnd);
      const apr = new Reader(areaPropsBuf);
      const baseX = apr.u16(), baseY = apr.u16(), baseZ = apr.u8();
      // walk tiles
      walkChildren(buf, areaSpan.childrenStart, areaSpan.nodeEnd, (tileBufPos, tileSpan) => {
        if (tileSpan.type !== OTBM_TILE && tileSpan.type !== OTBM_HOUSETILE) return;
        const tPropsBuf = unescape(buf, tileBufPos + 1, tileSpan.propsEnd);
        const tpr = new Reader(tPropsBuf);
        const dx = tpr.u8(), dy = tpr.u8();
        const row: TileRow = {
          x: baseX + dx, y: baseY + dy, z: baseZ,
          ground_id: null, items: [],
        };
        if (tileSpan.type === OTBM_HOUSETILE) row.house_id = tpr.u32();
        while (tpr.pos < tPropsBuf.length) {
          const a = tpr.u8();
          if (a === ATTR_TILE_FLAGS) row.tile_flags = tpr.u32();
          else if (a === ATTR_ITEM) row.ground_id = tpr.u16();
          else if (a === ATTR_ACTION_ID) row.items.push({ id: 0, aid: tpr.u16() } as any);
          else if (a === ATTR_UNIQUE_ID) row.items.push({ id: 0, uid: tpr.u16() } as any);
          else break;
        }
        // walk item children
        walkChildren(buf, tileSpan.childrenStart, tileSpan.nodeEnd, (itemBufPos, itemSpan) => {
          if (itemSpan.type !== OTBM_ITEM) return;
          row.items.push(readItemAt(buf, itemBufPos + 1, itemSpan));
        });
        process.stdout.write(JSON.stringify(row) + "\n");
        tileCount++;
        if (tileCount % 50000 === 0) process.stderr.write(`  ${tileCount} tiles...\n`);
      });
    });
  });
  process.stderr.write(`done. ${tileCount} tiles.\n`);
}

function walkChildren(
  buf: Buffer,
  start: number,
  end: number,
  cb: (nodeBufPos: number, span: { type: number; propsEnd: number; childrenStart: number; nodeEnd: number }) => void,
) {
  let p = start;
  while (p < end - 1) {
    const b = buf[p];
    if (b === ESCAPE) { p += 2; continue; }
    if (b === NODE_START) {
      const r = new Reader(buf); r.pos = p + 1;
      const span = enterNode(r);
      cb(p + 1, span);
      p = span.nodeEnd;
      continue;
    }
    if (b === NODE_END) break;
    p++;
  }
}

main();
