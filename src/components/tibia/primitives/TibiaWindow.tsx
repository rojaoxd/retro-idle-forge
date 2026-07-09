import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TibiaWindow({
  title,
  children,
  className,
  right,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  right?: ReactNode;
}) {
  return (
    <div className={cn("tibia-bevel bg-[color:var(--tibia-panel)] flex flex-col", className)}>
      <div className="tibia-header flex items-center justify-between px-1 py-[1px]">
        <span className="flex items-center gap-1 text-white font-bold" style={{ fontSize: 10, textShadow: "1px 1px 0 #000" }}>
          <span className="text-[color:var(--tibia-accent-green)]">◆</span>
          {title}
        </span>
        <div className="flex items-center gap-[2px]">
          {right}
          <button className="tibia-btn leading-none" style={{ width: 12, height: 12, fontSize: 9 }}>_</button>
          <button className="tibia-btn leading-none" style={{ width: 12, height: 12, fontSize: 9 }}>×</button>
        </div>
      </div>
      <div className="flex flex-col min-h-0 flex-1">{children}</div>
    </div>
  );
}
