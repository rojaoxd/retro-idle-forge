## Status

O build atual (`bun run build:dev`) passa sem erros — o log de falha reportado é de um turno anterior, antes do ajuste de cores. Nada a corrigir no build.

O ajuste de cores do painel (tokens `--tibia-*`, bevel, HP/MP, botão Store, tabs) já foi aplicado no turno anterior e está no ar.

## Próximo passo sugerido: refinamento visual "100% igual"

Para chegar mais perto do print do Tibia 7.4, proponho um segundo passe focado em detalhes que ainda destoam da referência:

1. **Janela "Skills" — barra de título**
   - Fundo cinza claro `#c0c0c0` com texto preto (não cinza escuro com verde).
   - Ícone verde `◆` à esquerda + botões `_` e `×` à direita no estilo Windows 98.

2. **Abas Skills/Battle/Vip/Analyz + Bestiary/Stash/Hotkeys**
   - Cada aba com ícone colorido próprio (coração vermelho, espadas cruzadas, estrela azul, lupa, dragão, baú, teclado) em vez de só texto.
   - Aba ativa "afunda" (inset) em vez de só clarear.

3. **Barras HP/MP**
   - Altura 12 px, sem ícone colorido do lado (a referência não tem — é só a barra ocupando a largura toda com o número à direita).
   - Cor HP `#c00000` chapado, MP `#0000c8` chapado.

4. **Grid de equipamento (QuickInventory)**
   - Cada slot com sprite fantasma cinza da peça (helm, colar, mochila, arma, armadura, escudo, anel, munição, calça, bota) — placeholder SVG monocromático.
   - Coluna direita com ícones auxiliares corretos: stop/follow, chase/stand, offensive/balanced/defensive, PvP com cores (branco/amarelo/vermelho).
   - "Cap: 336" alinhado embaixo à esquerda.

5. **Chat**
   - Aba "Server Log" com texto vermelho `#c03030` mesmo quando inativa (como na referência).
   - Timestamps `#c0c000` + mensagens system em `#c03030` (já OK).
   - Área de log com fundo `#000` puro e borda inset fina.

6. **Minimap**
   - Título "Minimap" no mesmo estilo da janela Skills.
   - Botão "Centre" verde escuro `#2a6f2a` (não cinza).
   - Setas de navegação em um pad 3×3 mais compacto (28 px por botão).

7. **Área central (viewport)**
   - Fundo `#000` puro com borda inset cinza escura ao redor (a referência tem uma moldura clara ao redor do canvas do jogo).
   - Remover o grid xadrez placeholder — deixar só preto até os sprites reais chegarem.

## Detalhes técnicos

- Alterações só em CSS (`src/styles.css`) e nos componentes em `src/components/tibia/**` — nenhum arquivo novo.
- Placeholders de sprites usam SVG inline monocromático (sem novas dependências, sem assets binários).
- Verificação final: screenshot Playwright em 1600×900 comparado lado-a-lado com `user-uploads://image-3.png`.

Aprovando, aplico esse segundo passe.
