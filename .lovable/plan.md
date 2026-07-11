
## Contexto

O cliente do repo `Inconcessus/Tibia74-JS-Engine` já está em `public/client/`. Comparando arquivo a arquivo com o upstream:

- **JS e CSS**: 100% idênticos (nenhum diff). Não há nada de código do cliente para trazer.
- **Faltam apenas assets binários**: `data/740/Tibia.spr` (9.3 MB), `data/740/Tibia.dat` (112 KB) e 20 arquivos em `sounds/` (~21 MB no total).
- **Customização local preservada**: `public/client/lovable-bootstrap.js` — ele lê `#token=...&cid=...&host=...` da URL, intercepta `fetch('/data/740/...')` para buscar sprites do game-server (AWS), substitui `NetworkManager.connect()` por um handshake via WebSocket com JWT do Supabase e auto-clica "Enter Gameworld" quando o botão libera.

O print (Sprites/Objects: Missing, botões cinzas desabilitados) é exatamente o estado esperado quando `Tibia.spr`/`Tibia.dat` não carregam. O `.env` aponta assets para `https://fibula.pro`, então o cliente tenta `GET https://fibula.pro/data/740/Tibia.spr` — se o game-server na AWS não serve esse arquivo (ou CORS bloqueia), os botões nunca liberam.

## Estratégia

Duas frentes independentes. Você me diz qual (ou as duas).

### A. Servir `Tibia.spr` / `Tibia.dat` pelo game-server na AWS (recomendado)

Motivo: os arquivos `.spr`/`.dat` são conteúdo original CipSoft. **Não** subir pro repo Lovable/GitHub público. Eles ficam só na sua AWS, no game-server que você já roda.

Passos:
1. Colocar `Tibia.spr` e `Tibia.dat` em `~/olddungeons/game-server/data/740/` na AWS (você já tem em local — pode copiar via `scp`).
2. Adicionar um endpoint HTTP estático no `engine.js` (ou um bloco no nginx/caddy que já expõe a porta 2222) que sirva `GET /data/740/*` com `Access-Control-Allow-Origin: https://retro-idle-forge.lovable.app` (e o preview URL).
3. Confirmar que `VITE_GAME_ASSETS_URL="https://fibula.pro"` bate com o host que serve esses arquivos com HTTPS válido.
4. Testar `curl -I https://fibula.pro/data/740/Tibia.spr` — precisa retornar `200` + CORS header.

Assim que o fetch dos assets funcionar, o cliente destrava sozinho e o bootstrap auto-clica Enter Gameworld.

### B. Trazer os sons do upstream para o Lovable

Os 20 `.ogg` (chuva, floresta, caverna, passos, trovões — ~21 MB) foram publicados pelo próprio Forby no repo aberto à comunidade e são ambient/foley genéricos. Copiá-los pra `public/client/sounds/` deixa o cliente 100% igual ao modelo (senão fica silêncio ambiente).

Passos:
1. `cp -r /tmp/tibia74/client/sounds/* public/client/sounds/` (arquivos vêm do clone do GitHub que já está no sandbox).
2. Nada mais — o `index.html` já tem as tags `<audio>` referenciando `sounds/*.ogg` no path relativo, então são servidos direto pelo Lovable.

## Fora do escopo desta etapa

- Não vou tocar em nenhum `.js`/`.css` do cliente (já são idênticos ao upstream).
- Não vou versionar `Tibia.spr`/`Tibia.dat` no projeto Lovable.
- Não vou mexer em rotas do site (`play.$characterId.tsx` já está correto).

## Perguntas antes de eu implementar

1. Sigo com **B** agora (copiar os 20 `.ogg` do upstream para `public/client/sounds/`)? São ~21 MB no bundle estático do site.
2. Para **A**, você quer que eu escreva o patch no `engine.js` (servir `/data/740/*` via Express/http nativo + CORS) para você rodar na AWS? Se sim, confirma: os arquivos `Tibia.spr`/`Tibia.dat` já estão em `~/olddungeons/game-server/data/740/` na AWS, ou precisa que eu inclua as instruções `scp` também?
