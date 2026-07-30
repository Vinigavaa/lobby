## 1. Configuração

- [x] 1.1 Adicionar `triviaLocalCorrectPoints = 1000` em `lib/trivia-themes.ts`, com comentário indicando que vale só para o modo local

## 2. Sorteio de perguntas

- [x] 2.1 Substituir `pickLocalQuestion` por `pickLocalQuestions(theme, usedIds, count)` em `components/local/local-trivia-game.tsx`, devolvendo `count` perguntas distintas do tema
- [x] 2.2 Garantir no fallback (tema sem perguntas não usadas suficientes) que as perguntas da chamada continuam distintas entre si
- [x] 2.3 Trocar o estado `currentQuestion` por `questionsByUserId: Record<string, LocalQuestion>`
- [x] 2.4 Preencher `questionsByUserId` em `startMatch` usando `playerCount` como `count`
- [x] 2.5 Preencher `questionsByUserId` na transição da fase `ranking` para a próxima rodada, usando `players.length` como `count`
- [x] 2.6 Acumular todas as ids sorteadas da rodada em `usedQuestionIds`

## 3. Remoção do cronômetro

- [x] 3.1 Remover o estado `remaining` e o `questionStartRef`
- [x] 3.2 Remover o `useEffect` do intervalo de 1 segundo
- [x] 3.3 Remover o `useEffect` que chama `recordAnswer(-1)` quando o tempo chega a zero
- [x] 3.4 Simplificar `LocalAnswer` para `{ optionIndex: number }`
- [x] 3.5 Ajustar `recordAnswer` para gravar só o `optionIndex`, sem cálculo de tempo
- [x] 3.6 Remover o círculo de contagem e a prop `remaining` de `QuestionView`
- [x] 3.7 Passar a pergunta do jogador da vez para `QuestionView` a partir de `questionsByUserId`

## 4. Pontuação fixa

- [x] 4.1 Em `finishRound`, calcular pontos com `isCorrect ? triviaLocalCorrectPoints : 0` no lugar de `scoreTriviaAnswer`
- [x] 4.2 Avaliar o acerto contra a pergunta do próprio jogador (`questionsByUserId[userId]`), não contra uma pergunta única da rodada
- [x] 4.3 Remover a chamada a `updateFastestCorrect` e o import correspondente
- [x] 4.4 Remover o `StatItem` "Mais rapida" do `FinalView`
- [x] 4.5 Remover o import de `scoreTriviaAnswer` se não houver mais uso

## 5. Resumo da rodada

- [x] 5.1 Reescrever `RevealView` para receber `players`, `questionsByUserId`, `answers`, `pointsByUserId` e `correctCount`
- [x] 5.2 Renderizar um bloco por jogador com nome, pergunta recebida, alternativa escolhida e alternativa correta
- [x] 5.3 Destacar visualmente a alternativa correta e marcar a escolhida como certa ou errada
- [x] 5.4 Manter o contador "Acertaram esta rodada" e os pontos ganhos por jogador
- [x] 5.5 Remover o `useEffect` que avança automaticamente de `reveal-answer` para `ranking`
- [x] 5.6 Adicionar botão "Ver classificação" que muda a fase para `ranking`
- [x] 5.7 Remover o import de `triviaRevealAnswerMs` se não houver mais uso
- [x] 5.8 Manter blocos compactos para o resumo caber sem rolagem excessiva com 8 jogadores

## 6. Textos da interface

- [x] 6.1 Atualizar a descrição da tela de setup para deixar claro que cada jogador recebe uma pergunta diferente
- [x] 6.2 Revisar o texto da fase `turn-handoff` para reforçar que ninguém mais pode ver a tela

## 7. Validação

- [x] 7.1 Rodar `tsc --noEmit`, `eslint` e `next build`
- [ ] 7.2 Jogar uma partida local com 3 jogadores e confirmar que cada um recebe pergunta diferente na mesma rodada
- [x] 7.3 Confirmar que nenhuma pergunta se repete ao longo das 12 rodadas
- [ ] 7.4 Confirmar que não há contador na tela da pergunta e que o turno não avança sozinho após uma espera longa
- [ ] 7.5 Confirmar que o resumo da rodada mostra a pergunta e a resposta correta de cada jogador, e só aparece após o último responder
- [ ] 7.6 Confirmar que todo acerto vale a mesma pontuação e que o resumo final não mostra "Mais rapida"
- [ ] 7.7 Confirmar que o modo online do Trivia continua com cronômetro, pergunta compartilhada e pontuação por velocidade
- [ ] 7.8 Validar em Web e Android Studio, conforme o padrão do projeto
