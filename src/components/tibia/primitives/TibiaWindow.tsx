import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TibiaWindow({
  title,
  children,
  className,
  icon,
  right,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className={cn("tibia-bevel flex flex-col", className)}>
      <div
        className="flex items-center justify-between px-1"
        style={{
          background: "linear-gradient(180deg,#c8c8c8 0%,#8a8a8a 100%)",
          height: 14,
          boxShadow: "inset 0 -1px 0 #000",
        }}
      >
        <span
          className="flex items-center gap-1 font-bold"
          style={{ fontSize: 10, color: "#000" }}
        >
          {icon ?? <span style={{ color: "#2a6f2a" }}>◆</span>}
          {title}
        </span>
        <div className="flex items-center gap-[2px]">
          {right}
          <button
            className="leading-none flex items-center justify-center"
            style={{
              width: 11,
              height: 11,
              fontSize: 9,
              background: "#c0c0c0",
              color: "#000",
              boxShadow: "inset 1px 1px 0 #fff, inset -1px -1px 0 #404040",
            }}
          >
            _
          </button>
          <button
            className="leading-none flex items-center justify-center"
            style={{
              width: 11,
              height: 11,
              fontSize: 9,
              background: "#c0c0c0",
              color: "#000",
              boxShadow: "inset 1px 1px 0 #fff, inset -1px -1px 0 #404040",
            }}
          >
            ×
          </button>
        </div>
      </div>
      <div className="flex flex-col min-h-0 flex-1">{children}</div>
    </div>
  );
}
