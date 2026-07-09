## Objetivo
Abandonar `mapa.json` local e centralizar mapa/colisões no Supabase, com editor interno em `/dev/map`, renderização dinâmica no Phaser e sincronização de colisões com o Colyseus.

## 1. Banco de dados (migration Supabase)

Criar tabela `public.map_tiles`:

- `id uuid pk default gen_random_uuid()`
- `x integer not null`
- `y integer not null`
- `layer text not null` — `'floor' | 'obstacles'` (constraint check)
- `tile_id integer not null` — referencia `game_sprites.id` (sprite escolhido na paleta)
- `blocking boolean not null default false`
- `created_at`, `updated_at` (+ trigger `set_updated_at`)
- `unique (x, y, layer)` — 1 tile por célula/camada, permite upsert por coord+layer

Grants + RLS:
- `GRANT SELECT ON public.map_tiles TO anon, authenticated` (mapa é público — todo mundo joga o mesmo mundo)
- `GRANT INSERT, UPDATE, DELETE ON public.map_tiles TO authenticated`
- `GRANT ALL ... TO service_role`
- RLS: SELECT liberado (`using (true)`), INSERT/UPDATE/DELETE só para `has_role(auth.uid(), 'admin')`

Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.map_tiles` (opcional — permite o editor ver mudanças ao vivo e o Phaser recarregar sem F5).

## 2. Editor `/dev/map` (novo)

Novo arquivo `src/routes/dev.map.tsx` + entrada no `DevSidebar`. Layout:

```text
+---------------------------------------------+
| Toolbar: [Layer: floor|obstacles] [Blocking?]|
|          [Ferramenta: pincel|borracha]      |
+---------------+-----------------------------+
| Paleta        |  Grid (canvas 40x40 tiles)  |
| (SpritePicker |  - click esquerdo: pinta    |
|  em grade     |  - click direito: apaga     |
|  filtrada)    |  - hover: preview           |
+---------------+-----------------------------+
```

Comportamento:
- Paleta reaproveita `listSprites` (já existente em `src/lib/dev/sprites.functions.ts`)
- Grid renderiza tiles já salvos (SELECT em `map_tiles`), sobrepondo layer floor + obstacles
- Ao clicar: upsert `{x, y, layer, tile_id, blocking}` via server fn nova `saveTile` (`.middleware([requireSupabaseAuth])` + check `has_role admin`)
- Borracha: `deleteTile({x,y,layer})`
- Botão "Publicar" opcional — só é útil se adicionarmos versionamento; nesta iteração salvamos direto (a rota já é gated por admin)

Novos arquivos:
- `src/lib/dev/map.functions.ts` — `listTiles`, `upsertTile`, `deleteTile`
- `src/components/dev/MapEditor.tsx` — canvas + paleta
- `src/routes/dev.map.tsx` — wrapper de rota

## 3. GameScene: carregar mapa do Supabase

Em `src/game/scenes/GameScene.ts`:

- Remover `load.json("mapa-json", …)` e toda a lógica de `cache.tilemap.add`
- Manter `load.image(TILESET_IMAGE_KEY, TILESET_IMAGE_URL)` (o PNG do tileset continua sendo asset estático)
- Novo `preload`: também carregar via `fetch` (ou server fn pública `getMapTiles`) a lista de `map_tiles`. Fazer isso em `create()` async, exibindo tela preta neutra enquanto carrega.
- `buildWorld()` passa a iterar sobre os tiles retornados: para cada `{x, y, tile_id, layer}`, ler `game_sprites` (join no server) para pegar `sheet_url, sx, sy, w, h` e desenhar via `this.add.image(x*TILE, y*TILE, key).setCrop(...)` **ou** gerar texturas dinâmicas com `this.textures.addSpriteSheetFromAtlas` a partir do PNG do tileset já carregado.
- Camada `obstacles` renderiza por cima; `floor` embaixo.
- Guardar `blockingSet = Set<"x,y">` para debug local (opcional — a autoridade de colisão é o servidor).

Server fn nova (pública, read-only via cliente publishable):
`src/lib/game/map.functions.ts` → `getMapTiles()` retorna `{ tiles: [{x,y,layer,tile_id,blocking, sprite:{sheet_url_signed,x,y,w,h}}] }`.

## 4. Sincronizar colisões com Colyseus (AWS)

O servidor Colyseus vive fora deste repo, então o cliente:

- Após conectar na `GameRoom`, envia uma vez `room.send("map:sync", { tiles: blockingTiles })` contendo apenas `{x, y, blocking:true}` das células bloqueadas (payload enxuto).
- Alternativa recomendada: adicionar no plano uma **anotação para o servidor** — o servidor deveria ler direto do Supabase com service key na inicialização da sala, evitando confiar no cliente. Como não podemos editar o servidor daqui, deixamos o `map:sync` como fallback e documentamos no `.lovable/plan.md` a mudança necessária no servidor.
- Enquanto o servidor não conhece as colisões, o cliente **não** faz predição de movimento em tile bloqueado: consulta `blockingSet` local antes de `room.send("move", …)` e ignora a tecla.

## Fora de escopo
- Múltiplos andares/z-levels (só floor/obstacles nesta iteração)
- Versionamento/publicação de mapa
- Editar o servidor Colyseus (só documentamos o contrato `map:sync`)
- Animação de tiles, tiles com script (portas, teleport)

## Arquivos afetados
- **novo** migration `map_tiles`
- **novo** `src/lib/dev/map.functions.ts`
- **novo** `src/lib/game/map.functions.ts`
- **novo** `src/components/dev/MapEditor.tsx`
- **novo** `src/routes/dev.map.tsx`
- **edit** `src/components/dev/DevSidebar.tsx` (link "Map Editor")
- **edit** `src/game/scenes/GameScene.ts` (remover Tiled, carregar do banco, enviar `map:sync`)
- **remover** `public/assets/mapa.json` (após validar)
