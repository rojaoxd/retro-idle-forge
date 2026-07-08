# MMORPG Idle — UI Shell (Pixel Fantasy, Dark Mode)

Build a front-end-only UI shell for a browser MMORPG idle game with retro pixel-art fantasy theme, dark mode, and RPG "window" panels. No backend yet — Supabase/Phaser slots are placeholders. State is simulated via Zustand so the UI is reactive.

## Stack & foundation
- React + Tailwind v4 (existing TanStack Start template).
- Add `zustand` for a lightweight global game state.
- Fonts: pixel display font (Press Start 2P for headings/HUD) + readable body (VT323 or IBM Plex Mono) loaded via `<link>` in `__root.tsx`.
- Design tokens in `src/styles.css`: dark parchment/stone palette (deep charcoal bg, aged-gold accents, blood-red HP, arcane-blue MP, emerald XP), beveled borders, inset panel shadows, subtle noise/scanline utility.
- All colors as semantic tokens (`--color-hp`, `--color-mp`, `--color-gold`, `--color-premium`, `--panel`, `--panel-border`, `--panel-inset`, etc.).

## File structure
```
src/
  routes/index.tsx                 # mounts <GameShell />
  stores/gameStore.ts              # zustand: character, resources, inventory, party, friends, chat
  components/game/
    GameShell.tsx                  # full-viewport layout grid
    hud/
      TopBar.tsx                   # header wrapper
      CharacterBadge.tsx           # portrait + name + level
      StatBars.tsx                 # HP + MP bars
      CurrencyDisplay.tsx          # gold + premium
      StoreButton.tsx              # highlighted CTA
    canvas/
      GameCanvas.tsx               # dark placeholder w/ "Phaser/WebGL" text + grid bg
    panels/
      RpgWindow.tsx                # reusable window: title bar, minimize/close, beveled frame
      EquipmentPanel.tsx           # paperdoll slot layout
      InventoryPanel.tsx           # 4x5 grid + capacity bar
      FriendsPanel.tsx             # tabs Online/Offline
      PartyPanel.tsx               # leader + kick + disband
    footer/
      ActionBar.tsx                # 10 hotkey slots (1..0) w/ cooldown overlay
      ChatBox.tsx                  # tabs Server/Local/Party/Trade + input
    primitives/
      ProgressBar.tsx              # segmented pixel-style bar
      SlotFrame.tsx                # inset item slot
      PixelIcon.tsx                # emoji/svg wrapper w/ pixel rendering
```

## Layout (desktop-first CSS grid)
```text
┌─────────────────── TopBar (HUD) ───────────────────┐
│ Portrait | HP/MP | Lv/Name |     Gold/Premium | 🛒 │
├───────────────────────┬────────────────────────────┤
│                       │  Equipment (paperdoll)     │
│    Game Canvas        │  ────────────────────────  │
│    (placeholder)      │  Inventory 4x5 + Cap       │
│                       ├────────────────────────────┤
│  Friends (floating)   │  Party (floating)          │
├───────────────────────┴────────────────────────────┤
│ ChatBox (left)          │       ActionBar 1..0     │
└────────────────────────────────────────────────────┘
```
Friends & Party render as absolutely-positioned RpgWindow panels over the canvas (draggable later; for now static with minimize/close).

## Global state (`gameStore.ts`)
```ts
character: { name, level, xp, hp, hpMax, mp, mpMax, portrait }
resources: { gold, premium }
inventory: { slots: Item[], capacity, used }
equipment: { head, chest, legs, boots, weapon, shield, amulet, ring }
party: { members: [{id,name,role}], leaderId }
friends: { online: Friend[], offline: Friend[] }
chat: { activeTab, messages: {tab, author, text, ts}[] }
ui: { panels: { inventory:{open,minimized}, friends:{...}, party:{...} } }
actions:
  takeDamage(n), heal(n), spendMana(n), regenMana(n)
  addGold(n), spendGold(n), addPremium(n)
  togglePanel(id), minimizePanel(id)
  sendChat(tab,text), setChatTab(tab)
  triggerCooldown(slotIndex, ms)
```
Seeded with sample hero ("Aldric the Bold", Lv 12), a few inventory items, 3 friends, 2 party members, and welcome chat lines.

## Reactivity demo
Small dev-only "Debug" strip below the action bar with buttons: `-10 HP`, `+10 HP`, `-5 MP`, `+50 Gold`, `+1 Premium`, `Trigger cooldown slot 1`. Proves every HUD element reacts. Easy to remove later.

## RpgWindow behavior
- Header: pixel title, minimize (collapses body, keeps titlebar), close (sets `open:false` in store; a small "reopen tray" bottom-right lists closed windows).
- Body slot for children. Beveled 2px inner light + 2px outer dark border for the classic Tibia/Ultima RPG window look.

## Component specifics
- **StatBars**: segmented bars (~20 notches) with numeric `current/max` overlay; smooth width transition.
- **EquipmentPanel**: 3-column grid mapping paperdoll:
  ```
  [ .    ][Head ][ .    ]
  [Weapon][Chest][Shield]
  [Amulet][Legs ][Ring  ]
  [ .    ][Boots][ .    ]
  ```
- **InventoryPanel**: `grid-cols-4` × 5 rows of `SlotFrame`; capacity bar shows `used/capacity` in the window footer.
- **ActionBar**: 10 `SlotFrame`s numbered 1..9,0; each has a keybind badge and a rotating radial-gradient overlay simulating cooldown (CSS-only using `conic-gradient` driven by `--progress`).
- **ChatBox**: tabs highlight active; messages colored per tab (Server=amber, Local=stone, Party=blue, Trade=green); Enter sends via `sendChat` and echoes locally.
- **StoreButton**: gold gradient, subtle pulse; onClick is a no-op placeholder (comment: `// TODO: payment gateway integration`).

## Integration seams (comments only, no code yet)
- `// TODO(supabase): subscribe to character row for HP/MP/gold updates`
- `// TODO(ws): pipe chat messages via WebSocket channel per tab`
- `// TODO(phaser): mount Phaser.Game into GameCanvas ref`

## Head metadata (`__root.tsx`)
Replace defaults with title "Aetheric Realms — Idle MMORPG" and matching description/og/twitter tags. Add pixel-font `<link>` tags here.

## Out of scope for this pass
- Supabase auth wiring, Phaser mount, real WebSocket, drag-and-drop inventory, responsive mobile layout (desktop only for v1), item art beyond emoji/simple SVG placeholders.
