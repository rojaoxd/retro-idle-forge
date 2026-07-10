# OldDungeons — Game Server (Colyseus + Supabase)

Servidor autoritativo do MMORPG. Roda na AWS Lightsail (`54.207.144.3:2567`)
e lê **todo o conteúdo do jogo direto do Supabase** — nada mais fica em
arquivos locais. Tudo o que o admin edita no painel `/dev` do site é
refletido no servidor em segundos, via Realtime.

> O cliente web sempre conecta via `wss://fibula.pro` (que resolve para
> `54.207.144.3`). O IP direto é apenas para SSH e administração do host.

## Regras de conexão com Supabase (importante)

- **1 client Supabase por processo** (`src/supabase.ts`, singleton). Nunca
  `createClient()` dentro de `onJoin`/`onMessage`.
- **Leituras quentes** (a cada tick, movimento, colisão) vêm do
  `WorldCache` em memória. Zero I/O.
- **Escritas de player** (posição, HP) são acumuladas e enviadas em **um
  único `upsert` em array** a cada `PERSIST_INTERVAL_MS` (5s).
- **Logs** idem — batch a cada `LOG_FLUSH_INTERVAL_MS` (10s).
- Cache recarrega **só quando o Realtime avisa** que o admin mudou algo
  em `map_tiles`, `game_objects` ou `server_configs`.

Resultado: 1.000 jogadores online = **1** conexão contínua Supabase, não 1.000.

## Deploy inicial na AWS (uma única vez)

Na Lightsail, dentro do SSH:

```bash
# 1. Node 20 + pm2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git
sudo npm i -g pm2

# 2. Clonar este projeto (github do Lovable)
cd ~
git clone <URL_DO_SEU_REPO_LOVABLE> olddungeons
cd olddungeons/game-server
npm install
npm run build

# 3. Configurar .env
cp .env.example .env
nano .env
#   - SUPABASE_URL          já vem preenchida
#   - SUPABASE_SERVICE_ROLE_KEY  → Supabase Dashboard > Settings > API > service_role
#   - PORT=2567

# 4. Subir e travar no boot
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup     # cole a linha que ele imprimir
```

No painel da Lightsail, aba **Networking**, libere **TCP 2567**.

## Atualização (toda vez que mudar código no Lovable)

```bash
cd ~/olddungeons && git pull && cd game-server \
  && npm install && npm run build && pm2 restart olddungeons
```

## Health check

```bash
curl http://localhost:2567/health
# { "ok": true, "status": "online", "motd": null }
```
