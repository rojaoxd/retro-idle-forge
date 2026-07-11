Confirmações recebidas: Lua on-demand OK, mapa completo, ignorar SQL de contas. Vou continuar em blocos pequenos e verificáveis — em vez de fazer as 5 fases num tapa, faço na ordem que destrava jogo real.

## Bloco A — Parser OTBM offline + upload

Objetivo: transformar `world.otbm` (69 MB, binário OTBM v2) em `.jsonl` que a UI já sabe importar.

1. `scripts/otserv-import/parse-otbm.ts` (Node, ~500 linhas):
   - Lê node tree OTBM v2 com escape 0xFD, tokens 0xFE/0xFF.
   - Percorre `OTBM_MAP_DATA` → `OTBM_TILE_AREA` → `OTBM_TILE`/`OTBM_HOUSETILE` → items.
   - Emite `tiles.jsonl` com `{x,y,z, ground_id, items:[{id, count?, aid?, uid?, text?, dest?}], house_id?, tile_flags}`.
   - Streaming: escreve linha a linha, memória constante.
2. `scripts/otserv-import/run-otbm.ts`: roda o parser localmente (`bun scripts/otserv-import/run-otbm.ts <path>`), gera `out/tiles.jsonl` (gitignored).
3. Aba **World Map** em `/dev/import`:
   - Aceita `tiles.jsonl` grande (streaming line-by-line, batches de 500).
   - Progresso por Z, contagem total (~1-2M tiles esperados).
   - UPSERT em `otserv_world_tiles` (já existe).

## Bloco B — Materializar `map_tiles` a partir de `otserv_world_tiles`

O jogo (Colyseus + client) lê `map_tiles`. Preciso projetar os tiles OTServ crus para o formato do runtime.

1. Server function `materializeWorldTiles({ zFrom, zTo, dryRun })`:
   - Lê `otserv_world_tiles` em páginas.
   - Para cada tile: cria linha em `map_tiles` camada `floor` (ground_id → `game_objects.client_id` do OTServ) e `obstacles` para items com `blockSolid`.
   - Marca `blocking` conforme `otserv_items.flags`.
2. Botão "Materializar mundo" na aba World Map, com filtro por range de Z (default 0-15).
3. Fica idempotente (upsert em `x,y,z,layer`).

## Bloco C — Sprites 7.4 reais no Phaser

Sem sprite o mapa fica vazio visualmente. Reaproveita o importador `.dat/.spr` já existente (`/dev/objects/import-client`):

1. Verificar que import popula `game_objects.client_id` + `game_sprites`.
2. `GameScene` mapeia `map_tiles.tile_id` → sprite pelo `client_id` do OTServ (ground_id do OTBM).
3. Ajuste de tile size 32×32.

## Bloco D — Runtime mínimo (game-server)

`WorldCache` já lê `map_tiles`. Adicionar:
- `WorldCache.itemsById` carregado de `otserv_items` (weight, flags).
- `WorldCache.monstersByName` de `otserv_monsters`.
- `SpawnScheduler` lê `otserv_spawns` e injeta creatures no mundo.

Depois disso já dá pra logar, andar em Rookgaard e ver monstros nascerem.

## Bloco E (depois) — Scripts

Painel `/dev/scripts` (rota já existe vazia) lista `otserv_scripts_registry`, Monaco editor, botão "Sugerir tradução TS" via Lovable AI Gateway. Prioriza movements/actions primeiro.

## Ordem de execução agora

Faço **Bloco A inteiro nesta rodada**: parser OTBM + script runner + aba de import. Você roda `bun scripts/otserv-import/run-otbm.ts data/world.otbm` na sua máquina (ou eu rodo no sandbox se você anexar o `world.otbm` cru — 69MB cabe), sobe o `.jsonl` pela UI, e valida contagem. Aí seguimos B → C → D.

## Notas técnicas
- OTBM v2: header 4 bytes versão + tree. Já tenho referência do formato do OTClient/TFS.
- `tiles.jsonl` de 69MB de OTBM vira ~300–500MB de JSONL. Upload streaming line-by-line, nada disso vai pra memória de uma vez.
- `otserv_world_tiles.items` é JSONB — cabe tudo (incluindo teleport dest, action_id, text de placas).
- Sem migração nova neste bloco.

Confirma que posso escrever Bloco A?
