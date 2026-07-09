## Painel de Desenvolvedor `/dev` — MMORPG Engine (Tibia 7.4)

Painel admin completo com 5 módulos CRUD, sidebar dark mode profissional (slate/emerald), gated por role `admin` via Supabase.

### 1. Autenticação e autorização

- Migration cria enum `app_role` (`admin`, `moderator`, `user`), tabela `user_roles`, função `has_role(_user_id, _role)` security definer.
- Layout `src/routes/_authenticated/_admin.tsx` (pathless): `beforeLoad` chama server fn que valida `has_role(auth.uid(), 'admin')`; sem admin → `redirect /`.
- Todas as rotas `/dev/*` ficam sob `_authenticated/_admin/dev.*`.
- Primeiro admin: script SQL manual no fim da migration (usuário informa email depois OU seedamos por email fixo — ver "Detalhes técnicos").

### 2. Schema Supabase (uma migration)

```
game_sprites(id serial, tags text[], sheet_url text, x int, y int, width int default 32, height int default 32, created_at)
game_items(id uuid, name, sprite_id int → game_sprites, weight numeric, capacity int,
           attack int, defense int, armor int, weapon_type text,
           is_solid bool, is_container bool, is_stackable bool, is_useable bool,
           is_liquid_container bool, has_height bool, extra jsonb)
game_creatures(id uuid, look_id int unique, name text,
               animations jsonb  -- { north:{idle,step1,step2}, south:{...}, east:{...}, west:{...} } com sprite_ids)
game_visual_effects(id uuid, name text, kind text CHECK ('missile'|'effect'),
                    frames jsonb -- [sprite_id,...] (missile: por direção),
                    frame_rate_ms int)
game_config(id int primary key default 1, config jsonb, updated_at)  -- singleton
```

- GRANTs `authenticated`/`service_role` em todas; RLS ativa.
- Policies: SELECT/INSERT/UPDATE/DELETE somente para `has_role(auth.uid(), 'admin')`.
- Trigger `updated_at`.
- Storage bucket `game-sprites` (público) para folhas originais; `game_sprites` guarda só metadados (sheet_url + x,y) — sem gerar PNGs por slice, conforme escolhido.

### 3. Estrutura de rotas

```
src/routes/
  _authenticated/_admin/
    dev.tsx                 → layout com <DevSidebar/> + <Outlet/>
    dev.index.tsx           → redirect para /dev/sprites
    dev.sprites.tsx
    dev.items.tsx
    dev.creatures.tsx
    dev.spells.tsx
    dev.config.tsx
```

### 4. Design system

- Dark mode: fundo `slate-950`, superfícies `slate-900/800`, bordas `slate-700`, texto `slate-100/400`.
- Accent primário: `emerald-500` (sucesso/salvar), accent secundário `sky-500` (ações).
- Tokens novos em `src/styles.css` (`--dev-bg`, `--dev-surface`, `--dev-accent`, `--dev-accent-2`) e utilitário `dev-panel` (bevel sutil, sombra interna).
- Sidebar fixa 240px colapsável para 64px (ícones lucide: Image, Package, Users, Sparkles, Settings).
- Componentes shadcn: Button, Input, Textarea, Checkbox, Select, Dialog, Table, Tabs, Slider, ScrollArea, ColorPicker (via input `type=color`).

### 5. Módulos

**5.1 `/dev/sprites`** — Sheet uploader
- Drag-and-drop → upload para Storage `game-sprites`.
- Após upload: `Image` carrega no canvas, calcula `cols = floor(w/32) × rows`, renderiza grid overlay.
- Botão "Registrar sprites" gera N linhas em `game_sprites` (sheet_url, x, y) via server fn batch insert; IDs incrementais são o `serial` do Postgres.
- Galeria em grid: cada célula = `<canvas>` desenhando o slice a partir de sheet_url + coords. Busca por tag (`ilike` em `tags`). Paginação 100/página. Click → Dialog com zoom + editor de tags.

**5.2 `/dev/items`** — CRUD dividido
- Esquerda: Table com search + botão "Novo Item".
- Direita: Form (react-hook-form + zod) com todos atributos e flags. Campo `sprite_id` com botão "Escolher…" que abre SpritePicker (reutiliza galeria).
- Salvar → server fn upsert.

**5.3 `/dev/creatures`** — Outfits 4-direções
- Form: look_id, name.
- Matriz 4×3: 4 direções × (idle, step1, step2), cada célula é um SpritePicker.
- Preview player: `<canvas>` que alterna idle→step1→idle→step2 a cada 250ms; botões para trocar direção.

**5.4 `/dev/spells`** — Efeitos
- Tabs: **Missiles** | **Magic Effects**.
- Missiles: 8 SpritePickers (N, NE, E, SE, S, SW, W, NW) → salva `frames` como objeto direcional.
- Effects: sequência ordenada de sprite_ids (drag-reorder via `@dnd-kit` já ou setas ↑↓ nativas para evitar dep nova), input `frame_rate_ms`, preview animado.

**5.5 `/dev/config`** — Config global
- Color pickers: chat public (yellow), server error (red), guild (green), party, private, npc.
- Sliders: nome flutuante font size, HP bar height, painel alignment (left/right radio).
- Botão Salvar → upsert singleton (`id=1`) em `game_config` como JSONB único.
- Export JSON: botão baixa `config.json`.

### 6. Server functions

Todas em `src/lib/dev/*.functions.ts` com `.middleware([requireSupabaseAuth])` + check `has_role admin` no handler:
- `sprites.functions.ts`: `listSprites`, `createSpritesBatch`, `updateSpriteTags`, `deleteSprite`.
- `items.functions.ts`: `listItems`, `upsertItem`, `deleteItem`.
- `creatures.functions.ts`: `listCreatures`, `upsertCreature`, `deleteCreature`.
- `effects.functions.ts`: `listEffects`, `upsertEffect`, `deleteEffect`.
- `config.functions.ts`: `getConfig`, `saveConfig`.
- `admin.functions.ts`: `checkIsAdmin` (para o gate).

Reads usam `context.supabase` (RLS como usuário admin); nada precisa de service role.

### 7. Dados como JSON limpo

Cada `upsert*` valida via Zod e persiste em colunas tipadas + JSONB quando faz sentido (animations, frames, config). GET fns retornam o registro cru — API-ready.

### 8. Detalhes técnicos

- Como não sabemos o email do primeiro admin, a migration inclui comentário `-- INSERT INTO user_roles (user_id, role) SELECT id, 'admin' FROM auth.users WHERE email = 'SEU_EMAIL';` e mostro ao usuário como executar no SQL editor após aprovar.
- Bucket criado via `supabase--storage_create_bucket` (público, para servir sheets diretos ao `<canvas>`).
- Sem alteração no `GameScene` / Colyseus (integração fica para depois, conforme escolhido).
- Componente `SpritePicker` reutilizável (Dialog + galeria + retorno de sprite_id).
- Zero mudanças no layout Tibia existente; painel `/dev` é isolado.

### 9. Ordem de execução

1. Migration Supabase (schema + RLS + roles + storage bucket).
2. Instruir usuário a rodar SQL para virar admin.
3. Server functions + gate `_admin`.
4. Layout + sidebar + rota `/dev`.
5. Módulos: sprites → items → creatures → spells → config.
6. Verificar build.