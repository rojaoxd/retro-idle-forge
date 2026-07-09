
# Upgrade `/dev` — Workflow OTServ 7.4 Profissional

Objetivo: transformar o painel atual em substituto completo de Tiled + Object Builder + Remere's Map Editor + scripts do OTServ, mantendo o dark mode SaaS atual.

---

## 1. Nova arquitetura de dados (Supabase)

Migração única com as tabelas / colunas abaixo (todas com RLS admin-only para escrita, SELECT autenticado, `service_role` ALL, triggers `set_updated_at`).

### Sprites & Objetos (estilo `.dat` do Tibia)
- **`game_sprites`** (já existe) — adicionar `hash` (dedup), `palette_group` (nature/town/dungeon/walls/creatures/items/effects).
- **`game_objects`** (nova) — o "item .dat":
  - `client_id` (int, único — equivalente ao ID do OTB)
  - `name`, `object_kind` (`item`|`ground`|`container`|`weapon`|`armor`|`fluid`|`splash`|`deco`)
  - `width`, `height` (tiles: 1×1, 1×2, 2×1, 2×2)
  - `layers`, `pattern_x`, `pattern_y`, `pattern_z`, `frames` (animação)
  - `frame_duration_ms`
  - `flags` (jsonb) — `isSolid, isBlockProjectile, isBlockPath, isContainer, isStackable, isUseable, isPickupable, isRotatable, isHangable, isHorizontal, isVertical, hasLight, lightLevel, lightColor, hasHeight, elevation, hasOffset, offsetX, offsetY, isLyingCorpse, isAnimateAlways, minimapColor, isFullGround, isTop, isBottom`
- **`game_object_sprites`** (nova, join) — mapeia cada célula do objeto:
  - `object_id` FK, `sprite_id` FK, `layer`, `pattern_x`, `pattern_y`, `pattern_z`, `frame`, `cell_x`, `cell_y`

### Mapa com eixo Z
- **`map_tiles`** — adicionar `z smallint NOT NULL DEFAULT 7` (0=topo, 15=mais fundo; convenção Tibia usa 7 como superfície) e alterar unique/index para `(x, y, z, layer)`. Substituir `tile_id` por `object_id` (FK → `game_objects.id`) e manter `tile_id` legado por transição.
- **`map_palettes`** (nova) — `id, name, group` (nature/town/…) e `object_ids int[]` para as paletas de criação.
- **`map_areas`** (nova) — regiões nomeadas: `id, name, x1, y1, x2, y2, z_min, z_max, kind` (city/dungeon/pvp/nopvp/nologout).

### Actions & Movements (scripts)
- **`scripts_actions`** — `id, name, target_kind` (`item_id`|`action_id`|`unique_id`), `target_value int`, `code text` (Lua-like ou JS), `enabled`, `notes`.
- **`scripts_movements`** — `id, name, target_kind` (`tile_object_id`|`action_id`|`unique_id`|`equip_slot`), `target_value int`, `event` (`onStepIn`|`onStepOut`|`onEquip`|`onDeEquip`|`onAddItem`|`onRemoveItem`), `code text`, `enabled`.

### NPCs & Quests
- **`npcs`** — `id, name, sprite_object_id`, `outfit` (jsonb: head/body/legs/feet/addons), `walk_radius`, `speech_greet text[]`, `speech_farewell text[]`, `idle_messages text[]`.
- **`npc_trades`** — `id, npc_id, object_id, buy_price, sell_price, currency` (default gold), `stock` (null=infinito).
- **`npc_keywords`** — `id, npc_id, keyword text[], answer text` (respostas a palavras-chave).
- **`quests`** — `id, name, description, storage_key text, storage_value int, min_level`.
- **`quest_steps`** — `id, quest_id, order, kind` (`talk`|`kill`|`collect`|`reach_tile`), `params jsonb`, `reward jsonb`.

Todas com GRANTs corretos + RLS (`has_role(auth.uid(),'admin')` para escrita).

---

## 2. Reformulação `/dev/sprites` — Object Builder

Layout 3 colunas:

