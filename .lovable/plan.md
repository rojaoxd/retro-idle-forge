## Diagnóstico (feito agora do sandbox)

- `https://fibula.pro` → **não resolve DNS / timeout**. O domínio não aponta para lugar nenhum acessível.
- `http://54.207.144.3:2567/` → **responde HTTP 404** — o Colyseus **está rodando** na instância AWS (404 é normal na raiz).
- `https://54.207.144.3:443` → **timeout** — não tem TLS/reverse-proxy escutando.

Ou seja: o servidor está no ar, mas o cliente aponta para `wss://fibula.pro` (TLS na 443) e esse endpoint não existe. O navegador, num site HTTPS publicado, **não aceita** `ws://` puro (mixed content bloqueado) — WSS com certificado válido é obrigatório.

## O que você precisa fazer fora do código (AWS + domínio)

1. **DNS** — no seu provedor do domínio `fibula.pro`, criar um registro **A**:
   - Nome: `@` (ou um subdomínio, ex.: `game.fibula.pro`)
   - Valor: `54.207.144.3`
2. **Security Group da EC2** — liberar entrada:
   - TCP **80** (para o Let's Encrypt validar HTTP-01)
   - TCP **443** (WSS)
   - Manter 2567 fechada ao público (só o proxy fala com ela)
3. **TLS reverse proxy na EC2** — instalar Caddy (mais simples) ou nginx+certbot para terminar TLS na 443 e fazer proxy para `localhost:2567` com upgrade WebSocket. Ex. Caddyfile:
   ```
   fibula.pro {
     reverse_proxy localhost:2567
   }
   ```
   Caddy pega o certificado automático. Se preferir um subdomínio (`game.fibula.pro`), me avise.
4. **`.env` do game-server na EC2** — conferir se estão setados (esse é o "detalhe da Supabase" que ficou pendente):
   - `SUPABASE_URL=https://hewxrvrqbzkggajgojid.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=<service role do dashboard>` (nunca no frontend)
   - `PORT=2567`
   - Reiniciar o processo (pm2 restart).
   Sem isso, o `onJoin` falha ao validar o `accessToken` e a sala rejeita a conexão mesmo com TLS funcionando.

## O que eu vou mudar no código (quando você aprovar)

Muito pouco — o cliente já está correto apontando para `wss://fibula.pro`. Só ajustes de robustez/DX:

1. **`src/net/colyseus.ts`** — melhorar a mensagem de erro para distinguir "servidor offline / DNS" de "sessão inválida" (hoje engole tudo como "Servidor do jogo indisponível"), logando o erro real no console pra debug.
2. **`game-server/README.md`** — adicionar seção curta "Setup DNS + TLS (Caddy)" com o Caddyfile acima e o checklist de Security Group, para não perder da próxima vez.
3. **`game-server/.env.example`** — já está OK, só confirmar que reflete o que precisa estar na EC2.

## Fora de escopo

- Não vou trocar `wss://fibula.pro` por IP direto — não funciona em site HTTPS.
- Não vou mexer no fluxo de auth, personagens, mapa ou Phaser.
- O erro de hydration em `/auth` que aparece nos logs é separado; posso tratar depois se quiser.

## Próximo passo

Confirma que vai configurar DNS + Caddy + `.env` na EC2? Se sim, aprovo o plano e faço as mudanças pequenas do cliente + docs. Se preferir subdomínio (`game.fibula.pro`) em vez do apex, me diga antes.
