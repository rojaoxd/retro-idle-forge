import { useState } from "react";
import { useTibiaStore, type ChatChannel } from "@/stores/tibiaStore";

function ChatTab({
  id,
  label,
  active,
  color,
  onClick,
}: {
  id: ChatChannel;
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11,
        padding: "2px 10px",
        background: active ? "#000" : "#2a2a2a",
        color,
        boxShadow: active
          ? "inset 1px 1px 0 #808080, inset -1px 0 0 #808080"
          : "inset 1px 1px 0 #606060, inset -1px -1px 0 #000",
        borderTop: active ? "1px solid #808080" : "none",
        cursor: "pointer",
        minWidth: 80,
      }}
    >
      {label}
    </button>
  );
}

export function ChatDock() {
  const { chat, activeChat, setChat, sendChat, chatOn, toggleChat } = useTibiaStore();
  const [text, setText] = useState("");
  const visible = chat.filter((m) => m.channel === activeChat);

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Tabs */}
      <div className="flex items-end gap-[1px] px-1 pt-1 bg-[#1a1a1a]">
        <ChatTab
          id="default"
          label="Default"
          active={activeChat === "default"}
          color={activeChat === "default" ? "#fff" : "#909090"}
          onClick={() => setChat("default")}
        />
        <ChatTab
          id="serverLog"
          label="Server Log"
          active={activeChat === "serverLog"}
          color="#c03030"
          onClick={() => setChat("serverLog")}
        />
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-auto p-1 leading-[1.2]"
        style={{
          fontSize: 11,
          background: "#000",
          boxShadow: "inset 1px 1px 0 #000, inset -1px -1px 0 #404040",
          margin: "0 2px",
        }}
      >
        {visible.map((m) => (
          <div key={m.id} className="whitespace-pre-wrap">
            <span style={{ color: "#c0c000" }}>{m.ts} </span>
            {m.author && <span style={{ color: "#40a0ff" }}>{m.author}: </span>}
            <span
              style={{
                color: m.type === "system" || m.type === "info" ? "#c03030" : "#fff",
              }}
            >
              {m.text}
            </span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-1 p-1 bg-[#1a1a1a]">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) {
              sendChat(text.trim());
              setText("");
            }
          }}
          placeholder="Say..."
          className="tibia-inset flex-1 px-2 py-[2px] text-white outline-none"
          style={{ fontSize: 11, background: "#000" }}
        />
        <button
          onClick={toggleChat}
          className="tibia-btn px-2 py-[2px] flex items-center gap-1"
          style={{ fontSize: 11 }}
        >
          <span>💬</span>
          <span>{chatOn ? "Chat on" : "Chat off"}</span>
        </button>
      </div>
    </div>
  );
}
