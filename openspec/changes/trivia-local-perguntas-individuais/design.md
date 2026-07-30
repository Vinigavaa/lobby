## Context

O modo local do Trivia vive inteiramente em `components/local/local-trivia-game.tsx` — um componente cliente com estado em `useState`, sem servidor, sem socket e sem banco. Ele reaproveita as funções puras de `lib/trivia-engine.ts` e as constantes de `lib/trivia-themes.ts`, ambas compartilhadas com o modo online (`components/trivia/trivia-game.tsx` + handlers em `lib/socket/server.ts`).

Estado atual relevante:

- `currentQuestion: LocalQuestion | null` — uma pergunta por rodada, compartilhada por todos os jogadores.
- `remaining: number` + dois `useEffect` (intervalo de 1s e disparo de `recordAnswer(-1)` ao chegar em zero) formam o cronômetro.
- `scoreTriviaAnswer(isCorrect, elapsedMs)` dá 1000/800/600/400 por faixa de tempo.
- `updateFastestCorrect` alimenta `fastestCorrectMs`, exibido como "Mais rápida" no resumo final.
- A fase `reveal-answer` mostra as alternativas da pergunta única e uma lista de `nome → +pontos`.

Restrição central: **o modo online não pode mudar**. Ele depende de `scoreTriviaAnswer`, `updateFastestCorrect` e `triviaQuestionSeconds` com o comportamento atual. Toda mudança precisa ficar contida no componente local, mais constantes novas.

Os dados de perguntas (`lib/trivia-questions-data.ts`) têm ~2666 perguntas distribuídas nos 6 temas, ou seja algumas centenas por tema. O pior caso da partida é 8 jogadores × 12 rodadas = 96 perguntas, e por rodada no máximo 8 do mesmo tema — folga confortável.

## Goals / Non-Goals

**Goals:**

- Cada jogador da rodada responde uma pergunta diferente, do mesmo tema.
- Nenhuma pergunta repetida na partida.
- Nenhuma contagem de tempo no modo local.
- Pontuação fixa por acerto.
- Resumo da rodada mostrando, por jogador, pergunta / resposta dada / resposta correta / pontos.
- Modo online intocado.

**Non-Goals:**

- Mudar `scoreTriviaAnswer`, `updateFastestCorrect` ou qualquer assinatura de `lib/trivia-engine.ts`.
- Mudar o modo local dos outros jogos (`local-impostor-game.tsx`, `local-mimica-game.tsx`).
- Persistir partidas locais.
- Configurar pontuação ou número de rodadas pela interface.

## Decisions

### 1. `questionsByUserId` no lugar de `currentQuestion`

Trocar `currentQuestion: LocalQuestion | null` por `questionsByUserId: Record<string, LocalQuestion>`, preenchido no momento em que o tema da rodada é sorteado (em `startMatch` e no efeito da fase `ranking`).

A pergunta do jogador da vez passa a ser `questionsByUserId[currentPlayer.userId]`, e o resumo da rodada itera `players` lendo o mapa. Indexar por `userId` (e não por índice de turno) mantém o resumo correto sem depender da ordem.

*Alternativa considerada*: uma lista `questionsByTurn: LocalQuestion[]` paralela a `players`. Rejeitada porque o resumo e o cálculo de pontos já indexam por `userId` (via `answers`), e duas convenções de indexação no mesmo fluxo é a receita de um bug silencioso de desalinhamento.

### 2. `pickLocalQuestions(theme, usedIds, count)` substitui `pickLocalQuestion`

Uma função só, que devolve `count` perguntas distintas do tema:

1. Monta o pool do tema e separa as não usadas.
2. Embaralha as não usadas e tira as primeiras `count`.
3. Se faltar, completa embaralhando as já usadas — sem nunca repetir dentro da própria chamada.

A garantia "distintas na rodada" fica dentro da função, não espalhada no componente. `usedQuestionIds` continua acumulando, agora com todas as `count` ids da rodada.

*Alternativa considerada*: chamar `pickLocalQuestion` N vezes passando `usedIds` crescente. Funciona, mas o fallback atual (`available.length > 0 ? available : pool`) permite repetir a mesma pergunta na mesma rodada quando o tema está esgotado — exatamente o problema que a mudança quer eliminar. Melhor resolver de uma vez na função nova.

### 3. Cronômetro removido, não escondido

Deletar o estado `remaining`, os dois `useEffect` do timer, o `questionStartRef` e o círculo de contagem em `QuestionView`. Não basta esconder o contador: o efeito que dispara `recordAnswer(-1)` em zero continuaria descartando a resposta de quem demora.

Consequências diretas:

- `LocalAnswer` perde `elapsedMs` e fica só `{ optionIndex: number }`.
- `recordAnswer` perde o caminho de "não respondeu": só é chamada a partir do clique numa alternativa, então `optionIndex` é sempre válido e `answered` é sempre `true`.
- `applyTriviaRoundResult` continua recebendo `answered: true` — a estatística `answeredCount` passa a ser sempre igual ao número de rodadas no modo local. É informação redundante, mas o campo é compartilhado com o online e o resumo local não o exibe diretamente (usa `accuracyPercent`), então não vale divergir a engine por isso.

