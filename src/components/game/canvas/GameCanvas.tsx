export function GameCanvas() {
  // TODO(phaser): mount Phaser.Game into this div's ref — <div ref={mountRef} />
  return (
    <div
      className="relative w-full h-full rpg-inset overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(oklch(1 0 0 / 0.04) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.04) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }}
    >
      {/* corner vignettes for that CRT feel */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, oklch(0 0 0 / 0.6) 100%)",
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
        <div className="text-6xl pixelated animate-pulse">🗺️</div>
        <p className="pixel-text text-xs text-primary">
          Game Engine Canvas
        </p>
        <p className="pixel-text text-[10px] text-muted-foreground">
          Phaser / WebGL Placeholder
        </p>
        <p className="text-muted-foreground max-w-md text-sm italic">
          The tilemap, sprites, and combat renderer will mount here once the
          engine is wired.
        </p>
      </div>
    </div>
  );
}
