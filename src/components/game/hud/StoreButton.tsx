import { ShoppingBag } from "lucide-react";

export function StoreButton() {
  return (
    <button
      type="button"
      // TODO: payment gateway integration (Stripe/Paddle) via Lovable payments.
      onClick={() => console.info("[store] open store — payments not wired yet")}
      className="rpg-bevel px-3 py-2 flex items-center gap-2 hover:brightness-110 active:translate-y-px"
      style={{
        background:
          "linear-gradient(180deg, var(--color-gold) 0%, color-mix(in oklab, var(--color-gold) 55%, black) 100%)",
        color: "oklch(0.18 0.02 60)",
      }}
    >
      <ShoppingBag size={16} />
      <span className="pixel-text text-[10px]">Store</span>
    </button>
  );
}
