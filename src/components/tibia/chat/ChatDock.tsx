import { useState } from "react";
import { useTibiaStore, type ChatChannel } from "@/stores/tibiaStore";

const tabColor = (t: ChatChannel, active: ChatChannel) =>
  t === active
    ? t === "serverLog"
      ? "text-[#c03030]"
      : "text-white"
    : "text-[color:var(--tibia-text-dim)]";

export function ChatDock() {
  const { chat, activeChat, setChat, sendChat, chatOn, toggleChat } = useTibiaStore();
  const [text, setText] = useState("");
  const visible = chat.filter((m) => m.channel === activeChat);

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Tabs */}
      <div className="flex items-end gap-1 px-1 pt-1 bg-[color:var(--tibia-panel-dark)]">
        <button
          onClick={() => setChat("default")}
          className={"tibia-tab px-3 py-[2px] text-[11px] " + (activeChat === "default" ? "tibia-tab-active" : "")}
        >
          <span className={tabColor("default", activeChat)}>Default</span>
        </button>
        <button
          onClick={() => setChat("serverLog")}
          className={"tibia-tab px-3 py-[2px] text-[11px] " + (activeChat === "serverLog" ? "tibia-tab-active" : "")}
        >
          <span className={tabColor("serverLog", activeChat)}>Server Log</span>
        </button>
      </div>

      {/* Messages */}
      <div className="tibia-inset flex-1 mx-1 overflow-auto p-1 leading-[1.15]" style={{ fontSize: 11 }}>
        {visible.map((m) => (
          <div key={m.id} className="whitespace-pre-wrap">
            <span className="text-[color:var(--tibia-timestamp)]">{m.ts} </span>
            {m.author && <span className="text-[#40a0ff]">{m.author}: </span>}
            <span
              className={
                m.type === "system" || m.type === "info"
                  ? "text-[color:var(--tibia-system)]"
                  : "text-white"
              }
            >
              {m.text}
            </span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-1 p-1 bg-[color:var(--tibia-panel-dark)]">
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
          className="tibia-inset flex-1 px-2 py-[2px] bg-black text-white outline-none"
          style={{ fontSize: 11 }}
        />
        <button
          onClick={toggleChat}
          className="tibia-btn px-2 py-[2px] text-[11px] flex items-center gap-1"
        >
          <span>💬</span>
          <span>{chatOn ? "Chat on" : "Chat off"}</span>
        </button>
      </div>
    </div>
  );
}
