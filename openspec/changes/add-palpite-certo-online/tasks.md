## 1. Banco de dados e catalogo

- [x] 1.1 Adicionar o modelo `GuessNumberQuestion` em `prisma/schema.prisma` (question unique, correctValue Float, unit, emoji, isActive, timestamps, indice em isActive)
- [x] 1.2 Gerar a migration (`prisma migrate dev`) e rodar `prisma generate`
- [x] 1.3 Criar `lib/palpite-certo-questions-data.ts` com o banco inicial de perguntas numericas (enunciado, valor correto, unidade, emoji)
- [x] 1.4 Adicionar o jogo `palpite-certo` ao array `games` de `prisma/seed.ts` (name, description, isActive)
- [x] 1.5 Adicionar no seed a carga idempotente das perguntas (`upsert` por `question`) e validar rodando o seed

## 2. Logica pura

- [x] 2.1 Criar `lib/palpite-certo-engine.ts` com os tipos `PalpiteCertoRoundResult` e `PalpiteCertoPlayerStats`
- [x] 2.2 Implementar `scorePalpiteCertoRound`: ordenar por diferenca absoluta, desempatar por `submittedAt`, atribuir 100/70/50/20 e posicionar jogadores sem palpite ao final com 0 pontos
- [x] 2.3 Implementar o empate integral (mesma diferenca e mesmo instante) com mesma posicao, mesma pontuacao e proxima posicao ajustada
- [x] 2.4 Implementar `applyPalpiteCertoRoundResult` para acumular o total de cada jogador e `sortPalpiteCertoRanking` para o ranking geral

## 3. Banco de perguntas em runtime

- [x] 3.1 Criar `lib/palpite-certo-questions.ts` com `getRandomGuessNumberQuestion(excludeIds)` usando `count` + `findFirst` com `skip` aleatorio sobre perguntas ativas
- [x] 3.2 Ao esgotar as ineditas, sortear sobre o banco inteiro sinalizando ao chamador que o ciclo reiniciou (para zerar `usedQuestionIds`)
- [x] 3.3 Retornar `null` e registrar log com contexto quando nao houver nenhuma pergunta ativa

## 4. Contrato de socket

- [x] 4.1 Adicionar em `lib/socket/events.ts` os eventos cliente->servidor: `palpite-certo:start`, `palpite-certo:submit-guess`, `palpite-certo:reveal`, `palpite-certo:next-question`, `palpite-certo:end-match`, `palpite-certo:back-to-lobby`
- [x] 4.2 Adicionar em `lib/socket/events.ts` os eventos servidor->cliente: `palpite-certo:started`, `palpite-certo:state-updated`, `palpite-certo:back-to-lobby-nav`
- [x] 4.3 Adicionar em `lib/socket/types.ts` os payloads (`PalpiteCertoStatePayload`, `PalpiteCertoQuestionPayload`, `PalpiteCertoPlayerPayload`, `PalpiteCertoRoundResultPayload`, `PalpiteCertoPhase`) e registra-los em `ClientToServerEvents` / `ServerToClientEvents`
- [x] 4.4 Garantir que o payload de estado nao possua campo para `correctValue` nem palpites de terceiros fora das fases de revelacao

## 5. Servidor da partida

- [x] 5.1 Implementar `startPalpiteCertoMatch` em `lib/socket/server.ts`: validar host, minimo de 2 jogadores conectados, sortear a primeira pergunta, criar o `Match` e emitir `palpite-certo:started` com o path
- [x] 5.2 Implementar `toPalpiteCertoStatePayload(state, viewerUserId)` e os emissores `emitPalpiteCertoState` / `emitPalpiteCertoStateToSocket` (payload por destinatario)
- [x] 5.3 Implementar `submitPalpiteCertoGuess`: validar numero inteiro finito, recusar segundo envio, carimbar `submittedAt` no servidor e reemitir o estado com o contador atualizado
- [x] 5.4 Implementar `revealPalpiteCertoRound`: validar host, exigir zero pendentes entre conectados, apurar pontuacao pelo engine, acumular totais e mudar a fase para `reveal`
- [x] 5.5 Implementar `nextPalpiteCertoQuestion`: validar host, sortear pergunta inedita, limpar palpites, incrementar a rodada e voltar a fase `question`; encerrar a partida se o banco estiver vazio
- [x] 5.6 Implementar `finishPalpiteCertoMatch` (fase `finished` com ranking final) e `backPalpiteCertoRoomToLobby` com `palpite-certo:back-to-lobby-nav`
- [x] 5.7 Registrar os handlers `socket.on` dos seis eventos, com validacao de sala/partida ativa, resposta de erro ao emissor e log de contexto
- [x] 5.8 Tratar desconexao e reconexao: jogador desconectado sai da contagem de pendentes; ao reconectar recebe fase atual, proprio palpite e ranking acumulado

## 6. Rota e navegacao

- [x] 6.1 Criar `app/room/[code]/palpite-certo/page.tsx` validando codigo, jogo selecionado e partida ativa (espelhando a pagina do Trivia)
- [x] 6.2 Criar `app/room/[code]/palpite-certo/loading.tsx`
- [x] 6.3 Registrar `palpite-certo` na lista de tipos de jogo em `app/room/[code]/page.tsx`
- [x] 6.4 Registrar o minimo de jogadores e o disparo de inicio do jogo em `components/room/room-lobby.tsx`

## 7. Interface do jogo

- [x] 7.1 Criar `components/palpite-certo/palpite-certo-game.tsx` com a conexao de socket, o estado da partida e o roteamento entre as fases
- [x] 7.2 Criar a tela da pergunta: enunciado ocupando a maior parte da tela, campo `inputMode="numeric"` filtrando nao-digitos, botao "Confirmar Palpite" desabilitado com campo vazio e bloqueio apos confirmar
- [x] 7.3 Criar a tela de espera com "Aguardando os outros jogadores..." e o indicador "X de N jogadores responderam"
- [x] 7.4 Criar a tela de revelacao com contador animado e a resposta correta em destaque central (emoji + valor + unidade), usando `framer-motion`
- [x] 7.5 Criar o ranking da rodada com nome, palpite, diferenca e pontos, ordenado do mais proximo ao mais distante, e o podio animado dos tres primeiros
- [x] 7.6 Criar o ranking geral acumulado visivel em todas as fases
- [x] 7.7 Renderizar os controles do host ("Mostrar Resultados", "Proxima Pergunta", "Encerrar Partida") apenas quando `isHost` e a fase permitirem
- [x] 7.8 Tratar erros de socket e estados de carregamento com mensagens claras ao usuario

## 8. Verificacao

- [x] 8.1 Rodar `npm run lint` e o build do projeto sem erros
- [ ] 8.2 Testar no navegador com 3 abas (host + 2 jogadores): inicio, palpites, contador, revelacao, ranking, proxima pergunta e encerramento
      BLOQUEADO: o painel de browser do ambiente nao renderiza frames, entao a
      hidratacao do React nunca completa e a UI interativa nao pode ser
      exercitada. O fluxo equivalente foi validado com 3 clientes socket.io
      reais (43 verificacoes) e o SSR da tela foi conferido no HTML.
      Falta apenas a conferencia visual manual.
- [x] 8.3 Confirmar via payload de socket que nenhum palpite ou resposta correta vaza antes da revelacao
- [x] 8.4 Testar desempate por ordem de envio e jogador que nao responde e desconecta
- [x] 8.5 Testar reconexao no meio da rodada e o ciclo de perguntas ao esgotar o banco
- [x] 8.6 Revisar codigo morto, duplicacao e imports nao utilizados antes de concluir
