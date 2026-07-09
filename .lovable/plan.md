# Painel Admin Definitivo `/dev` — Database-Driven

Vou expandir o painel `/dev` atual (já tem Sprites, Map Editor, Items, Creatures, Spells, Config) para um dashboard SaaS-gamer completo, com nova aba **Overview & Controle**, refactor das abas existentes para o escopo pedido, e novas tabelas no Supabase.

## 1. Migrações Supabase (novas tabelas + colunas)

### `server_configs` (nova, single-row pattern)
- `id` (int, pk, default 1, check =1)
- `status` (text: `'online' | 'maintenance'`)
- `motd` (text, opcional — mensagem do dia)
- `updated_at`, `updated_by` (uuid → auth.users)
- RLS: `SELECT` público (anon+auth), `UPDATE` só admin (via `has_role`). Realtime ON.

### `online_players` (nova)
- `id` (uuid pk), `user_id` (uuid, unique), `character_name` (text)
- `x`, `y` (int), `last_heartbeat` (timestamptz)
- RLS: `SELECT` admin only, `UPSERT/DELETE` service_role (Colyseus). Realtime ON.
- Contador via `SELECT count(*) WHERE last_heartbeat > now()-30s`.

### `server_logs` (nova)
- `id` (uuid pk), `created_at` (timestamptz, index desc)
- `level` (text: `info|warn|error|debug`)
- `source` (text: ex. `colyseus`, `auth`, `admin`)
- `message` (text), `meta` (jsonb)
- RLS: `SELECT` admin only, `INSERT` service_role. Realtime ON.
- Retenção: cron/manual truncate (fora do escopo agora).

### `monsters` (nova — separada de `game_creatures` que é só sprite/outfit)
- `id` (uuid pk), `name`, `hp` (int), `speed` (int)
- `exp_reward` (int), `max_damage` (int)
- `sprite_id` (int → `game_sprites`)
- `loot_table` (jsonb: `[{item_id, chance, min, max}]`)
- RLS: `SELECT` público, CRUD admin.

### `vocations` (nova)
- `id` (uuid pk), `name` (text unique)
- `hp_per_level`, `mana_per_level`, `capacity_per_level` (int)
- `hp_regen_ms`, `mana_regen_ms` (int)
- RLS: `SELECT` público, CRUD admin.

### `spells` (nova)
- `id` (uuid pk), `name` (text), `words` (text unique — ex. `exura`)
- `mana_cost` (int), `min_level` (int)
- `vocation_id` (uuid → vocations, nullable = todas)
- `kind` (text: `healing|attack|support|rune`)
- `effect_id` (uuid → `game_visual_effects`, nullable)
- RLS: `SELECT` público, CRUD admin.

### `items` (extensão — reusar `game_items` existente)
- Já tem name, attack, defense, weight, sprite_id, weapon_type. Adicionar:
- `item_type` (text: `weapon|armor|rune|fluid|misc`) — coluna nova.
- CRUD já existe em `/dev/items`, será revisto pra bater com o escopo.

### `map_tiles` (extensão)
- Adicionar `spawn_monster_id` (uuid → monsters, nullable). Quando não-null, o tile é ponto de spawn.
- Layer ganha valor `'spawn'` além de `'floor'|'obstacles'`.

Todas com `set_updated_at()` trigger e GRANTs explícitos (`authenticated`+`service_role`; `anon` só onde SELECT for público).

## 2. Layout do Painel

Sidebar reorganizada (`DevSidebar.tsx`):

```
Engine Console
├── Overview            (novo — home do /dev)
├── Mapa & Spawns       (rename de Map Editor)
├── Itens & Equipamentos
├── Criaturas (Monstros) (novo — separado de Outfits)
├── Outfits & Sprites   (merge de Sprites + Outfits atuais)
├── Vocações & Magias   (novo)
└── Config Global
```

Redirect `/dev` → `/dev/overview` (era `/dev/sprites`).

## 3. Telas

### `/dev/overview` (novo)
- **Grid 3-col**: `ServerStatusCard`, `OnlinePlayersCard`, `QuickStatsCard` (totais de items/monstros/tiles).
- **ServerStatusCard**: badge Online/Maintenance + Switch grande; server fn `toggleServerStatus` (admin-only) atualiza `server_configs`. Subscribe realtime pra refletir mudanças de outros admins.
- **OnlinePlayersCard**: número grande + sparkline últimos 5min; realtime channel em `online_players`.
- **LiveLogsTerminal**: `<pre>` preto full-width, mono, auto-scroll, colorido por `level`. Realtime INSERT em `server_logs`, buffer últimos 200. Filtros (level, source) e botão pause.

### `/dev/items` (refactor)
- Tabela com filtros por `item_type`. Modal de edit com campos: name, item_type (Select: Arma/Armadura/Runa/Fluido/Outro), attack, defense, weight, sprite (via `SpritePicker`). Campos condicionais (attack só se weapon).

### `/dev/creatures` (renomeado → Monstros)
- Vira CRUD de `monsters`. Editor de Loot Table: linhas `[item picker | chance % | min | max] + Add`. Preview de sprite.
- Outfits/creatures visuais movem pra `/dev/sprites` (aba interna).

### `/dev/vocations` (novo)
- Tabs internas: **Vocações** | **Magias**.
- Vocações: CRUD tabular.
- Magias: CRUD com filtro por vocação, picker de effect visual.

### `/dev/map` (evolução)
- Toolbar ganha 3 modos: **Paint tile** | **Toggle blocking** | **Set spawn**.
- Modo spawn abre picker de monstro; clique grava tile com `layer='spawn'`, `spawn_monster_id=<id>`.
- Overlay visual: ícone de caveira nos tiles de spawn, borda vermelha nos blocking.

## 4. Server Functions (novas)

Em `src/lib/dev/`:
- `server.functions.ts`: `getServerStatus` (público), `setServerStatus` (admin), `getOnlinePlayersCount` (admin), `getRecentLogs(limit)` (admin), `insertLog` (service_role via `.server.ts` — pra uso interno/testes).
- `monsters.functions.ts`: CRUD.
- `vocations.functions.ts`: CRUD.
- `spells.functions.ts`: CRUD.
- `items.functions.ts` existente: adicionar `item_type`.
- `map.functions.ts` existente: aceitar `spawn_monster_id` no upsert.

Todas com `requireSupabaseAuth` + assert admin (padrão já usado em `creatures.functions.ts`).

## 5. Realtime

Habilitar `supabase_realtime` publication em: `server_configs`, `online_players`, `server_logs`. Overview subscreve os três com cleanup em `useEffect`.

## 6. Design

Reutilizar tokens `--dev-*` já definidos. Terminal de logs com fundo `#000`, mono `ui-monospace`, cor por level (info=slate-300, warn=amber-400, error=red-400, debug=slate-500). Cards com `dev-panel` + accent glow no status.

## Fora do escopo

- Backend Colyseus escrevendo em `online_players`/`server_logs` (só criamos as tabelas + o painel de leitura; integração real do server AWS fica pra outra tarefa).
- Retenção/rotação de logs.
- Editor de animações de monstro (usa sprite estático por agora).
- Auth/roles novos (usa `has_role('admin')` já existente).

Aprova pra eu começar pela migração + `/dev/overview`?
