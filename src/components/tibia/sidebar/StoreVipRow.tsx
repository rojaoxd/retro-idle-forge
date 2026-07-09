export function StoreVipRow() {
  return (
    <div className="tibia-bevel p-1 flex items-center gap-1">
      <button
        className="flex-1 flex items-center justify-center gap-1 font-bold"
        style={{
          background: "var(--tibia-store)",
          color: "#fff",
          textShadow: "1px 1px 0 #000",
          fontSize: 11,
          height: 22,
          boxShadow:
            "inset 1px 1px 0 0 #a0e0a0, inset -1px -1px 0 0 #204020",
        }}
      >
        <span
          style={{
            width: 14,
            height: 14,
            background: "#fff",
            color: "#2a6f2a",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 2,
            fontSize: 10,
            fontWeight: 900,
          }}
        >
          M
        </span>
        Store
      </button>
      <button
        className="tibia-btn flex items-center justify-center"
        style={{ width: 26, height: 22, fontSize: 12 }}
        title="VIP"
      >
        👥
      </button>
    </div>
  );
}

