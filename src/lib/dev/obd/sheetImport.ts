/**
 * Client-side utilities to slice an Object Builder-exported PNG sheet
 * (magenta background) into 32×32 tiles ready for import.
 */

export type Tile = {
  hash: string;
  base64Png: string;
  width: number;
  height: number;
  /** original index in row-major order (row * cols + col) */
  index: number;
};

async function sha1Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

export async function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = url;
    });
  } finally {
    // revoke after decode
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

/**
 * Slice sheet into tileSize×tileSize tiles, replace magenta (#FF00FF ±2)
 * with alpha=0, and hash each tile.
 */
export async function sliceSheet(
  img: HTMLImageElement,
  tileSize = 32,
): Promise<{ tiles: Tile[]; cols: number; rows: number }> {
  const cols = Math.floor(img.width / tileSize);
  const rows = Math.floor(img.height / tileSize);
  if (cols === 0 || rows === 0) throw new Error(`Imagem menor que ${tileSize}px`);

  const tileCanvas = document.createElement("canvas");
  tileCanvas.width = tileSize;
  tileCanvas.height = tileSize;
  const tctx = tileCanvas.getContext("2d")!;
  tctx.imageSmoothingEnabled = false;

  const tiles: Tile[] = [];
  for (let ry = 0; ry < rows; ry++) {
    for (let cx = 0; cx < cols; cx++) {
      tctx.clearRect(0, 0, tileSize, tileSize);
      tctx.drawImage(
        img,
        cx * tileSize, ry * tileSize, tileSize, tileSize,
        0, 0, tileSize, tileSize,
      );
      const data = tctx.getImageData(0, 0, tileSize, tileSize);
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        // magenta key (FF00FF) with small tolerance
        if (px[i] > 250 && px[i + 1] < 8 && px[i + 2] > 250) {
          px[i + 3] = 0;
        }
      }
      tctx.putImageData(data, 0, 0);
      const bytes = await canvasToPngBytes(tileCanvas);
      const hash = await sha1Hex(bytes);
      tiles.push({
        hash,
        base64Png: bytesToBase64(bytes),
        width: tileSize,
        height: tileSize,
        index: ry * cols + cx,
      });
    }
  }
  return { tiles, cols, rows };
}

/**
 * Given a Thing shape (W×H×Layers×PatternX×PatternY×PatternZ×Frames), the
 * Tibia convention concatenates sprites in this loop order (outer → inner):
 *   frames → patternZ → patternY → patternX → layers → (cell_y, cell_x)
 * where cell iteration is bottom-right → top-left within a multi-tile object.
 * This helper returns the composition cells that map tile index → coords.
 */
export function tilesToComposition(
  tiles: Tile[],
  shape: {
    width: number;
    height: number;
    layers: number;
    pattern_x: number;
    pattern_y: number;
    pattern_z: number;
    frames: number;
  },
): { sprite_id_index: number; cell_x: number; cell_y: number; layer: number;
     pattern_x: number; pattern_y: number; pattern_z: number; frame: number }[] {
  const { width: W, height: H, layers: L,
    pattern_x: PX, pattern_y: PY, pattern_z: PZ, frames: F } = shape;
  const expected = W * H * L * PX * PY * PZ * F;
  const out: ReturnType<typeof tilesToComposition> = [];
  let i = 0;
  for (let f = 0; f < F; f++) {
    for (let pz = 0; pz < PZ; pz++) {
      for (let py = 0; py < PY; py++) {
        for (let px = 0; px < PX; px++) {
          for (let l = 0; l < L; l++) {
            // cell order matches Tibia .dat: y from top-down, x from left-right
            for (let cy = 0; cy < H; cy++) {
              for (let cx = 0; cx < W; cx++) {
                if (i >= tiles.length) return out;
                out.push({
                  sprite_id_index: i,
                  cell_x: cx, cell_y: cy,
                  layer: l,
                  pattern_x: px, pattern_y: py, pattern_z: pz,
                  frame: f,
                });
                i++;
              }
            }
          }
        }
      }
    }
  }
  if (expected !== tiles.length) {
    // Not fatal — user can adjust shape and re-map.
    console.warn(`sheet has ${tiles.length} tiles but shape expects ${expected}`);
  }
  return out;
}
