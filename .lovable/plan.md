# Plano: multiplayer render + movimento suave estilo Tibia 7.4

Ajustes só em `src/game/scenes/GameScene.ts`. Nada em Colyseus/servidor, UI ou auth.

## 1. Render de outros jogadores (onAdd / onRemove)

Já existe o esqueleto (`players.onAdd` / `players.onRemove` / `players.forEach`). Vou manter e endurecer:

- Garantir que o listener seja registrado **antes** do `forEach` inicial (evita duplicar quem já estava na sala).
- Diferenciar visualmente: player local com retângulo azul + label ciano; remotos com retângulo âmbar + label verde (já está assim, apenas confirmar).
- Em `onRemove`, destruir o container e limpar qualquer tween ativo no `Map` de players.

## 2. Movimento suave (lerp / tween) na velocidade Tibia 7.4

Trocar a interpolação por-frame (`c.x += (target-c.x)*0.25`) por um **tween linear com duração fixa por tile**, replicando o "step walking" clássico:

- Constante `STEP_MS = 500` (Tibia 7.4: chão normal ≈ 500 ms/SQM na velocidade base). Deixar exportável para ajuste futuro.
- Quando o servidor envia nova posição (`onChange` / `listen x,y` no player):
  1. Se já existe um tween ativo naquele container, `tween.stop()` e snap para o alvo anterior (evita acumular).
  2. Criar `this.tweens.add({ targets: container, x: newX, y: newY, duration: STEP_MS, ease: "Linear" })`.
  3. Guardar o tween em `PlayerVisual.tween` para poder cancelar.
- O `target` já não é mais interpolado no `update()`; remover o loop de lerp manual em `update`.

## 3. Controle local coordenado (envio por `direction`)

Trocar o payload de `move` de `{x, y}` para `{direction}` conforme o servidor espera:

- No `update()`, ler input (setas + WASD) e mapear para `"up" | "down" | "left" | "right"`.
- `this.room.send("move", { direction })`.
- **Predição local otimista** para o jogador local: ao enviar, também disparar o mesmo tween de 500 ms no container do próprio player em direção ao tile alvo (`me.x + dx*TILE`, `me.y + dy*TILE`). Quando o servidor confirmar via `onChange`, o tween é substituído — se bater com o alvo previsto, é imperceptível; se divergir, o novo tween corrige.
- **Cooldown = STEP_MS**: só aceita próximo input quando o tween atual do jogador local termina (usa `nextMoveAt = time.now + STEP_MS`). Isso evita "spam" e casa com a cadência do servidor.
- Bloqueio quando foco está em `<input>`/`<textarea>` (já existe).

## Detalhes técnicos

- Tipo `PlayerVisual` ganha `tween?: Phaser.Tweens.Tween | null`.
- `addPlayer`: cria container em `(p.x, p.y)` sem tween inicial (spawn instantâneo).
- `removePlayer`: `v.tween?.stop()` antes de `container.destroy()`.
- Câmera continua com `startFollow` no container local — o follow acompanha o tween naturalmente.
- Latência: continua medida no primeiro `onChange` após um `send` local (já implementado).

## Fora de escopo
- Animação de sprite andando (frames de walk).
- Path finding / clique-para-andar.
- Colisão por tile no cliente (servidor é autoritativo).
- Mudanças no schema Colyseus ou no servidor.
