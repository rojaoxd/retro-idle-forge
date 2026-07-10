## Objetivo

Fazer o servidor Colyseus na AWS (Lightsail `54.233.23.67`) parar de ler arquivos locais e passar a ler **tudo do Supabase** (`map_tiles`, `game_objects`, `server_configs`, `monsters`, `spells`, `scripts_*`, `npcs`, etc.), com **uma única conexão compartilhada** via Supavisor (pooler), cache em memória e writes em lote — nunca "uma conexão por jogador".

O código do servidor vai viver **dentro deste próprio projeto Lovable**, numa pasta nova `game-server/`, e o deploy pra AWS é feito com **um único comando** (`git pull && pm2 restart`). Depois da configuração inicial, você nunca mais precisa mexer no Linux.

---

## Arquitetura (visão do usuário)

```text
 Navegador (Lovable)  ─ws─▶  Colyseus (AWS Lightsail)
                                │
                                ▼  (1 pool compartilhado, Supavisor)
                              Supabase  ◀── Painel /dev (admin)
```

- **Leitura**: Colyseus carrega mapa/configs **uma vez** no boot + escuta `postgres_changes` para recarregar quando o admin editar no painel.
- **Escrita**: posição/HP dos jogadores fica em memória; salva em Supabase a cada N segundos em batch (`upsert` em array), nunca a cada tick.
- **Conexões**: 1 client Supabase (service role) por processo, apontando pro **pooler transaction mode** do Supavisor. 1.000 jogadores = 1 conexão TCP, não 1.000.

---

## Estrutura de arquivos (novos, neste repo)

```text
game-server/
  package.json            # deps próprias: colyseus, @colyseus/ws-transport, @supabase/supabase-js, dotenv
  tsconfig.json
  ecosystem.config.cjs    # pm2: 1 processo, autorestart, logs
  src/
    index.ts              # boot: express + WebSocketTransport na porta 2567
    supabase.ts           # createClient(SERVICE_ROLE) singleton, usa POOLER_URL
    cache/
      WorldCache.ts       # carrega map_tiles/game_objects/server_configs 1x, expõe getters síncronos
      subscriptions.ts    # supabase.channel() em map_tiles, game_objects, server_configs → WorldCache.reload(tabela)
    rooms/
      GameRoom.ts         # onCreate lê WorldCache (não Supabase); onJoin valida player; onLeave persiste
    persistence/
      PlayerWriter.ts     # fila in-memory; flush a cada 5s com upsert em array (1 request p/ N jogadores)
      Logger.ts           # insert em server_logs em batch
  .env.example            # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_POOLER_URL, PORT=2567
  README.md               # passo-a-passo AWS (abaixo)
```

Nada no `src/` do frontend muda. `src/net/colyseus.ts` continua apontando pro mesmo IP/porta.

---

## Regras técnicas (o "alerta" que você pediu)

1. **1 client Supabase por processo**, criado em `supabase.ts` como singleton. Proibido `createClient()` dentro de `onJoin`/`onMessage`.
2. **URL obrigatória = Supavisor pooler** (`aws-0-…pooler.supabase.com:6543`, transaction mode). Nunca a URL direta `db.<ref>.supabase.co:5432`.
3. **Leituras "quentes" (a cada tick) vêm do WorldCache**, não do Supabase. O cache só recarrega quando `postgres_changes` avisa.
4. **Escritas em batch**: `PlayerWriter` acumula posição/HP por 5s e faz **1 `upsert`** com array. `server_logs` idem.
5. **Sem realtime por jogador**: só o servidor assina canais Supabase; jogadores recebem estado via schema do Colyseus.

---

## Deploy na AWS (uma única vez, depois nunca mais)

Comandos que você cola no terminal da Lightsail (o print que enviou). Cada bloco é 1 cópia-cola.

```bash
# 1. Node 20 + pm2 (se ainda não tiver)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2

# 2. Clonar o projeto Lovable (só a pasta game-server é usada)
cd ~
git clone https://github.com/<seu-usuario>/<seu-repo>.git olddungeons
cd olddungeons/game-server
npm install
npm run build

# 3. Criar .env (uma vez)
cp .env.example .env
nano .env   # colar SUPABASE_URL, SERVICE_ROLE_KEY e POOLER_URL

# 4. Subir com pm2 e travar no boot
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup    # e cola a linha que ele imprimir

# 5. Firewall Lightsail: liberar TCP 2567 (painel AWS, aba Networking)
```

**Atualizações futuras** (depois de mudar código pelo Lovable):

```bash
cd ~/olddungeons && git pull && cd game-server && npm install && npm run build && pm2 restart all
```

---

## Migração/Supabase

Nenhuma migração de schema — todas as tabelas necessárias já existem (`map_tiles`, `game_objects`, `server_configs`, `monsters`, `spells`, `scripts_actions`, `scripts_movements`, `npcs`, `online_players`, `server_logs`).

Único ajuste: habilitar Realtime nas tabelas que o WorldCache observa (se ainda não estiver):

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.map_tiles, public.game_objects, public.server_configs;
```

Isso é aplicado via ferramenta de migração no momento do build.

---

## O que **não** entra neste passo

- Executar de fato os scripts Lua salvos em `scripts_actions`/`scripts_movements` (só carregamos os textos; execução real é um passo separado).
- Combate/monstros/loot com lógica completa — só a estrutura de leitura do cache fica pronta; regras de jogo evoluem depois.
- CI/CD automático AWS ↔ GitHub — por enquanto é `git pull` manual.

---

## Perguntas rápidas antes de implementar

1. Você quer que eu **crie o repositório do servidor dentro deste mesmo projeto Lovable** (pasta `game-server/`, deploy via `git pull` na AWS) ou prefere que eu entregue os arquivos prontos e você cria o repo git separado? A primeira opção é a que descrevi acima e é a mais simples.
2. Você já tem em mãos a **Connection String do Supavisor** (Supabase → Project Settings → Database → Connection Pooling → "Transaction" mode)? Preciso dela pra `.env` — se não tiver, eu te mostro onde clicar quando entrarmos no build.
