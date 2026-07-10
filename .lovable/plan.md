## Objetivo

Permitir logar → cair no mapa → andar. Editor de mapa passa a ter Salvar manual.

## 1. Spawn fixo do jogador (game-server)

- Ler spawn de `server_configs` (chaves `spawn_x`, `spawn_y`, `spawn_z`), com fallback `10,10,7`. Cache já existe em `WorldCache`; adicionar `WorldCache.spawnPoint()`.
- `GameRoom.onJoin`: setar `p.x = spawn.x * TILE`, `p.y = spawn.y * TILE`, `p.z = spawn.z` (o client já trata `x/y` em pixels).
- Persistir posição do jogador em `PlayerWriter` já em tiles (dividir por TILE ao salvar; guardar TILE constante compartilhada).

## 2. Movimentação — padronizar protocolo

Hoje: client envia `{direction}`, server espera `{x,y}` em tiles e não avança nada em pixels. Vamos alinhar em **tiles no server, pixels no client**.

- Constante `TILE = 32` compartilhada (nova `game-server/src/constants.ts`).
- `Player.x/y` no state = **pixels** (para tween linear no client, como já é).
- Handler `move` do servidor: aceita `{ direction: "up"|"down"|"left"|"right" }`.
  - Calcula `nextTileX = round(p.x / TILE) + dx`, idem Y.
  - Rejeita se `WorldCache.isBlocking(nextTileX, nextTileY, p.z)` ou fora do mapa.
  - Rate-limit server-side ~450ms/step (autoridade: client anima 500ms).
  - Atualiza `p.x = nextTileX * TILE`, `p.y = nextTileY * TILE`.
- Manter mensagem `map:sync` que o client envia como no-op por enquanto (WorldCache já lê do Supabase).

## 3. Editor de mapa — Salvar manual

Refatorar `MapEditor.tsx` para operar em **buffer local**:

- Estado novo: `draft: Map<cellKey, TileRow|null>` (null = marcado para deletar) e `dirty: boolean`.
- `paintCell`, `eraseCell`, `fillFrom`, `pickAt` passam a mutar `draft` (não chamam `mutate` mais).
- Render do canvas combina `byCell` (do servidor) com `draft` sobrepondo.
- Barra superior nova com:
  - **Salvar** (habilitado se `dirty`): envia dois lotes — `paintMapTiles` para upserts e `deleteMapTilesBulk` para deletes. Após sucesso: `invalidateQueries` + limpar `draft`.
  - **Descartar** (limpa `draft`).
  - Indicador "N alterações pendentes".
- `beforeunload` warn se `dirty`.
- Trocar Z ou layer com `dirty`: pedir confirmação (senão perde edições — draft é por-cell independente de Z, então na prática mantemos, mas Z afeta o que o usuário vê).

Nenhuma mudança em `map.functions.ts` do server (as ações `paintMapTiles`/`deleteMapTilesBulk` já suportam lote).

## 4. Recarga do WorldCache

Após Salvar no editor, chamar `WorldCache.reload()` no game-server. Como o editor é frontend e o game-server é AWS, adicionar:

- Server-route público `/api/public/reload-world` (verifica header `x-reload-secret` contra `WORLD_RELOAD_SECRET`). Handler apenas faz `fetch` para o game-server (`https://fibula.pro/admin/reload`).
- No game-server: rota HTTP simples `POST /admin/reload` protegida pelo mesmo secret que dispara `WorldCache.reload()`.
- Alternativa mais simples se preferir: `WorldCache` já tem subscription em `map_tiles`; se estiver funcional, pular esta etapa e o mapa recarrega sozinho ao salvar. **Confirmarei olhando `game-server/src/cache/subscriptions.ts` antes de implementar; se já houver Realtime, Salvar do editor basta.**

## 5. Fluxo do usuário após login

Já existe: `/` → `TibiaShell` → `PhaserCanvas` → `joinGameRoom`. Com (1) e (2) prontos, logar cai direto no mapa no spawn e WASD/setas movem o boneco.

## Arquivos afetados

- `game-server/src/rooms/GameRoom.ts` — spawn + protocolo move
- `game-server/src/cache/WorldCache.ts` — `spawnPoint()`
- `game-server/src/constants.ts` (novo) — TILE
- `game-server/src/index.ts` — rota `/admin/reload` (se necessário)
- `src/components/dev/MapEditor.tsx` — buffer + botão Salvar
- (opcional) `src/routes/api/public/reload-world.ts`

## Notas técnicas

- O game-server roda na AWS; após alterar arquivos em `game-server/**` você precisa rebuild+restart lá (`pm2 restart` conforme `ecosystem.config.cjs`). Vou deixar isso claro ao final.
- Sem mudança de schema no Supabase; usarei linhas existentes em `server_configs`.
