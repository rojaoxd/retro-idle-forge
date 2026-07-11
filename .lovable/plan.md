
# Reset e migração para Tibia74-JS-Engine (fork liberado pelo autor)

Licença: **confirmada** — autor liberou no OTLand para uso/fork livre. Vamos tratar como base direta (não só referência): copiar/adaptar o código do repo `Inconcessus/Tibia74-JS-Engine` dentro do nosso `game-server/`.

Objetivo: apagar tudo que fizemos de servidor de jogo, renderer e /dev (ficou amador), e recomeçar em cima da base do engine, mantendo apenas o site + Supabase Auth.

---

## 1. O que apagar

**Servidor Colyseus (todo):**
- `game-server/` inteiro

**Cliente Phaser + Colyseus:**
- `src/game/`, `src/components/tibia/PhaserCanvas.tsx`, `GameViewport.tsx`
- `src/components/game/canvas/GameCanvas.tsx`
- `src/net/colyseus.ts`
- `src/stores/{gameSessionStore,netStore,tibiaStore,gameStore}.ts` (recriamos enxutos depois)
- deps: `phaser`, `colyseus`, `colyseus.js`, `@colyseus/schema`, `@colyseus/ws-transport`

**Importadores /dev amadores:**
- `src/lib/dev/tibia/*`, `src/lib/dev/obd/*`, `src/lib/otserv/*`
- `src/lib/dev/{items,objects,sprites,creatures,monsters,npcs,palettes,scripts,effects,vocations,map,server,config}.functions.ts`
- `src/routes/dev.{items,objects,objects_.import-client,sprites,creatures,monsters,npcs,palettes,scripts,spells,effects,vocations,map,config,import}.tsx`
- `src/components/dev/{MapEditor,SpritePicker,SpriteThumb,OverviewPanel}.tsx`
- `scripts/otserv-import/`, `public/parse-otbm.ts`

**Banco (migration destrutiva):**
- Drop: `game_items`, `game_objects`, `game_object_sprites`, `game_sprites`, `game_creatures`, `game_visual_effects`, `game_config`, `map_tiles`, `map_areas`, `map_palettes`, `object_import_jobs`, todas as `otserv_*`, `monsters`, `npcs`, `npc_keywords`, `npc_trades`, `quests`, `quest_steps`, `scripts_actions`, `scripts_movements`, `spells`, `vocations`, `vocations_catalog`, `server_configs`, `server_logs`, `online_players`
- **Preservar/adaptar**: `profiles`, `user_roles`, `characters` (schema novo — §3)
- Esvaziar bucket `game-sprites`

**Intacto:** rotas `/auth`, `/_authenticated/*`, `/characters`, integrações Supabase, site marketing.

---

## 2. Novo `game-server/` (fork do Tibia74-JS-Engine)

Copiar `src/` e `data/` do repo, migrar para TypeScript conforme necessário, e substituir SOMENTE:

**Removido do original:**
- `login.js` + `account-database.js` (SQLite) → substituído por auth Supabase
- `accounts.db`
- persistência de character em JSON local → substituída por Supabase

**Adaptações (adapters):**
```
game-server/
  src/
    (todo o engine original: world.js, tile.js, creature.js, monster.js,
     spells.js, combat.js, pathfinder.js, container.js, depot.js, house.js,
     packet-reader.js, packet-writer.js, gameserver.js, ws-server.js, etc.)
    adapters/
      supabase-auth.ts       # valida JWT via SUPABASE_JWKS no handshake WS
      supabase-characters.ts # load/save character no Supabase (substitui JSON)
      supabase-profiles.ts   # lê profile/roles
  data/
    (mapa .otbm, items.xml, monsters/, npcs/, spells/ — copiados do repo)
  package.json               # node puro + ws + jose + @supabase/supabase-js + xml2js
  ecosystem.config.cjs       # PM2 para EC2
```

**Fluxo:**
1. Site → Supabase Auth → JWT
2. Browser abre WS para EC2 e envia JWT no primeiro pacote
3. `adapters/supabase-auth.ts` valida JWT (JWKS) → `supabase-characters.ts` carrega character → spawna no mundo
4. Tick 50ms do engine roda gameplay
5. Save periódico (30s) + save no logout → `supabase-characters.ts` grava snapshot

**Ports do engine:** mesmos do original (WS binário na 2000, admin na 1338, HTTP health na 8080).

---

## 3. Novo schema `characters`

