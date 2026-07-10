## Objetivo
Corrigir o problema crítico em que o personagem aparece no canto superior esquerdo, a câmera não fica centralizada nele e os movimentos ficam inconsistentes.

## Plano
1. **Unificar coordenadas em pixels no servidor e no cliente**
   - Corrigir o spawn para usar o centro do tile (`tile * 32 + 16`) em vez do canto do tile.
   - Garantir que o servidor nunca envie `NaN`, `undefined` ou coordenadas fora do mapa para o Colyseus.

2. **Corrigir a lógica de movimento por tile**
   - Calcular o tile atual a partir do centro do jogador, não pelo canto/arredondamento atual.
   - Enviar e aplicar movimentos sempre em múltiplos corretos de 32px + centro do tile.
   - Evitar que o cliente faça movimento otimista para uma posição diferente da que o servidor vai confirmar.

3. **Travar a câmera no jogador local**
   - A câmera seguirá exclusivamente o container do jogador local.
   - Ao receber o jogador local, centralizar imediatamente a tela nele.
   - Remover o efeito de suavização/offset que pode deixar a câmera “puxada para o lado”.

4. **Corrigir fallback visual**
   - O personagem temporário não deve competir com o personagem real.
   - Quando o estado real do Colyseus chegar, o fallback será removido e a câmera passará para o player real.

5. **Adicionar logs úteis e seguros para confirmar no EC2**
   - Logar posição inicial do player como tile e pixel.
   - Logar reset automático quando qualquer coordenada inválida for detectada.
   - Ajustar o `PlayerWriter` para não tentar persistir IDs inválidos nem posições inválidas, evitando os erros `invalid input syntax for type uuid` e `trying to encode "NaN"`.

## Resultado esperado
- O personagem nasce visível e centralizado.
- A tela/câmera acompanha o personagem imediatamente.
- WASD e setas movem nas direções corretas.
- Os logs do EC2 param de mostrar `NaN` e `invalid input syntax for type uuid` durante movimento normal.

## Depois da implementação
Você ainda precisará reenviar a versão nova para o EC2/reiniciar o PM2, porque parte do bug está no servidor Colyseus rodando na AWS.