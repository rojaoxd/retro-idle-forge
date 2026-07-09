# Plano: Cliente estilo Tibia 7.4

Objetivo: layout 100% fiel ao screenshot (chrome cinza escuro, coluna direita fixa, minimapa no topo, barras HP/MP, grid de slots de equipamento, abas Skills/Battle/VIP/Analyz./Bestiary/Stash/Hotkeys, painel Skills com stats, chat inferior com abas Default/Server Log, canvas de mapa central). Sprites virão depois — usar placeholders com posicionamento/proporções idênticas. Dados via Zustand (sem Supabase por ora). Gameplay entra em fases seguintes.

## Fase 1 — Layout fiel (esta etapa)

Substituir o `GameShell` atual (estilo RPG "bevel dourado") por um chrome escuro fiel ao Tibia clássico.

### Estrutura (grid)

```text
+----------------------------------------------+-------------+
|                                              |  Minimap    |
|                                              +-------------+
|                                              | HP bar      |
|                                              | MP bar      |
|              GAME CANVAS                     +-------------+
|          (viewport 15x11 tiles)              | Inv slots   |
|          top-left: FPS / Latency             | (2 col x 5) |
|                                              +-------------+
|                                              | Store/Vip   |
|                                              +-------------+
|                                              | Skills tabs |
|                                              | (Skills/    |
|                                              |  Battle/VIP)|
|                                              +-------------+
|                                              | Skills list |
+----------------------------------------------+-------------+
| Chat tabs: Default | Server Log                            |
| Chat log area                                              |
| [ Say input ..........................  ] [ Chat on ]      |
+------------------------------------------------------------+
```

### Componentes a criar (`src/components/tibia/`)

- `TibiaShell.tsx` — grid principal, fundo `#000`, borda dupla cinza.
- `GameViewport.tsx` — canvas central (aspect 15:11), overlay FPS/Latency vermelho no canto sup. esquerdo, nome do char verde acima do sprite.
- `sidebar/Minimap.tsx` — janela "Minimap" com título, botão Centre, 4 setas de navegação, botões +/- zoom.
- `sidebar/VitalsBars.tsx` — HP (vermelho) 150 e MP (azul) 0, com números à direita.
- `sidebar/QuickInventory.tsx` — grid 3 colunas de slots quadrados (helmet, amulet, backpack, weapon, armor, shield, ring, legs, boots) + coluna direita com ícones auxiliares (ammo, stop/follow modes, PvP, Quests, Options, Logout) + "Cap: 336".
- `sidebar/StoreVipRow.tsx` — botão verde "Store" e ícone VIP.
- `sidebar/SkillsPanel.tsx` — abas topo: Skills / Battle / Vip / Analyz., segunda linha: Bestiary / Stash / Hotkeys. Conteúdo "Skills" com lista: Exp, Level, Hitpoints, Mana, Speed, Capacity, Food, Stamina, Magic Level, Fist/Club/Sword/Axe/Distance Fighting, Shielding, Fishing.
- `chat/ChatDock.tsx` — abas Default / Server Log, log com timestamps `HH:MM` amarelos + texto vermelho para system, input "Say..." + botão "Chat on".

### Estilos (`src/styles.css`)

Adicionar tokens Tibia-clássicos preservando os atuais (fase 2 do jogo pode reutilizar):

```css
--tibia-bg: #000;
--tibia-panel: #444;
--tibia-panel-dark: #222;
--tibia-border-light: #888;
--tibia-border-dark: #111;
--tibia-text: #c0c0c0;
--tibia-text-dim: #909090;
--tibia-hp: #c03030;
--tibia-mp: #3060c0;
--tibia-accent-green: #40a040;
--tibia-timestamp: #c0c000;
--tibia-system: #c03030;
```

Utilitários novos: `tibia-bevel` (borda em relevo cinza), `tibia-inset` (afundado), `tibia-tab` / `tibia-tab-active`. Fonte da UI: Verdana/Tahoma 11px (system-ui fallback) — a fonte pixel atual fica só para o canvas.

### Estado (`src/stores/tibiaStore.ts`)

Novo store enxuto (mantém o atual `gameStore` intocado por enquanto):
- `character`: name, level, exp, hp/hpMax, mana/manaMax, cap, capMax, speed, food, stamina, magicLevel
- `skills`: fist, club, sword, axe, distance, shielding, fishing (valor + progresso)
- `inventory`: 10 slots equipáveis
- `chat`: canais `default | serverLog`, mensagens `{ ts, type: 'system'|'say'|'info', text }`
- Mensagens seed idênticas: `We hope you enjoy our game!`, `Website: https://mythera74.com`, `Discord: ...`, `Wiki: ...`

### Rota

`src/routes/index.tsx` passa a renderizar `<TibiaShell />` (o antigo `GameShell` fica no repo para referência mas não é montado).

## Fase 2 — Mapa navegável (próxima etapa, plano separado)

Mapa tile-based 32px, viewport 15x11, movimento por WASD/setas, colisão, minimapa refletindo posição do jogador, sistema de sprites carregáveis via `src/assets/tibia/` (assim que você enviar).

## Fase 3 — Gameplay (etapas seguintes)

Combate por turnos client-side, uso de itens do inventário, chat funcional entre canais, skills subindo com uso, save opcional no Supabase depois.

## Detalhes técnicos

- Sem Supabase nesta fase; store 100% local (Zustand já instalado).
- Sem novas dependências.
- Manter build TanStack Start passando: rota única `/`, `__root.tsx` intocado a não ser pelo `<title>` ("Mythera 7.4").
- Placeholders: quadrados `#2a2a2a` com borda `#555` no lugar dos sprites; personagem = quadrado amarelo com nome verde acima; minimapa = `<canvas>` com ruído verde/marrom procedural.
- Não remover arquivos antigos ainda — trocar apenas o que a rota `/` renderiza, para permitir reverter fácil.

## Entregáveis desta etapa

1. Novos arquivos em `src/components/tibia/*` e `src/stores/tibiaStore.ts`.
2. Tokens + utilitários Tibia em `src/styles.css`.
3. `src/routes/index.tsx` renderizando `TibiaShell`.
4. Título "Mythera 7.4" em `__root.tsx`.
5. Screenshot Playwright do preview para comparar lado-a-lado com sua imagem antes de encerrar.

Confirma que posso partir para a Fase 1 assim?