## Objetivo

Garantir que o cliente use exclusivamente o novo servidor (IP `54.207.144.3`, exposto via `wss://fibula.pro`) e remover qualquer referência ao IP antigo `54.233.23.67`.

## Situação atual

- `.env` já define `VITE_COLYSEUS_URL="wss://fibula.pro"` — correto.
- `src/net/colyseus.ts` lê `VITE_COLYSEUS_URL` e cai para `ws://localhost:2567` em dev — o fallback ainda é útil para rodar o `game-server` local, então mantemos.
- `game-server/README.md` ainda menciona o IP antigo `54.233.23.67:2567`.
- `.lovable/plan.md` menciona `wss://fibula.pro` como indisponível — desatualizado.

O código do cliente **não precisa mudar**: como o domínio `fibula.pro` agora resolve para `54.207.144.3`, o `wss://fibula.pro` já aponta para o novo servidor. O trabalho é atualizar documentação e confirmar o fluxo.

## Alterações

### 1. `game-server/README.md`
- Substituir todas as ocorrências de `54.233.23.67` por `54.207.144.3`.
- Adicionar nota curta: o cliente sempre conecta via `wss://fibula.pro` (que resolve para o IP acima); IP direto é apenas para SSH/administração.

### 2. `.lovable/plan.md`
- Remover a linha que descreve `wss://fibula.pro` como indisponível, já que o novo servidor está no ar sob o mesmo domínio.

### 3. Verificação (sem código novo)
- Confirmar em `src/net/colyseus.ts` que `COLYSEUS_ENDPOINT` continua vindo de `VITE_COLYSEUS_URL`.
- Confirmar `.env` = `wss://fibula.pro`.
- Se ainda houver falha de conexão após o deploy do novo servidor, o problema é do lado do servidor (TLS/porta 443 no host `54.207.144.3`), não do cliente — reporto ao usuário sem alterar código.

## Fora de escopo

- Nenhuma alteração no fluxo de auth, personagens, loading ou Phaser.
- Não trocar `wss://fibula.pro` por IP cru (`wss://54.207.144.3:2567`) — foi rejeitado pelo usuário.
