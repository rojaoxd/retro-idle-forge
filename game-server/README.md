# OldDungeons game-server

Fork do [Tibia74-JS-Engine](https://github.com/Inconcessus/Tibia74-JS-Engine)
(autor **Inconcessus**, liberado publicamente no OTLand) com auth trocada
para **Supabase**. Mesmo tick de 50ms, mesmo protocolo WS binário, mesmos
XMLs de itens/monstros/spells — só que o `login-server` HMAC + SQLite
foram substituídos por JWT do Supabase e persistência na tabela
`characters` do mesmo projeto Supabase que o site (`retro-idle-forge`) usa.

## O que foi trocado

| Original                             | Aqui                                            |
| ------------------------------------ | ----------------------------------------------- |
| `login.js` + `accounts.db` (SQLite)  | **removido** — site faz login via Supabase Auth |
| `src/auth-service.js` (HMAC)         | `engine-src/auth-service.js` (JWT via JWKS)     |
| `src/account-database.js` (SQLite)   | `engine-src/account-database.js` (Supabase)     |
| Cliente HTML em `/client`            | Ficou só como referência em `vendor-client-reference/` para a fase de portar o renderer Canvas 2D para React |

Todo o resto (world, tile, creature, combat, spells, containers, depot,
house, pathfinder, XML loaders) veio intacto do repo original.

## Deploy no EC2

```bash
# 1. clonar o projeto e entrar no game-server
cd game-server
npm install

# 2. baixar o mapa (não é versionado — pesa 62 MB)
wget -O data/740/world/Tibia74.otbm \
  https://github.com/Inconcessus/Tibia74-JS-Engine/raw/master/data/740/world/Tibia74.otbm

# 3. baixar os assets binários do cliente (só se for servir client HTML aqui)
wget -O vendor-client-reference/data/740/Tibia.dat \
  https://github.com/Inconcessus/Tibia74-JS-Engine/raw/master/client/data/740/Tibia.dat
wget -O vendor-client-reference/data/740/Tibia.spr \
  https://github.com/Inconcessus/Tibia74-JS-Engine/raw/master/client/data/740/Tibia.spr

# 4. .env com as credenciais do Supabase
cp .env.example .env
# edite .env — precisa da SERVICE_ROLE_KEY

# 5. subir com PM2
npm i -g pm2
pm2 start ecosystem.config.cjs
pm2 logs olddungeons-engine
```

O engine expõe o WebSocket binário em `ws://0.0.0.0:2222`. Ponha um
Caddy/NGINX/Cloudfront na frente para TLS (`wss://`).

## Como o site conecta

O browser autentica no Supabase, recebe o JWT, escolhe um `characterId`
da tabela `characters` e abre:

```
wss://<seu-host>/?token=<jwt>&characterId=<uuid>
```

O `auth-service.js` valida o JWT pela JWKS pública do Supabase; o
`account-database.js` carrega o `engine_data` do personagem (ou materializa
a partir do template no primeiro login). Save periódico grava de volta em
`characters.engine_data` + colunas resumo (level, HP, pos) que o site lê.

## Estrutura

```
game-server/
├─ engine.js                  # entrypoint (do repo original)
├─ require.js                 # bootstrap de globals
├─ config.json                # config do engine (sem HMAC / DB local)
├─ ecosystem.config.cjs       # PM2
├─ .env.example
├─ engine-src/                # src/ do repo original — 110 arquivos
│  ├─ auth-service.js         # ← reescrito: JWT Supabase
│  ├─ account-database.js     # ← reescrito: adapter Supabase
│  ├─ http-server.js          # ← patchado: upgrade async + characterId
│  ├─ websocket-server.js     # ← patchado: sessão do JWT
│  └─ ... (108 arquivos originais intactos)
├─ data/740/                  # XMLs de itens/monstros/npcs/spawns/spells
│  └─ world/                  # Tibia74.otbm (baixar no EC2)
└─ vendor-client-reference/   # cliente HTML original — referência para porta
```

## Próximos passos (fora deste README)

- **Fase 3 (deploy)** — subir no EC2 e validar handshake com um JWT real do site.
- **Fase 4 (cliente)** — portar `vendor-client-reference/src/` para React
  Canvas 2D em `src/components/game/EngineCanvas.tsx`.
- **Fase 5 (/dev)** — cabear painel `/dev` no site ao canal admin do engine
  (jogadores online, broadcast, tail de logs).
