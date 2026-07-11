## Consegui ler tudo

- `otserv-2.zip` → OTServ 7.4 completo: `config.lua`, `data/` (XML, actions, spells, monsters, npcs, world.otbm 69MB, items.otb+xml, houses, spawns, outfits, quests, vocations), `mods/`, `database/` com dump SQL.
- `OldServBRClient.zip` → cliente 7.4: `tibia.dat`, `tibia.spr`, `tibia.pic`.
- `servidor.sql` → schema MySQL de referência (accounts, players, houses, guilds…).

Volume real do que vamos importar:
- 3134 items (items.xml/otb), 183 monsters, 416 NPCs + 277 scripts Lua, 200+ spells/runes, 10 vocações, 255 outfits.
- world.otbm de **69MB** (mapa inteiro do OTServ).
- 878 scripts Lua no total (actions, movements, spells, weapons, talkactions, creaturescripts, globalevents).

## Realidade primeiro (importante ler)

1. **Não dá pra rodar Lua no browser/edge.** Os 878 scripts do OTServ são C++/Lua específicos do engine deles. Vamos **traduzir** os scripts críticos para TypeScript no `game-server` (Colyseus) e usar os XMLs como **fonte de dados declarativa** (stats, formulas, targets). Scripts complexos ficam catalogados no Supabase com o Lua original preservado num campo `source_lua`, e traduzimos por demanda.
2. **world.otbm (69MB) é binário Tibia OTBM v2.** Precisa parser dedicado que roda **offline** (script Node local), não no browser. Ele gera um dump JSON/JSONL que sobe pro Supabase em batches — o browser nunca vê o OTBM.
3. **items.otb** (binário) é redundante com `items.xml`; usamos só o XML.
4. **`servidor.sql`** é MySQL do OTServ antigo (accounts com senha SHA1+salt). Não vamos importar contas — nosso auth é Supabase. Aproveitamos só a **estrutura** como referência pra confirmar que nosso schema cobre tudo (houses, guilds, deaths, market).

## Plano em 6 fases

### Fase 1 — Base de schema (migration única)

Estender o schema atual pra cobrir tudo que o OTServ 7.4 usa. Novas tabelas + colunas:

- `items` (renomear/expandir `game_items`): id numérico do Tibia, name, article, plural, weight, armor, attack, defense, slot_type, weapon_type, ammo_type, range, charges, decayTo, transformEquipTo, fluidSource, flags (isStackable, isPickupable, isRotatable, blockSolid, blockProjectile, blockPathFind, allowPickupable, showCount…), attributes JSONB.
- `monsters` expandir: race, experience, speed, manacost, targetchange, defenses, elements, immunities, flags, summons, loot[], voices[], attacks[], scripts.
- `npcs` expandir: keywords, shop_items[], travel_targets[], voices[], focus, walkinterval, floorchange, script_ref.
- `houses`: id, town_id, name, entry_x, entry_y, entry_z, size, rent, tiles[].
- `spawns`: center (x,y,z), radius, monsters[{name, x, y, z, spawntime}].
- `towns`: id, name, temple_x, temple_y, temple_z.
- `quests` + `quest_steps` (já existe) — validar/estender.
- `outfits`: look_type, name, premium, access, quest.
- `raids` + `raid_events`.
- `channels`, `groups`, `stages` (advance stages), `servers`.
- `scripts_registry`: type (action/movement/spell/weapon/creaturescript/talkaction/globalevent), name, target (item id, unique id, event), original_lua TEXT, ts_impl TEXT nullable, status ('pending'|'translated'|'stub'|'skipped'), notes.
- `map_tiles` estender: item stack (JSONB de items), ground_id, house_id, teleport_dest, unique_id, action_id, spawn_ref.

Tudo com RLS, GRANTs corretos, timestamps.

### Fase 2 — Parsers offline (Node scripts no repo, não vão pro bundle)

Criar `scripts/otserv-import/` com um CLI Node que roda **localmente na sua máquina** (ou no sandbox durante o import) e produz JSONL prontos:

- `parse-items.ts` → lê `items.xml` (10k linhas) → `items.jsonl`.
- `parse-monsters.ts` → varre 183 XMLs em `monster/**` → `monsters.jsonl`.
- `parse-npcs.ts` → varre `npc/*.xml` + `npc/scripts/*.lua` → `npcs.jsonl` (extrai keywords, trades e voices dos Lua com regex; NPCs muito custom viram `script_ref`).
- `parse-vocations.ts`, `parse-spells.ts`, `parse-outfits.ts`, `parse-quests.ts`, `parse-houses.ts`, `parse-spawns.ts`, `parse-channels.ts`, `parse-groups.ts`, `parse-stages.ts`, `parse-raids.ts`.
- `parse-otbm.ts` → parser OTBM v2 (biblioteca `@ottools/otbm-parser` ou implementação própria de ~400 linhas): produz `tiles.jsonl` (~centenas de milhares de linhas). Roda offline.
- `parse-scripts.ts` → varre todas pastas de scripts, cataloga cada arquivo em `scripts_registry` com o Lua original preservado.
- `parse-dat-spr.ts` (já temos base) → gera `sprites/*.png` + `objects.jsonl`.

Todos os `.jsonl` são gravados em `scripts/otserv-import/out/` (gitignored) e depois enviados pelas UIs de import ou por um comando `bun scripts/otserv-import/upload.ts` que faz batches via server functions.

### Fase 3 — UIs de import em `/dev`

