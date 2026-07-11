## Objetivo

1. Zerar TUDO do Object Builder (sprites + objetos + composições) sem mexer em `otserv_items` (OTB já importado, 4438 rows) nem no mapa.
2. Reimportar `Tibia.dat` + `Tibia.spr` do zero, com IDs batendo com `items.otb` (server_id ↔ client_id).
3. Import que **sobrevive a navegação/refresh**: você pode fechar a aba, voltar mais tarde, e ele retoma de onde parou.

## Bloqueio atual

`map_tiles.tile_id → game_sprites(id)` está com `ON DELETE RESTRICT` e o mapa tem 1200 tiles referenciando sprites — por isso o `DELETE` falhou na tentativa anterior. Vou trocar a FK para `ON DELETE SET NULL` (padrão do resto do schema) na migration, aí o wipe passa e os tiles ficam sem sprite até serem religados no editor após a reimportação.

## Passos

### 1. Migration (schema)

- `ALTER TABLE map_tiles DROP CONSTRAINT map_tiles_tile_id_fkey`, recriar com `ON DELETE SET NULL`.
- `ALTER TABLE otserv_items ADD COLUMN client_id integer` + índice — pra ligar cada item de `items.xml` (server_id) ao `client_id` do `Tibia.dat`. Populado pelo parser de `items.otb`.
- Nova tabela `object_import_jobs`:
  - `id uuid`, `status` (pending/running/paused/completed/failed), `dat_path`, `spr_path`, `otb_path` (paths no bucket `game-sprites`), `categories` (jsonb: {item,outfit,effect,missile}), `total`, `cursor`, `sprites_uploaded`, `objects_inserted`, `objects_updated`, `error text`, `log jsonb`, `created_by uuid`, timestamps.
  - RLS: admin-only (via `has_role`).

### 2. Wipe (após migration aprovada)

Um único data-op:
```
DELETE FROM game_object_sprites;
DELETE FROM game_objects;
DELETE FROM game_sprites;
```
Arquivos PNG do bucket `game-sprites/imported/` ficam (dedupe por hash reaproveita).

### 3. Parser `items.otb` + rota de upload

`items.otb` é o mapa server_id ↔ client_id. Novo parser em `src/lib/dev/otb/parser.ts` (formato OTBM-like, root node + item nodes com `ROOT_ATTR_ID`, `ITEM_ATTR_SERVERID`, `ITEM_ATTR_CLIENTID`). Server fn `importOtb({ path })` lê do bucket, faz `UPDATE otserv_items SET client_id = ? WHERE id = server_id` em massa (upsert por id caso um server_id do OTB não exista ainda em `otserv_items`).

### 4. Import resumível (o coração da mudança)

Fluxo:

```text
UI: /dev/objects/import-client
  ├─ Upload dat/spr/otb → bucket game-sprites/imports/{jobId}/
  ├─ createImportJob({ jobId, paths, categories }) → job row status=pending
  └─ Polling loop (setInterval 2s) chama processImportBatch({ jobId, batchSize })
                                              │
                                              ▼
Server fn processImportBatch (createServerFn + requireSupabaseAuth + admin):
  1. Lê job row (cursor, categories, paths)
  2. Baixa Tibia.dat + Tibia.spr do bucket (cache em memória por invocation)
  3. Parse dat até `cursor + batchSize` (skip anteriores usando offsets no job.log)
  4. Para cada thing: extrai sprites via SprReader, PNG-encode, sha1, upload dedup, insere game_objects + game_object_sprites
  5. Atualiza cursor, counters, aparece no log
  6. Retorna { done, total, cursor, log }
```

Persistência que garante resumo:
- **Cursor no banco**, não em memória do browser. Fechar a aba não perde nada.
- Cada `processImportBatch` é atômico por objeto (transação por thing).
- Botão "Continuar" reabre o job pelo id (salvo em `localStorage` como fallback + listagem de jobs abertos na tela).
- Botão "Pausar" seta status=paused; polling para; "Retomar" volta ao loop.
- Se batch falhar, job vai pra `failed` com `error`; UI mostra e permite retry do último cursor.

UI mostra: progress bar, contadores (sprites únicos / objetos inseridos), log de batches, botões Pausar/Retomar/Cancelar. Sobrevive a F5 porque tudo vem do banco.

### 5. Alinhamento final (após import)

Uma vez que `otserv_items.client_id` e `game_objects.client_id` (kind=item) existam:
- View `v_items_aligned` juntando `otserv_items` ↔ `game_objects` por `client_id`.
- Painel simples de "itens sem client" / "objetos sem server" pra você conferir.

## Ordem de execução

1. Migration (FK + coluna + tabela de jobs).
2. Data-op de wipe.
3. Parser OTB + parser refatorado dat/spr no servidor.
4. Server fns `createImportJob` / `processImportBatch` / `pauseImportJob` / `getImportJob` / `listImportJobs`.
5. Reescrita da rota `/dev/objects/import-client` pra usar o job.
6. Você sobe `Tibia.dat`, `Tibia.spr`, `items.otb` (esse último você precisa me enviar — não veio junto ainda) e clica Iniciar.

## Perguntas antes de codar

- Você tem o `items.otb` da versão 7.4 pra subir? Sem ele, o alinhamento client_id ↔ server_id não é possível (o `.dat` sozinho não carrega server ids).
- Confirma OK trocar a FK do mapa pra `SET NULL`? Os 1200 tiles vão ficar com `tile_id = NULL` até você repintar/religar no editor de mapa (o `object_id` desses tiles já era SET NULL, então o mesmo comportamento).