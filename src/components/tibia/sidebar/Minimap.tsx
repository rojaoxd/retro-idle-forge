import { useEffect, useRef } from "react";
import { TibiaWindow } from "../primitives/TibiaWindow";

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = c.width;
    const h = c.height;
    // procedural noise: green grass, brown paths, gray walls
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = Math.random();
        let cr = 60, cg = 110, cb = 50;
        if (r < 0.18) { cr = 120; cg = 70; cb = 40; }
        else if (r < 0.28) { cr = 90; cg = 90; cb = 90; }
        else if (r < 0.31) { cr = 200; cg = 200; cb = 60; }
        img.data[i] = cr;
        img.data[i + 1] = cg;
        img.data[i + 2] = cb;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // center marker (player)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(w / 2 - 1, h / 2 - 1, 2, 2);
  }, []);

  return (
    <TibiaWindow title="Minimap">
      <div className="p-1 flex gap-1">
        <div className="flex-1 flex flex-col gap-1">
          <button className="tibia-btn text-[10px] py-[1px]">Centre</button>
          <canvas
            ref={canvasRef}
            width={106}
            height={80}
            className="tibia-inset block"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
        <div className="flex flex-col justify-between w-[38px]">
          <div className="grid grid-cols-3 gap-[2px]">
            <div />
            <button className="tibia-btn text-[10px] leading-none py-0">▲</button>
            <div />
            <button className="tibia-btn text-[10px] leading-none py-0">◄</button>
            <button className="tibia-btn text-[10px] leading-none py-0">●</button>
            <button className="tibia-btn text-[10px] leading-none py-0">►</button>
            <div />
            <button className="tibia-btn text-[10px] leading-none py-0">▼</button>
            <div />
          </div>
          <div className="flex gap-[2px]">
            <button className="tibia-btn flex-1 text-[10px] py-0">+</button>
            <button className="tibia-btn flex-1 text-[10px] py-0">−</button>
          </div>
        </div>
      </div>
    </TibiaWindow>
  );
}
