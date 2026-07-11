# Fase §4 — Cliente Canvas 2D

O engine já vem com um cliente HTML/JS pronto (`game-server/vendor-client-reference/`, ~21k linhas: renderer, sprite-buffer, canvas, protocol, hotbar, minimap, chat, containers, spellbook, outfit modal, som ambiente, etc.). **Reescrever tudo em React/TS é meses de trabalho e quebra recursos que já funcionam.** A estratégia enxuta é reaproveitar o cliente inteiro e só substituir o que muda: a tela de login (usa Supabase) e a origem dos assets/WS (aponta pro EC2).

## O que vamos fazer

1. **Copiar o cliente vendor para `public/client/`** (CSS, PNGs, JS `src/`, `data/740/constants.json`). Fica servido em `/client/*` pelo Vite/edge.
2. **Servir sprites do game-server** — `Tibia.spr`/`Tibia.dat`/`sounds/` ficam no EC2 (não no repo). O cliente carrega via HTTP do game-server; adicionamos um `VITE_GAME_ASSETS_URL` e patch pequeno no `sprite-buffer.js`/`index.js` para usar essa URL.
3. **Substituir a tela de login do cliente** — remover `modal-create-account.js` / login por senha própria do engine. A rota `/play/$characterId` já tem sessão Supabase; passamos JWT + characterId pro cliente via `window.__LOVABLE_SESSION__` antes de bootar.
4. **Novo `/play/$characterId`** — carrega os scripts do vendor em ordem via `<script>` injetados num `useEffect`, monta o markup do `index.html` num container, chama `gameclient.init()` com sessão pré-preenchida.
5. **Patch no engine WS** (`game-server/engine-src/websocket-server.js`) — já espera `?token=...&characterId=...` do trabalho anterior; cliente vendor manda esses query params em vez do handshake de senha.
6. **Rota `/characters`** — botão "Entrar" já navega pra `/play/$characterId`; sem mudança.

## Arquivos alterados/criados

**Copiar (via `cp -r`):**
- `game-server/vendor-client-reference/css/` → `public/client/css/`
- `game-server/vendor-client-reference/png/` → `public/client/png/`
- `game-server/vendor-client-reference/src/` → `public/client/src/`
- `game-server/vendor-client-reference/data/` → `public/client/data/`

**Criados:**
- `public/client/lovable-bootstrap.js` — lê `window.__LOVABLE_SESSION__`, monta WS URL com JWT, pula tela de login do vendor
- `public/client/lovable-shell.html` — markup do `index.html` do vendor, sem `<script>` e sem áudio (áudio opcional depois)

**Editados:**
- `src/routes/_authenticated/play.$characterId.tsx` — carrega CSS+JS do vendor, injeta sessão, monta shell
- `game-server/engine-src/http-server.js` — serve `Tibia.spr`/`Tibia.dat`/sounds via HTTP estático com CORS (para o cliente hospedado em outro domínio)
- `.env` local + `game-server/.env.example` — `VITE_GAME_WS_URL`, `VITE_GAME_ASSETS_URL`

## Fora de escopo desta fase
- Reescrita TS/React do renderer (fica pro futuro se quiser HUD nosso substituindo o vendor).
- Upload dos `Tibia.spr`/`Tibia.dat`/`Tibia74.otbm` pro EC2 (você faz manual, README já cobre).
- Áudio ambiente (cliente vendor tem, mas depende de `.ogg` proprietários — vamos deixar mudo por padrão).

## Riscos
- Cliente vendor mistura DOM global (`document.getElementById(...)`) com estado singleton — funciona bem numa aba, mas navegar pra fora e voltar pode deixar listener pendurado. Vamos limpar no `useEffect` cleanup (`window.gameClient?.disconnect?.()`).
- Alguns módulos do vendor podem esperar caminhos relativos (`./png/...`); se quebrar, ajustamos `<base href>` no shell.

Ok seguir por aqui?