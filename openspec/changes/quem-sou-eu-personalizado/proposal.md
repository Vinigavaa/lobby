## Why

O jogo "Quem Sou Eu" atual (`guess-who`) sorteia personagens de um banco fixo de cartas, o que limita a graça do jogo para grupos de amigos que preferem inventar os próprios personagens uns para os outros. O "Modo Personalizado" resolve isso: cada jogador escreve o personagem de outro jogador (em sequência circular definida pelo servidor), e o app cuida de esconder o próprio card, mediar a descoberta ("Já sei quem eu sou!"), a votação de confirmação e o resultado final — tudo sincronizado em tempo real via WebSocket, como os demais jogos da sala.

## What Changes

- Novo jogo `quem-sou-eu-personalizado`, com entrada própria em `Game` (mesmo padrão de `impostor`, `trivia`, `mimica`, `stop`), rota própria (`/room/[code]/quem-sou-eu-personalizado`) e novos eventos de socket dedicados.
- Fluxo de escolha de personagem: ao iniciar a partida, o servidor gera a ordem circular (jogador N escreve para o jogador N+1) e cada jogador vê um campo de texto único e obrigatório, com limite de caracteres, sem edição após confirmar.
- Tela de espera ("Aguardando os outros jogadores...") até todos confirmarem o envio; a partida só avança para a fase de jogo quando 100% dos jogadores enviaram.
- Fase de jogo: cada jogador vê o card de todos os outros e o próprio oculto ("❓ Quem sou eu?"). Botão "Já sei quem eu sou!" abre um campo de resposta.
- Votação de confirmação: ao responder, todos os demais jogadores (incluindo quem já acertou e está assistindo) votam se ele acertou; maioria decide. Acerto confirmado revela o personagem para o próprio jogador e o move para o estado "espectador" (fora das perguntas/respostas, mas ainda vota).
- Fim de partida: quando restar 1 jogador sem descobrir, a partida termina e mostra a ordem de descoberta, o tempo de cada jogador até acertar, o personagem de cada um e a opção "Jogar novamente" com os mesmos participantes (reinicia a distribuição circular).
- Cancelamento pelo host: se um jogador desconectar durante a partida, o host pode cancelar e voltar todos ao lobby (sem timeout automático).
- **Fora de escopo**: contagem de perguntas feitas por jogador (perguntas Sim/Não/Talvez são verbais, feitas presencialmente, e não passam pelo app) — não será exibida no resultado final.

## Capabilities

### New Capabilities
- `quem-sou-eu-personalizado`: Modo de jogo online onde jogadores escrevem personagens uns para os outros (sequência circular gerada pelo servidor), descobrem o próprio personagem por perguntas verbais, confirmam acertos por votação da sala e veem um resumo final com ordem de descoberta e tempo de cada jogador.

### Modified Capabilities
(nenhuma — não há specs existentes em `openspec/specs/`; o jogo `guess-who` atual não é alterado)

## Impact

- **Banco de dados** (`prisma/schema.prisma`): novo registro em `Game` (seed), reaproveita `Match.state` (JSON) e `Room`/`RoomPlayer` existentes — sem migration de schema, só seed de dados.
- **Socket** (`lib/socket/server.ts`, `lib/socket/events.ts`, `lib/socket/types.ts`): novos eventos client→server (`quem-sou-eu-personalizado:start`, `:submit-character`, `:guess`, `:vote`, `:cancel`, `:play-again`, `:back-to-lobby`) e server→client (`:started`, `:state-updated`, `:back-to-lobby-nav`), seguindo o padrão de `impostor`.
- **Rotas/UI** (`app/room/[code]/quem-sou-eu-personalizado/page.tsx`, `components/quem-sou-eu-personalizado/*`): nova tela de escrita de personagem, espera, jogo/votação e resultado final.
- **`components/room/room-lobby.tsx`**: passa a existir mais um card de jogo na lista e mais um `case` no `startGame()`.
- Nenhum impacto no jogo `guess-who` (Quem Sou Eu clássico) nem nos demais jogos existentes.
