/**
 * Tibia .spr reader (versions 7.10 - 9.55, 2-byte sprite IDs).
 * Header: u32 signature, u16 spriteCount, u32[spriteCount] offsets.
 * Each sprite (offset > 0):
 *   u8 r, u8 g, u8 b   (color key — ignored)
 *   u16 dataSize
 *   RLE blocks until dataSize consumed:
 *     u16 transparentPixels, u16 coloredPixels, {u8 r,g,b}[coloredPixels]
 * Sprite pixel order is row-major, top→bottom, left→right (32×32).
 */
export class SprReader {
  private dv: DataView;
  private bytes: Uint8Array;
  readonly signature: number;
  readonly count: number;
  readonly offsets: Uint32Array;

  constructor(buffer: ArrayBuffer) {
    this.bytes = new Uint8Array(buffer);
    this.dv = new DataView(buffer);
    this.signature = this.dv.getUint32(0, true);
    this.count = this.dv.getUint16(4, true);
    this.offsets = new Uint32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      this.offsets[i] = this.dv.getUint32(6 + i * 4, true);
    }
  }

  /** Get sprite pixels as 32×32 RGBA (Uint8Array of length 4096). id is 1-based. */
  getSprite(id: number): Uint8Array | null {
    if (id < 1 || id > this.count) return null;
    const off = this.offsets[id - 1];
    if (off === 0) return null;
    const size = this.dv.getUint16(off + 3, true);
    const start = off + 5;
    const px = new Uint8Array(32 * 32 * 4);
    let pos = start;
    const end = start + size;
    let write = 0;
    const total = 32 * 32;
    while (pos < end && write < total) {
      const trans = this.dv.getUint16(pos, true); pos += 2;
      write += trans;
      if (write > total) break;
      if (pos >= end) break;
      const colored = this.dv.getUint16(pos, true); pos += 2;
      for (let i = 0; i < colored && write < total; i++) {
        const r = this.bytes[pos++];
        const g = this.bytes[pos++];
        const b = this.bytes[pos++];
        const idx = write * 4;
        px[idx] = r; px[idx + 1] = g; px[idx + 2] = b; px[idx + 3] = 255;
        write++;
      }
    }
    return px;
  }
}
