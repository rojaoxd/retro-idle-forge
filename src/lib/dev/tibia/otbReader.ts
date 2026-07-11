// Minimal OTB parser for items.otb (server-safe: pure ES).
// Extracts server_id -> client_id mapping and item group/flags.
// Format: 4-byte version, then a tree of nodes delimited by 0xFE (start) / 0xFF (end),
// with 0xFD as an escape byte inside attribute payloads.

const NODE_START = 0xfe;
const NODE_END = 0xff;
const ESCAPE = 0xfd;

const ATTR_SERVERID = 0x10;
const ATTR_CLIENTID = 0x11;
const ATTR_NAME = 0x17;
const ATTR_SPRITEHASH = 0x20;
const ATTR_MINIMAPCOLOR = 0x21;
const ATTR_MAXITEMS = 0x25;
const ATTR_TOPORDER = 0x2b;
const ATTR_LIGHT2 = 0x2a;

export type OtbItem = {
  serverId: number | null;
  clientId: number | null;
  name: string | null;
  group: number;
  flags: number;
  topOrder: number | null;
  minimapColor: number | null;
  lightLevel: number | null;
  lightColor: number | null;
};

export type OtbParseResult = {
  majorVersion: number;
  minorVersion: number;
  buildNumber: number;
  items: OtbItem[];
};

export function parseOtb(buffer: ArrayBuffer): OtbParseResult {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let pos = 4; // skip u32 version prefix

  function readEscaped(len: number): Uint8Array {
    const out = new Uint8Array(len);
    let n = 0;
    while (n < len) {
      const b = bytes[pos++];
      if (b === ESCAPE) out[n++] = bytes[pos++];
      else out[n++] = b;
    }
    return out;
  }

  function readAttrHeader(): { attr: number; len: number } {
    const attr = bytes[pos++];
    const len = view.getUint16(pos, true); pos += 2;
    return { attr, len };
  }

  // Root node
  if (bytes[pos] !== NODE_START) throw new Error(`OTB: expected root start at ${pos}`);
  pos++; // consume FE
  pos++; // root type (0)
  pos += 4; // root flags

  let majorVersion = 0, minorVersion = 0, buildNumber = 0;
  // Root attributes until first child (FE) or END (FF)
  while (pos < bytes.length && bytes[pos] !== NODE_START && bytes[pos] !== NODE_END) {
    const { attr, len } = readAttrHeader();
    const val = readEscaped(len);
    if (attr === 0x01 && len >= 12) {
      const dv = new DataView(val.buffer, val.byteOffset, val.byteLength);
      majorVersion = dv.getUint32(0, true);
      minorVersion = dv.getUint32(4, true);
      buildNumber = dv.getUint32(8, true);
    }
  }

  const items: OtbItem[] = [];
  while (pos < bytes.length && bytes[pos] === NODE_START) {
    pos++; // FE
    const group = bytes[pos++];
    const flags = view.getUint32(pos, true); pos += 4;

    const item: OtbItem = {
      serverId: null, clientId: null, name: null,
      group, flags,
      topOrder: null, minimapColor: null,
      lightLevel: null, lightColor: null,
    };

    while (pos < bytes.length && bytes[pos] !== NODE_END) {
      if (bytes[pos] === NODE_START) {
        // Skip unexpected nested node
        pos++;
        let depth = 1;
        while (depth > 0 && pos < bytes.length) {
          const b = bytes[pos++];
          if (b === ESCAPE) { pos++; continue; }
          if (b === NODE_START) depth++;
          else if (b === NODE_END) depth--;
        }
        continue;
      }
      const { attr, len } = readAttrHeader();
      const val = readEscaped(len);
      const dv = new DataView(val.buffer, val.byteOffset, val.byteLength);
      switch (attr) {
        case ATTR_SERVERID:
          if (len >= 2) item.serverId = dv.getUint16(0, true);
          break;
        case ATTR_CLIENTID:
          if (len >= 2) item.clientId = dv.getUint16(0, true);
          break;
        case ATTR_NAME:
          item.name = new TextDecoder("latin1").decode(val).replace(/\u0000+$/g, "");
          break;
        case ATTR_MINIMAPCOLOR:
          if (len >= 2) item.minimapColor = dv.getUint16(0, true);
          break;
        case ATTR_TOPORDER:
          if (len >= 1) item.topOrder = dv.getUint8(0);
          break;
        case ATTR_LIGHT2:
          if (len >= 4) {
            item.lightLevel = dv.getUint16(0, true);
            item.lightColor = dv.getUint16(2, true);
          }
          break;
        case ATTR_SPRITEHASH:
        case ATTR_MAXITEMS:
        default:
          // ignore
          break;
      }
    }
    if (bytes[pos] !== NODE_END) throw new Error(`OTB: expected item end at ${pos}`);
    pos++; // consume FF
    items.push(item);
  }

  return { majorVersion, minorVersion, buildNumber, items };
}
