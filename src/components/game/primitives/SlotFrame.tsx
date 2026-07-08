import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children?: ReactNode;
  size?: number;
  label?: string; // corner label (e.g. hotkey number, slot name)
  rarity?: "common" | "uncommon" | "rare" | "epic" | "legendary";
  stack?: number;
  className?: string;
  onClick?: () => void;
  title?: string;
};

const rarityBorder: Record<NonNullable<Props["rarity"]>, string> = {
  common: "var(--color-rarity-common)",
  uncommon: "var(--color-rarity-uncommon)",
  rare: "var(--color-rarity-rare)",
  epic: "var(--color-rarity-epic)",
  legendary: "var(--color-rarity-legendary)",
};

export function SlotFrame({
  children,
  size = 44,
  label,
  rarity,
  stack,
  className,
  onClick,
  title,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "relative rpg-inset flex items-center justify-center select-none",
        "hover:brightness-125 active:translate-y-px transition",
        className,
      )}
      style={{
        width: size,
        height: size,
        outline: rarity ? `1px solid ${rarityBorder[rarity]}` : undefined,
        outlineOffset: rarity ? -3 : undefined,
      }}
    >
      <span className="text-xl leading-none pixelated">{children}</span>
      {label && (
        <span className="pixel-text absolute top-0.5 left-1 text-[8px] text-primary">
          {label}
        </span>
      )}
      {stack != null && stack > 1 && (
        <span className="pixel-text absolute bottom-0.5 right-1 text-[8px] text-foreground">
          {stack}
        </span>
      )}
    </button>
  );
}
