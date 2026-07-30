## 1. Dados e seed

- [x] 1.1 Adicionar registro do jogo `quem-sou-eu-personalizado` em `prisma/seed.ts` (type, name, description, isActive)
- [ ] 1.2 Rodar seed local e confirmar que o jogo aparece na lista da sala

## 2. Tipos e eventos de socket

- [x] 2.1 Adicionar em `lib/socket/types.ts`: `CustomGuessWhoPlayerPayload`, `CustomGuessWhoStatePayload`, `CustomGuessWhoStartedPayload`, `CustomGuessWhoSubmitCharacterPayload`, `CustomGuessWhoGuessPayload`, `CustomGuessWhoVotePayload`, `CustomGuessWhoHostActionPayload`, `CustomGuessWhoBackToLobbyPayload`
- [x] 2.2 Adicionar em `ClientToServerEvents`: `quem-sou-eu-personalizado:start`, `:submit-character`, `:guess`, `:vote`, `:cancel`, `:play-again`
- [x] 2.3 Adicionar em `ServerToClientEvents`: `quem-sou-eu-personalizado:started`, `:state-updated`, `:back-to-lobby-nav`
- [x] 2.4 Adicionar as novas chaves em `lib/socket/events.ts` (`SOCKET_EVENTS`)

## 3. Lógica de servidor — início e distribuição

- [x] 3.1 Implementar `type CustomGuessWhoMatchState` e `isCustomGuessWhoMatchState` (type guard) em `lib/socket/server.ts`, conforme design.md
- [x] 3.2 Implementar `startCustomGuessWhoMatch(roomCode, hostUserId)`: valida host, status `waiting`, mínimo 2 jogadores conectados; embaralha jogadores e define `writesForUserId` circular; cria `Match` com `phase: "writing"`
- [x] 3.3 Implementar validação de início (host-only, mínimo de jogadores, sala em `waiting`) reaproveitando o padrão de `validateGuessWhoStartRoom`
- [x] 3.4 Registrar handler do evento `quem-sou-eu-personalizado:start` e emitir `:started` com o path da nova rota

## 4. Lógica de servidor — escrita do personagem

- [x] 4.1 Implementar `submitCustomGuessWhoCharacter(roomCode, userId, characterText)`: valida fase `writing`, texto não vazio (trim), limite de caracteres, impede reenvio se já confirmado
- [x] 4.2 Ao receber a última submissão pendente, transicionar `phase` para `playing` dentro da mesma transação
- [x] 4.3 Registrar handler do evento `:submit-character` e emitir `:state-updated` para todos os jogadores da sala

## 5. Lógica de servidor — payload filtrado por jogador

- [x] 5.1 Implementar `getCustomGuessWhoStatePayload(state, viewerUserId)` ocultando o personagem do próprio `viewerUserId` e indicando `submitted` durante a fase `writing`
- [x] 5.2 Implementar `emitCustomGuessWhoStates(roomCode, matchId?)` emitindo o payload individualmente por socket (mesmo padrão de `emitGuessWhoStateToSocket`)

## 6. Lógica de servidor — tentativa de acerto e votação

- [x] 6.1 Implementar `submitCustomGuessWhoGuess(roomCode, userId, guessText)`: valida que o jogador não está `hasSolved`, que não há `pendingGuess` já aberto para ele, cria `pendingGuess` com lista de votos vazia
- [x] 6.2 Implementar `submitCustomGuessWhoVote(roomCode, voterUserId, targetUserId, correct)`: valida que existe `pendingGuess` aberto para `targetUserId`, que `voterUserId !== targetUserId`, e que o votante ainda não votou nessa tentativa
- [x] 6.3 Ao atingir maioria simples dos votos elegíveis (todos exceto o autor da tentativa), resolver a tentativa: confirmar (`hasSolved`, `solvedOrder`, `solvedAt`) ou rejeitar (limpar `pendingGuess`), dentro da transação
- [x] 6.4 Registrar handlers dos eventos `:guess` e `:vote`, emitindo `:state-updated` após cada mudança

## 7. Lógica de servidor — encerramento e replay

- [x] 7.1 Após cada confirmação de acerto, checar se resta exatamente 1 jogador sem `hasSolved`; se sim, marcar `phase: "finished"` e revelar o personagem desse jogador no resumo
- [x] 7.2 Implementar `cancelCustomGuessWhoMatch(roomCode, hostUserId)`: host-only, qualquer fase exceto `finished`, marca `Match.status: "cancelled"`, `Room.status: "waiting"`, emite `:back-to-lobby-nav`
- [x] 7.3 Implementar `playAgainCustomGuessWho(roomCode, hostUserId)`: reaproveita jogadores conectados, gera nova distribuição circular e cria nova `Match` em `phase: "writing"`
- [x] 7.4 Registrar handlers dos eventos `:cancel` e `:play-again`

## 8. UI — escrita, espera e jogo

- [x] 8.1 Criar rota `app/room/[code]/quem-sou-eu-personalizado/page.tsx` (server component, resolve sessão/params, delega para o client component)
- [x] 8.2 Criar `components/quem-sou-eu-personalizado/custom-guess-who-game.tsx`: conecta socket, entra na sala, escuta `:state-updated`
- [x] 8.3 Implementar tela de escrita: campo de texto obrigatório com contador de caracteres, botão "Pronto!" desabilitado até preencher, bloqueado após confirmar
- [x] 8.4 Implementar tela de espera ("Aguardando os outros jogadores...") exibida após confirmar, antes de todos enviarem
- [x] 8.5 Implementar tela de jogo: lista de personagens dos outros jogadores, próprio card como "❓ Quem sou eu?", botão "Já sei quem eu sou!" abrindo campo de resposta
- [x] 8.6 Implementar UI de votação: modal/seção "Fulano realmente acertou quem ele é?" com opções Sim/Não para os jogadores elegíveis
- [x] 8.7 Implementar indicação visual de jogador "espectador" (já acertou, só assiste e vota)
- [x] 8.8 Implementar botão de cancelar partida (host-only) com confirmação

## 9. UI — resultado final

- [x] 9.1 Implementar tela de resumo final: ordem de descoberta, tempo de cada jogador, personagem de cada jogador
- [x] 9.2 Implementar botão "Jogar novamente" (host-only) e navegação de volta ao lobby para os demais quando a nova partida iniciar

## 10. Integração com o lobby

- [x] 10.1 Adicionar `case` para `quem-sou-eu-personalizado` em `startGame()` de `components/room/room-lobby.tsx`
- [x] 10.2 Adicionar listener de `quem-sou-eu-personalizado:started` em `room-lobby.tsx` para redirecionar todos os jogadores

## 11. Validação

- [ ] 11.1 Testar fluxo completo com 3+ dispositivos simulados (escrita → espera → jogo → tentativa → votação → espectador → fim de partida → jogar novamente)
- [ ] 11.2 Testar cancelamento pelo host em cada fase (escrita e jogo)
- [ ] 11.3 Testar rejeição de envio vazio, acima do limite de caracteres e tentativa de reenvio
- [x] 11.4 Testar votação com empate e com maioria contra
- [ ] 11.5 Validar em Android Studio e Web, conforme exigido pelo padrão do projeto