### 4. `triviaLocalCorrectPoints` em `lib/trivia-themes.ts`

Nova constante exportada, valor `1000` — o mesmo teto que o online paga por um acerto rápido, então rankings locais e online continuam na mesma escala mental.

Pontuação passa a ser `isCorrect ? triviaLocalCorrectPoints : 0`, sem chamar `scoreTriviaAnswer` no modo local. Colocar em `trivia-themes.ts` mantém a convenção do projeto de concentrar as constantes de configuração do Trivia num arquivo só.

*Alternativa considerada*: um parâmetro opcional em `scoreTriviaAnswer` (`{ ignoreTime?: boolean }`). Rejeitada — acrescenta um ramo condicional a uma função pura usada pelo servidor para ganhar nada; a expressão ternária no local é mais legível que a chamada com flag.

### 5. `updateFastestCorrect` deixa de ser chamada no local, e "Mais rápida" sai do resumo

Sem cronômetro não há tempo confiável para registrar. Se apenas parássemos de chamar a função, `fastestCorrectMs` ficaria `null` e o resumo final mostraria "Mais rápida: —" em toda partida — um campo morto na tela. Então o `StatItem` correspondente sai do `FinalView` local.

A função continua existindo e sendo usada pelo modo online; nada é removido de `lib/trivia-engine.ts`.

### 6. `RevealView` reescrita como resumo da rodada

Deixa de receber `question` e passa a receber `players`, `questionsByUserId`, `answers` e `pointsByUserId`. Renderiza um bloco por jogador: nome, pergunta recebida, a alternativa escolhida marcada como certa/errada e a correta destacada. O contador "Acertaram esta rodada: X/N" continua no topo.

`triviaRevealAnswerMs` (4500ms) fica curto para ler o resumo de até 8 jogadores. A fase passa a ter **avanço manual**: um botão "Ver classificação" leva à fase `ranking`, sem `setTimeout`. Isso também combina melhor com o modo local, onde o grupo lê a tela junto e no próprio ritmo.

*Alternativa considerada*: aumentar `triviaRevealAnswerMs` proporcionalmente ao número de jogadores. Rejeitada — a constante é compartilhada com o online, e mesmo uma versão local dela erraria o ritmo de leitura do grupo. Botão é mais simples e nunca corre demais nem devagar.

### 7. Fase `ranking` continua automática

`triviaRankingMs` (4000ms) já funciona bem para a classificação, que é uma lista curta e sem informação nova para digerir. Manter o avanço automático evita dois botões seguidos.

## Risks / Trade-offs

- **[Sem cronômetro, uma rodada pode travar indefinidamente se alguém se recusa a responder]** → Aceito. É um jogo presencial num único celular; a pressão social resolve, e o botão de voltar (`/local`) sempre está disponível nas fases fora da pergunta. Não vale introduzir um tempo limite "de segurança" que reintroduz exatamente o problema que a mudança remove.
- **[Rodada mais longa: N perguntas para ler em vez de 1]** → Aceito, é a consequência direta do pedido. O total de rodadas (12) e de jogadores (até 8) não muda; o que muda é que o resumo tem mais conteúdo. O avanço manual no resumo evita que isso vire uma tela que passa antes de ser lida.
- **[Resumo com 8 jogadores fica alto e exige rolagem]** → O container já é uma coluna vertical dentro de `max-w-md`; o resumo usa blocos compactos (pergunta em uma ou duas linhas, apenas as duas alternativas relevantes por jogador em vez das quatro) para reduzir a altura.
- **[Perguntas do mesmo tema podem ter dificuldade desigual entre jogadores]** → Assumido. Com 12 rodadas o efeito se dilui, e o modelo anterior (mesma pergunta, ordem de turno decidindo quem já sabe a resposta) era muito mais injusto.
- **[Sem `elapsedMs`, `answeredCount` do modo local fica sempre cheio]** → Sem impacto visível: o resumo local exibe `accuracyPercent`, `correctCount`, `bestStreak`, `bestRoundScore` e `bestTheme`, nenhum deles derivado de `answeredCount` de forma que mude o que o jogador vê.

## Migration Plan

Não há migração. A mudança é client-side, sem estado persistido: `prisma`, rotas de API e handlers de socket não são tocados. Rollback é reverter o commit.

Validação segue o padrão do projeto: `tsc --noEmit`, `eslint`, `next build`, mais teste manual em Web e Android Studio percorrendo uma partida local com 3 jogadores até o resumo final.

## Open Questions

Nenhuma. As três decisões abertas (pontuação fixa vs. por velocidade, tema único vs. tema por jogador, resumo consolidado vs. revelação imediata) foram resolvidas com o autor da mudança antes deste documento.
