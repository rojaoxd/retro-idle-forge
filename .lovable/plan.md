
## Diagnóstico

Dois problemas se somando causam a tela preta:

1. **Colyseus não conecta.** Console mostra `[Colyseus] Falha ao conectar` no WebSocket para `wss://fibula.pro`. Hoje, se essa conexão falha, o `PhaserCanvas` **retorna antes de inicializar o Phaser** — então nem os tiles do Supabase são desenhados. Resultado: preto total.
2. **Viewport travado em 15/11.** `GameViewport` força `aspectRatio: "15 / 11"`, deixando barras pretas laterais mesmo quando renderiza.

## O que vou fazer (frontend)

**1. Desacoplar render do mapa da conexão Colyseus** (`src/components/tibia/PhaserCanvas.tsx`)
- Ordem nova: sempre monta o Phaser + `GameScene` imediatamente → chama `loadWorldFromDB()` do Supabase → então tenta `joinGameRoom` em paralelo.
- Se o Colyseus falhar, o mapa continua visível. Aparece um overlay discreto no topo esquerdo: “Desconectado do servidor · Tentar novamente”.
- Quando o room conecta, o `GameScene` recebe o room via um novo método `attachRoom(room)` e passa a spawnar players.

**2. Ajustar `GameScene` para funcionar sem room** (`src/game/scenes/GameScene.ts`)
- `init()` não exige mais `room`. Se não houver room, apenas não faz `wireRoom` e não escuta input de movimento.
- Novo `attachRoom(room)` que roda o `wireRoom` atual.
- Enquanto não há player local, câmera fica centralizada no spawn configurado (10,10) via `centerOn(SPAWN_X*TILE, SPAWN_Y*TILE)` — o mapa já aparece “enquadrado” como no Tibia.
- Como o server define spawn via env, o cliente lê `VITE_SPAWN_X/Y` (default 10/10) só para o enquadramento inicial.

**3. Viewport ocupa toda a área acima do chat** (`src/components/tibia/GameViewport.tsx`)
- Remover `aspectRatio: "15 / 11"` e o wrapper interno. O `<PhaserCanvas />` passa a preencher 100% da largura e altura disponíveis (o `Phaser.Scale.RESIZE` já cuida do redimensionamento).
- Chat continua com `h-52` fixo embaixo; sidebar direita continua igual → o mapa preenche exatamente o retângulo preto que sobrou.

**4. Personagem no meio, estilo Tibia**
- Já usamos `cameras.main.startFollow(container, true, 0.15, 0.15)` para o player local. Vou adicionar `setZoom(2)` (já existe) + `roundPixels` + garantir que o follow acontece assim que o player local entra em `players.onAdd`. Sem room, câmera fica no spawn (item 2).

## Infra (você roda na VM, fora do meu escopo)

O erro `wss://fibula.pro` provavelmente é um dos três:
- `pm2 status` → processo `olddungeons` caiu. `pm2 restart olddungeons --update-env`.
- Nginx não faz upgrade pra WebSocket. O bloco do `fibula.pro` precisa ter dentro do `location /`:
  ```
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_pass http://127.0.0.1:2567;
  ```
- Certificado TLS ausente/expirado → `sudo certbot --nginx -d fibula.pro`.

Rode `curl -i https://fibula.pro/` e cole a resposta se quiser que eu diagnostique.

## Arquivos alterados

- `src/components/tibia/PhaserCanvas.tsx` — mapa carrega antes da conexão; overlay de erro com retry.
- `src/components/tibia/GameViewport.tsx` — remove trava de aspecto.
- `src/game/scenes/GameScene.ts` — `attachRoom` opcional; câmera centraliza no spawn quando sem player.

## Fora de escopo agora

- Não vou mexer no game-server (spawn/movimento já foram feitos no turno anterior).
- Não vou reescrever a sidebar/chat.
- Não vou tocar no editor de mapa.
