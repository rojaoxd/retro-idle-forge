# Game assets

Coloque aqui os arquivos que serão carregados pelo Phaser:

- `mapa.json` — mapa exportado do Tiled Map Editor (formato JSON).
- `sprites.png` — tileset + sprites de jogadores (recomendado tile size 32x32).

Enquanto os arquivos não existirem, a `GameScene` gera um mapa de fallback
in-memory (grid marrom/verde) e desenha jogadores como retângulos coloridos —
o jogo continua funcional de ponta a ponta.

Acesso em runtime: `/assets/mapa.json` e `/assets/sprites.png`.
