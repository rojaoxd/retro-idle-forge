## Objetivo

Reproduzir o fluxo do Tibia: cadastro → login → seleção/criação de personagem → carregamento completo do jogo → "Entrar no jogo" (só habilitado quando servidor conectado e assets carregados). Corrigir renderização do mapa e usar o nome do personagem em vez de "You".

## Fluxo de telas

```text
/auth (login/cadastro por e-mail e senha, já existe)
  → /characters   (lista de personagens do usuário)
        ├─ [Criar personagem] → /characters/new (nome + vocação)
        └─ [Selecionar personagem]
              → /play/:characterId  (tela de "Carregando…" + botão Entrar no jogo)
                    → /game/:characterId  (Tibia Shell + Phaser)
```

Regras:
- `/characters`, `/play/*`, `/game/*` ficam sob `_authenticated` (redireciona para `/auth`).
- Botão **Entrar no jogo** só habilita quando: (a) sessão Colyseus conectada com sucesso, (b) mapa + sprites do Phaser 100% carregados, (c) dados do personagem carregados do Supabase. Enquanto isso mostra barra de progresso com etapas (Autenticando / Conectando servidor / Carregando mapa / Carregando sprites / Pronto).
- Se o servidor Colyseus falhar, mostra erro com botão "Tentar novamente" e mantém o botão Entrar desabilitado — nunca deixa o usuário entrar em um jogo desconectado.

## Backend (Supabase)

Nova migration:

- `public.characters` — colunas de domínio: `user_id` (FK `auth.users`, cascade), `name` (unique, citext), `vocation` (enum: `none`, `knight`, `paladin`, `sorcerer`, `druid`), `level` (default 1), `experience` (default 0), `hp`, `hp_max`, `mana`, `mana_max`, `cap`, `speed`, `pos_x`, `pos_y`, `pos_z` (spawn default 10/10/7), `last_login_at`.
- `public.vocations_catalog` (read-only lookup) — id, name, description, hp_base, mana_base, cap_base para popular a tela de criação (seed com as 4 vocações clássicas).
- GRANTs completos + RLS:
  - `characters`: SELECT/INSERT/UPDATE/DELETE apenas do dono (`auth.uid() = user_id`); service_role total (game-server usa service key).
  - `vocations_catalog`: SELECT para `anon` e `authenticated`.
- Trigger `updated_at`.
- Índice único case-insensitive em `name`.

Server functions (client-safe `*.functions.ts`):
- `listMyCharacters()` — usa `requireSupabaseAuth`.
- `createCharacter({ name, vocation })` — valida nome (3–20, [a-zA-Z ], único), aplica stats iniciais por vocação.
- `deleteCharacter({ id })`.
- `getCharacter({ id })` — usado por `/play/:id` e `/game/:id`.

## Frontend

Novas rotas:
- `src/routes/_authenticated/route.tsx` (gate já gerenciado pela integração; garantir presença).
- `src/routes/_authenticated/characters.tsx` — grid de personagens + botão criar + logout. Query com `useSuspenseQuery(listMyCharacters)`.
- `src/routes/_authenticated/characters.new.tsx` — form (nome + escolha de vocação com card por vocação lendo `vocations_catalog`).
- `src/routes/_authenticated/play.$characterId.tsx` — tela de loading:
  - dispara em paralelo: `joinGameRoom(character.name)`, pré-carrega mapa/sprites (chama `getMapTiles` + faz `Image.decode()` em cada `sheet_url` para garantir cache), busca `getCharacter`.
  - mostra progresso por etapa; botão **Entrar no jogo** desabilitado até tudo estar `ready`.
  - ao clicar, navega para `/game/:id` passando via store (`useGameSessionStore`) a `room` e o `character` já carregados.
- `src/routes/_authenticated/game.$characterId.tsx` — renderiza `TibiaShell`, consumindo `room` e `character` da store. Se recarregar direto nessa URL sem sessão preparada, redireciona para `/play/:id`.

Ajustes de código existente:
- `src/routes/index.tsx` — redireciona logado para `/characters`, deslogado para `/auth`. Remove `TibiaShell` daí.
- `useTibiaStore.character` deixa de ter mock "Morgado"; passa a ser hidratado do personagem selecionado (nome, hp, mana, cap, speed, vocation, level).
- Novo `useGameSessionStore` (zustand) com `{ room, character, phase: 'idle'|'connecting'|'loading'|'ready'|'error', errors }`.
- `PhaserCanvas` deixa de conectar sozinho ao Colyseus; passa a receber `room` e `character` via props/store (a conexão vive na tela `/play`).
- `GameScene`:
  - Corrigir sprites: usar `add.image` com `crop` está errado para tiles vindos de sheet — trocar por `this.textures.addSpriteSheetFromAtlas` ou criar `frame` dinâmico via `this.textures.get(key).add(frameName, 0, sp.x, sp.y, sp.width, sp.height)` e usar `this.add.image(x, y, key, frameName)` com `setDisplaySize(TILE, TILE)`. Isso resolve o "sprite errado".
  - `fallbackPlayer` e labels dos players devem usar `character.name` da store (não "You" fixo).
  - Ao conectar Colyseus, o label do jogador local passa a ser `character.name`.

## Servidor Colyseus

O servidor em `wss://fibula.pro` está indisponível ("servidor indisponível" no banner). O plano cobre apenas o cliente + fluxo; o deploy do `game-server/` no host próprio continua responsabilidade separada. Documentaremos no `game-server/README.md` que sem servidor online o botão Entrar do `/play` fica desabilitado — comportamento esperado.

## Detalhes técnicos

- Todas as server functions autenticadas usam `requireSupabaseAuth`; chamadas do componente via `useServerFn` + TanStack Query.
- Validação de input com Zod dentro de `.inputValidator()`.
- Preload de sprites em `/play`: buscar `urlMap` de `getMapTiles`, criar `Image()` para cada URL, aguardar `img.decode()`; assim quando `GameScene` roda no `/game`, `this.load.image` cai em cache do browser e o boot é instantâneo.
- Labels em Phaser: passar `character.name` no `init(data)` do `GameScene`.
- Rota `/` → redirect: logado ⇒ `/characters`, deslogado ⇒ `/auth`.

## Fora de escopo (não faremos agora)

- Deploy do Colyseus server (`game-server/`).
- Sistema de combate, inventário funcional, chat multi-canal — permanecem como estão.
- Delete de conta / recuperar senha.