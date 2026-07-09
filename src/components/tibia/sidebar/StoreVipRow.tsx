export function StoreVipRow() {
  return (
    <div className="tibia-bevel bg-[color:var(--tibia-panel)] p-1 flex items-center gap-1">
      <button
        className="tibia-btn flex-1 flex items-center justify-center gap-1 font-bold"
        style={{
          background: "linear-gradient(180deg,#4fa04f,#2a6f2a)",
          color: "#fff",
          textShadow: "1px 1px 0 #000",
          fontSize: 11,
          height: 22,
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