Uma página `/dev/import` central com abas por recurso. Cada aba:
- Upload do `.jsonl` correspondente (drag&drop, streaming line-by-line pra não estourar memória).
- Preview com contagens e amostra.
- Filtros (por range de ID, categoria).
- Toggle dry-run.
- Barra de progresso + UPSERT por chave natural (`items.client_id`, `monsters.name`, etc).
- Log de erros por linha.

Server functions: `importItemsBatch`, `importMonstersBatch`, `importNpcsBatch`, `importSpellsBatch`, `importVocationsBatch`, `importOutfitsBatch`, `importHousesBatch`, `importSpawnsBatch`, `importTilesBatch`, `importScriptsBatch`. Todas com `requireSupabaseAuth` + `has_role admin` + UPSERT + retorno com contagens.

### Fase 4 — Runtime no game-server (Colyseus)

Traduzir a **mecânica base** (não os scripts custom) direto em TypeScript:

- `WorldCache` estendido pra items, monsters, npcs, spawns, houses, spells, vocations.
- `CombatSystem`: dano melee/dist/mágico usando as formulas de `vocations.xml`.
- `SpellSystem`: parser `words → effect`, exhaustion, mana cost, alvo, área, dano/heal. Runas viram consumíveis com `charges`.
- `MonsterAI`: seleção de alvo, pathfinding, ataques do XML (melee, spells, distance), summons, drops via `loot[]`.
- `NpcSystem`: máquina de estado com keywords (greet → topic → trade/travel/quest → bye). NPCs simples 100% data-driven do XML+Lua parseado; complexos ficam com `script_ref` até traduzirmos.
- `SpawnScheduler`: respeita `spawntime` por criatura.
- `HouseSystem`: entrada, aluguel, permissões.
- `ScriptExecutor`: registry de handlers TS por evento (`onUse(itemId)`, `onStepIn(uniqueId)`, `onEquip(slot)`, `onSay(words)`). Scripts sem tradução caem em stub que loga aviso — permite o server rodar sem quebrar enquanto vamos traduzindo por demanda.
- Todas as leituras quentes vão pelo cache, escritas em batch (PlayerWriter/Logger já existentes).

### Fase 5 — Cliente 7.4 no browser

- Importar `tibia.dat` + `tibia.spr` pelo importador que já existe (Etapa 2 do plano anterior) → popula `game_objects` + `game_sprites`.
- `tibia.pic`: parser pra extrair splash e fonte bitmap → usar como skin opcional na tela de login/HUD.
- Phaser scene já existente passa a usar as sprites reais dos objetos importados (mapeia `client_id` → sprite).

### Fase 6 — Tradução progressiva dos scripts

Painel `/dev/scripts` mostra o `scripts_registry` com filtros por status. Fluxo por script:
1. Abrir → mostra Lua original + campo `ts_impl` (Monaco editor).
2. Traduz manualmente ou pede a IA (botão "Sugerir tradução" chama Lovable AI Gateway).
3. Salva `ts_impl` + marca `status = translated`.
4. Game-server recarrega o `ScriptExecutor` (via `subscriptions.ts` que já observa Supabase).

Prioridade de tradução (o suficiente pra ter gameplay real):
1. Movements de teleport/piso/quest-door (~30 scripts).
2. Actions de escadas, alavancas, portas, chaves (~50).
3. Runas e spells básicas já viram sistema, não script.
4. Talkactions de comando `/spawn`, `!online`, `!bless`.
5. NPCs principais das cidades iniciais (Rookgaard + Thais + Carlin) primeiro; resto fica stub.
6. Quests: Anihilator, POI, Demon Helmet, Firewalker — traduzir sob demanda.

## Detalhes técnicos importantes

**Não vai pro bundle do cliente:**
- world.otbm, items.otb, os 878 Lua originais crus.
- Tudo isso vai pro Supabase (Storage bucket privado `otserv-source`) via server functions — histórico + backup do material original.

**Cliente browser recebe só:**
- Sprites já convertidas em PNG e JSON de items/monsters do Supabase.
- Rota autenticada `/dev/*` gate protege o import.

**Sequência de execução recomendada:**
1. Aprovar Fase 1 (migration) → executo.
2. Rodo Fase 2 offline aqui no sandbox e comitto os `.jsonl` gerados em `scripts/otserv-import/out/` (ou você aciona pela UI da Fase 3).
3. Faço Fase 3 e você importa tudo em dry-run → import real.
4. Fase 4 (game-server) em paralelo com Fase 6 (tradução).
5. Fase 5 pra ter as sprites certas no Phaser.

**Estimativa de tempo total até "server 7.4 rodando com Rookgaard jogável":** 3-5 sessões de trabalho grandes.

## Confirmações antes de começar

1. **Fase 1 (migration) posso escrever e submeter agora?** É a base pra todo o resto e não quebra nada existente (só adiciona colunas/tabelas + expande as atuais).
2. **Scripts Lua**: OK manter o Lua original arquivado no Supabase e traduzir por demanda pra TS, certo? Alternativa seria embutir um interpretador Lua no game-server (fengari/wasmoon) — funciona mas fica lento e não roda no edge.
3. **Mapa**: começamos importando **só Rookgaard** (área pequena, uns 10k tiles) pra validar o pipeline, depois o mundo inteiro? Ou já vai tudo os 69MB no primeiro import?
4. **Contas do dump SQL**: descarto e usamos só Supabase Auth (recomendado), certo?