```text
┌─────────────┬────────────────────────┬──────────────┐
│ Sprite Pool │  Object Composer       │  Flags &     │
│ (drag src)  │  (grid W×H×frames)     │  Attributes  │
│  + upload   │                        │              │
│  DnD zone   │  timeline (frames)     │  Preview     │
└─────────────┴────────────────────────┴──────────────┘
```

- **Drag & Drop inteligente**: zona no topo do Sprite Pool aceita PNG/sheets soltos. Detecta automaticamente tamanho múltiplo de 32 → propõe grid de fatiamento (`cols × rows`) com preview antes de gravar. Hash SHA-256 evita reuploads.
- **Object Composer**: novo objeto define `width × height` (1×1 → 2×2), `layers`, `frames`. Cada célula é um dropzone que aceita sprite arrastado do Pool. Timeline embaixo permite navegar entre frames e patterns.
- **Flags panel**: replica o `.dat` do Tibia (checkboxes agrupados: Blocking, Container, Stack/Use, Light, Height/Offset, Minimap). Cada flag afeta o preview em tempo real (ex.: `hasHeight` sobe 8 px na visualização).
- Salva em `game_objects` + `game_object_sprites`.

Arquivos:
- `src/routes/dev.sprites.tsx` (reescrita)
- `src/components/dev/objectbuilder/SpritePool.tsx`
- `src/components/dev/objectbuilder/ObjectComposer.tsx`
- `src/components/dev/objectbuilder/FlagsPanel.tsx`
- `src/components/dev/objectbuilder/DropUploader.tsx`
- `src/lib/dev/objects.functions.ts`

---

## 3. Reformulação `/dev/map` — Estilo RME

Layout:

```text
┌──────────────┬──────────────────────────┬──────────────┐
│ Paletas      │  Canvas (grid + camadas) │  Inspector   │
│ ─ Nature     │                          │  Tile atual  │
│ ─ Town       │  [Z: +7 ▼] [Brush 3x3 ▼] │  Object info │
│ ─ Dungeon    │  [Fill] [Erase] [Pick]   │  Areas       │
│ ─ Walls      │                          │              │
│ ─ Creatures  │  ▓ silhueta Z-1 (30%)   │              │
└──────────────┴──────────────────────────┴──────────────┘
```

- **Eixo Z**: seletor de andar `-7..+7` (mapeado internamente a `z 0..15`). Renderiza somente o andar ativo em cor cheia; andares abaixo em silhueta cinza a 30 % de opacidade (composite `multiply`) quando `z_atual < 7` (subsolo mostra o de cima; superfícies mostram o de baixo — configurável).
- **Paletas de criação**: CRUD em `map_palettes`; UI agrupa por `group`, cada paleta lista `game_objects` como thumbs draggables/clicáveis.
- **Brushes**: toolbar com `1×1`, `3×3`, `5×5`, `Fill` (BFS 4-vias limitado ao mesmo `object_id` alvo), `Erase`, `Eyedropper (Pick)`, `Rectangle` (shift-drag), `Random paint` (para naturezas com variação).
- **Layers do RME**: `ground`, `items` (obstacles), `top` (decor/teto), `spawn`. Toggle de visibilidade por camada.
- **Atalhos**: `1..5` andares, `+/-` sobe/desce Z, `B` brush, `G` fill, `E` erase, `Space` pick.
- **Áreas nomeadas** (`map_areas`): drag para desenhar retângulo, define `kind` (pvp/nopvp/…).

Arquivos:
- `src/routes/dev.map.tsx` (mantém wrapper)
- `src/components/dev/map/MapCanvas.tsx` (reescrita, canvas 2D com camadas)
- `src/components/dev/map/PalettePanel.tsx`
- `src/components/dev/map/BrushToolbar.tsx`
- `src/components/dev/map/FloorSelector.tsx`
- `src/components/dev/map/TileInspector.tsx`
- `src/lib/dev/map.functions.ts` (bulk upsert `paintTiles(cells[])`, `fillArea`, paleta CRUD)

---

## 4. Nova aba `/dev/scripts` — Actions & Movements

Sidebar tabs: **Actions** | **Movements**.

- Lista à esquerda (filtro por `target_kind` + busca), editor à direita com **Monaco Editor** (`@monaco-editor/react`), tema `vs-dark`, linguagem `lua` para paridade com OTServ.
- Header do editor: campos `Nome`, `Alvo (Item ID / ActionID / UniqueID)`, `Enabled` toggle.
- Snippets/boilerplate padrão inseridos ao criar:
  ```lua
  function onUse(player, item, fromPos, target, toPos)
    -- ...
    return true
  end
  ```
