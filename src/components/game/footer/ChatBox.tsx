import { useState, useRef, useEffect, type FormEvent } from "react";
import { MessageSquare, Send } from "lucide-react";
import { RpgWindow } from "../panels/RpgWindow";
import { useGameStore, type ChatTab } from "@/stores/gameStore";
import { cn } from "@/lib/utils";

const tabs: { id: ChatTab; label: string; color: string }[] = [
  { id: "server", label: "Server", color: "var(--color-gold)" },
  { id: "local", label: "Local", color: "var(--color-foreground)" },
  { id: "party", label: "Party", color: "var(--color-mp)" },
  { id: "trade", label: "Trade", color: "var(--color-xp)" },
];

export function ChatBox() {
  const chat = useGameStore((s) => s.chat);
  const setTab = useGameStore((s) => s.setChatTab);
  const send = useGameStore((s) => s.sendChat);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = chat.messages.filter((m) => m.tab === chat.activeTab);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [chat.messages.length, chat.activeTab]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    // TODO(ws): forward to server via WebSocket channel per tab.
    send(chat.activeTab, draft.trim());
    setDraft("");
  };

  return (
    <RpgWindow
      title="Chat"
      icon={<MessageSquare size={12} />}
      className="w-full h-full"
    >
      <div className="flex flex-col h-full">
        <div className="flex gap-1 px-2 pt-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "pixel-text text-[9px] px-2 py-1 rpg-inset",
                chat.activeTab === t.id && "bg-panel-header",
              )}
              style={{ color: chat.activeTab === t.id ? t.color : undefined }}
            >
              {t.label.toUpperCase()}
            </button>
          ))}
        </div>
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1"
        >
          {visible.length === 0 && (
            <div className="text-muted-foreground italic text-xs">
              No messages in this channel.
            </div>
          )}
          {visible.map((m) => {
            const tabDef = tabs.find((t) => t.id === m.tab)!;
            return (
              <div key={m.id} className="text-sm leading-tight">
                <span
                  className="pixel-text text-[9px] mr-2"
                  style={{ color: tabDef.color }}
                >
                  [{tabDef.label}]
                </span>
                <span className="text-primary">{m.author}:</span>{" "}
                <span className="text-foreground">{m.text}</span>
              </div>
            );
          })}
        </div>
        <form onSubmit={submit} className="p-2 flex gap-1 border-t border-panel-border-dark">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message #${chat.activeTab}...`}
            className="flex-1 rpg-inset px-2 py-1.5 text-sm outline-none focus:brightness-125"
          />
          <button
            type="submit"
            className="rpg-inset px-2 grid place-items-center hover:brightness-125"
            aria-label="Send"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </RpgWindow>
  );
}
