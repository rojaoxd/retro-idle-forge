export function StoreVipRow() {
  return (
    <div className="tibia-bevel p-1 flex items-center gap-1">
      <button
        className="flex-1 flex items-center justify-center gap-1 font-bold"
        style={{
          background: "linear-gradient(180deg,#6cc06c,#2a7a2a)",
          color: "#fff",
          textShadow: "1px 1px 0 #000",
          fontSize: 11,
          height: 20,
          boxShadow: "inset 1px 1px 0 #a0e0a0, inset -1px -1px 0 #103010",
        }}
      >
        <span
          style={{
            width: 14,
            height: 14,
            background: "#fff",
            color: "#c00000",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 900,
            borderRadius: 2,
          }}
        >
          M
        </span>
        Store
      </button>
      <button
        className="tibia-btn flex items-center justify-center"
        style={{ width: 24, height: 20, fontSize: 12 }}
        title="VIP"
      >
        <span style={{ color: "#ffb040" }}>♦</span>
      </button>
    </div>
  );
}
