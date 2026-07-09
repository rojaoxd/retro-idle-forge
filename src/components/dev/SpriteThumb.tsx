import { useEffect, useRef } from "react";

/** Draws a slice of a sheet image onto a canvas. */
export function SpriteThumb({
  sheetUrl,
  x,
  y,
  width,
  height,
  scale = 2,
  className,
}: {
  sheetUrl: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!sheetUrl) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.imageSmoothingEnabled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, x, y, width, height, 0, 0, width * scale, height * scale);
    };
    img.src = sheetUrl;
  }, [sheetUrl, x, y, width, height, scale]);
  return (
    <canvas
      ref={ref}
      className={className}
      style={{
        imageRendering: "pixelated",
        background:
          "repeating-conic-gradient(#1f2937 0% 25%, #111827 0% 50%) 50% / 12px 12px",
      }}
    />
  );
}