- Movements: seletor de evento (`onStepIn`, `onStepOut`, `onEquip`, `onDeEquip`, `onAddItem`, `onRemoveItem`), gera skeleton correspondente.
- Botão "Validar sintaxe" (parser Lua no cliente via `luaparse`).
- Salvamento apenas persiste no banco — execução real fica com o servidor Colyseus (fora de escopo).

Arquivos:
- `src/routes/dev.scripts.tsx` + sub-rotas `dev.scripts.actions.tsx`, `dev.scripts.movements.tsx`
- `src/components/dev/scripts/ScriptList.tsx`
- `src/components/dev/scripts/ScriptEditor.tsx` (Monaco)
- `src/lib/dev/scripts.functions.ts`
- Deps: `@monaco-editor/react`, `luaparse`

---

## 5. Nova aba `/dev/npcs` (NPCs & Quests)

Duas sub-abas: **NPCs**, **Quests**.

### NPCs
- Lista + form. Form contém:
  - Nome, sprite (Object Picker de `game_objects` kind=`creature`), outfit (head/body/legs/feet + addons)
  - `walk_radius`
  - **Speech**: chips para `greet`, `farewell`, `idle` (`text[]`)
  - **Keywords**: tabela `keyword → answer` (múltiplos gatilhos)
  - **Trade Window** (visual): grid com colunas `Item | Ícone | Comprar | Vender | Stock`; picker de item lateral, drag para adicionar linha. Persiste em `npc_trades`.

### Quests
- Form: nome, descrição, storage key/value, level mínimo.
- Lista de passos (drag reorder): tipo (`talk`|`kill`|`collect`|`reach_tile`) + params + recompensa (jsonb builder).

Arquivos:
- `src/routes/dev.npcs.tsx`, `dev.npcs.list.tsx`, `dev.npcs.quests.tsx`
- `src/components/dev/npcs/NpcForm.tsx`
- `src/components/dev/npcs/TradeWindow.tsx`
- `src/components/dev/npcs/QuestBuilder.tsx`
- `src/lib/dev/npcs.functions.ts`
- `src/lib/dev/quests.functions.ts`

---

## 6. Sidebar `/dev` reorganizada

```
Overview
Mundo
  ├─ Mapa (RME)
  ├─ Paletas
  └─ Áreas
Objetos
  ├─ Sprites (Object Builder)
  ├─ Itens
  └─ Criaturas / Monstros
Gameplay
  ├─ Vocações & Magias
  ├─ NPCs & Quests
  └─ Actions & Movements
Sistema
  └─ Config Global
```

---

## Detalhes técnicos

- Todas as server fns em `src/lib/dev/*.functions.ts` com `requireSupabaseAuth` + `assertAdmin`.
- Canvas do mapa em `<canvas>` 2D com viewport virtualizado (renderiza só tiles visíveis) para suportar mapas grandes.
- Upload de sprites usa signed URL do bucket `game-sprites` já existente; hash calculado client-side antes do upload evita duplicatas.
- Monaco carregado dinamicamente (`import()`), fora do bundle inicial.
- Realtime não é necessário nesses editores (single-admin workflow); manter só no `/dev/overview`.
- Migração cuida de backfill: cria `game_objects` derivados dos `game_items` existentes (1 objeto por item com `object_kind='item'`, sprite referenciado); `map_tiles.z` default 7 preserva mapas atuais.

## Fora de escopo (não vai neste ciclo)

- Execução real dos scripts Lua (fica com Colyseus/servidor de jogo).
- Exportador `.otbm` / `.dat` / `.spr` (podemos adicionar depois se precisar interoperar).
- Editor de casas (RME houses) e waypoints.
- Sistema de raids/spawns temporizados (só o spawn_point atual continua).
- Simulador in-editor dos scripts.

---

Se aprovar, começo pela migração + `game_objects/object_sprites` + reescrita da aba Sprites (Object Builder), depois mapa RME, depois scripts/NPCs — em três PRs internos para o preview ficar navegável a cada passo.