Substitui colunas atuais pelo formato do engine (snapshot inteiro do estado):
- `id`, `user_id`, `name`, `sex`, `vocation`, `level`, `experience`
- `health`, `health_max`, `mana`, `mana_max`, `capacity`
- `pos_x`, `pos_y`, `pos_z`
- `skills` jsonb (fist/club/sword/axe/dist/shield/fish/magic + tries)
- `inventory` jsonb (10 slots + containers aninhados)
- `depot` jsonb (por cidade)
- `outfit` jsonb (lookType, head, body, legs, feet, addons)
- `spells_known` text[]
- `conditions` jsonb (buffs/debuffs ativos)
- `last_login`, `online`

---

## 4. Novo cliente (Canvas 2D — sem Phaser)

Portar o client HTML/JS do repo para dentro do React:
- `src/lib/engine-client/` — TypeScript port de `gameclient.js`, `renderer.js`, `canvas.js`, `sprite-loader.js`, `minimap.js`, `input.js`, `protocol.js`
- **Sprites**: `Tibia.dat`/`.spr` servidos pelo próprio `game-server` via HTTP estático (não Supabase Storage)
- `src/components/game/EngineCanvas.tsx` monta `<canvas>` e chama o engine-client
- HUD React já pronto (`TibiaShell`, `Minimap`, `VitalsBars`, `ChatDock`, `QuickInventory`, `SkillsPanel`, `StoreVipRow`) permanece, trocando fonte de dados por um novo `useEngineStore`
- Rota `/play/$characterId` conecta ao WS AWS com JWT e monta o canvas

---

## 5. Nova `/dev` (operação de servidor, não edição de conteúdo)

Fora: editores de item/sprite/mapa/monstro (o engine usa XML/OTBM — edita-se fora com RME).

Dentro:
```
/dev/overview      # status EC2, jogadores online, uptime, tick lag
/dev/players       # online agora, kick/ban/teleport (canal admin do engine)
/dev/accounts      # busca profiles + gerenciar user_roles (admin/gm/tutor)
/dev/broadcast     # motd + broadcast em tempo real
/dev/logs          # tail server_logs (kill, login, trade, comando GM)
/dev/config        # edita data/config.json do engine via canal admin
/dev/data-files    # read-only browser dos items.xml / monsters/*.xml
```

Tabelas novas mínimas: `server_logs` e `server_broadcasts`. Zero tabelas de conteúdo de jogo.

Editores visuais in-engine podem voltar em fase futura.

---

## 6. Ordem de execução

Este plano cobre **§1 + §2** (limpeza total + fork do engine com auth Supabase funcionando). Renderer/gameplay/UI ficam para turnos seguintes:

1. Migration destrutiva (drop das tabelas + reset do `characters` + esvaziar bucket)
2. Deletar todos os arquivos listados em §1
3. `git clone` do Tibia74-JS-Engine → copiar `src/` + `data/` para `game-server/vendor/tibia74/` e wrapper `game-server/src/index.ts`
4. Escrever `adapters/supabase-auth.ts`, `adapters/supabase-characters.ts`, `adapters/supabase-profiles.ts`
5. Remover `login.js`/`account-database.js`; plugar adapters em `gameserver.js`/`ws-server.js`
6. `package.json` novo (`ws`, `jose`, `@supabase/supabase-js`, `xml2js`) + `ecosystem.config.cjs` PM2
7. README com instruções de deploy EC2

Fases seguintes (planos separados quando pedir):
- §4: portar cliente Canvas 2D
- §5: nova `/dev`
- Combate/spells/containers já vêm prontos do fork — só afinar

---

## 7. Riscos

- **Assets Tibia 7.4** (`Tibia.dat`/`.spr`/`Tibia74.otbm`): você é responsável pelo direito de uso; servidos pelo game-server no EC2. Confirma que tem os arquivos ou que vamos usar os que estão no repo?
- **Migration destrutiva**: apaga todos os dados importados. Sem rollback.
- **JavaScript → TypeScript**: manter o fork em JS puro (rápido) ou portar para TS (mais trabalho, melhor DX)?

---

## Confirmações antes de implementar

1. Ok dropar todas as tabelas de conteúdo listadas em §1?
2. Fork do engine **em JS puro** (como está no repo, mais rápido) ou **portar para TypeScript**?
3. Ok começar por §1 + §2 (limpeza + fork rodando com JWT Supabase) e deixar cliente/dev para próximos turnos?
