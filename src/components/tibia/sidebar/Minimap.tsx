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
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = Math.random();
        let cr = 60, cg = 110, cb = 50;
        if (r < 0.22) { cr = 130; cg = 80; cb = 40; }
        else if (r < 0.32) { cr = 100; cg = 100; cb = 100; }
        else if (r < 0.34) { cr = 220; cg = 200; cb = 60; }
        img.data[i] = cr;
        img.data[i + 1] = cg;
        img.data[i + 2] = cb;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(w / 2 - 1, h / 2 - 1, 2, 2);
  }, []);

  return (
    <TibiaWindow title="Minimap">
      <div className="p-1 flex gap-1">
        <div className="flex-1 flex flex-col gap-1">
          <button
            className="text-[10px] font-bold"
            style={{
              background: "linear-gradient(180deg,#4fa04f,#2a6f2a)",
              color: "#fff",
              textShadow: "1px 1px 0 #000",
              boxShadow: "inset 1px 1px 0 #90d090, inset -1px -1px 0 #103010",
              height: 16,
            }}
          >
            Centre
          </button>
          <canvas
            ref={canvasRef}
            width={106}
            height={80}
            className="tibia-inset block"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
        <div className="flex flex-col justify-between w-[38px] gap-[2px]">
          <div className="grid grid-cols-3 gap-[1px]">
            <div />
            <button className="tibia-btn text-[9px] leading-none" style={{ height: 12 }}>▲</button>
            <div />
            <button className="tibia-btn text-[9px] leading-none" style={{ height: 12 }}>◄</button>
            <button className="tibia-btn text-[9px] leading-none" style={{ height: 12 }}>●</button>
            <button className="tibia-btn text-[9px] leading-none" style={{ height: 12 }}>►</button>
            <div />
            <button className="tibia-btn text-[9px] leading-none" style={{ height: 12 }}>▼</button>
            <div />
          </div>
          <div className="flex gap-[1px]">
            <button className="tibia-btn flex-1 text-[10px]" style={{ height: 14 }}>+</button>
            <button className="tibia-btn flex-1 text-[10px]" style={{ height: 14 }}>−</button>
          </div>
        </div>
      </div>
    </TibiaWindow>
  );
}
