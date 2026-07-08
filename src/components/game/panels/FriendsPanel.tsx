import { useState } from "react";
import { Users } from "lucide-react";
import { RpgWindow } from "./RpgWindow";
import { useGameStore } from "@/stores/gameStore";
import { cn } from "@/lib/utils";

export function FriendsPanel() {
  const friends = useGameStore((s) => s.friends);
  const [tab, setTab] = useState<"online" | "offline">("online");
  const list = friends[tab];

  return (
    <RpgWindow id="friends" title="Friends" icon={<Users size={12} />}>
      <div className="flex flex-col">
        <div className="flex gap-1 px-2 pt-2">
          {(["online", "offline"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "pixel-text text-[9px] px-2 py-1 rpg-inset flex items-center gap-1",
                tab === t && "bg-panel-header text-primary",
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  t === "online" ? "bg-xp" : "bg-muted-foreground",
                )}
              />
              {t.toUpperCase()} ({friends[t].length})
            </button>
          ))}
        </div>
        <ul className="p-2 flex flex-col gap-1 max-h-[180px] overflow-y-auto">
          {list.map((f) => (
            <li
              key={f.id}
              className="rpg-inset px-2 py-1.5 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    tab === "online" ? "bg-xp" : "bg-muted-foreground",
                  )}
                />
                <div className="min-w-0">
                  <div className="text-sm truncate leading-tight">{f.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {tab === "online" ? f.location : `last seen ${f.lastSeen}`}
                  </div>
                </div>
              </div>
              <span className="pixel-text text-[9px] text-primary shrink-0">
                Lv{f.level}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </RpgWindow>
  );
}
