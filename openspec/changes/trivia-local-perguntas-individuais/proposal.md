## Why

No Trivia local (um celular, jogadores passando o aparelho) todos os jogadores da rodada respondem **a mesma pergunta**. Quem joga depois ouve a discussão do grupo, vê a reação de quem respondeu antes e chega na tela já sabendo a resposta — a ordem dos turnos decide a pontuação, não o conhecimento.

Além disso o cronômetro de 40s não faz sentido com um único celular: existe o tempo de passar o aparelho de mão em mão, alguém pode demorar para pegar, e o contador continua correndo. O jogador é punido por um atraso que não é dele.

## What Changes

- Cada jogador da rodada recebe uma **pergunta diferente**, sorteada do mesmo tema da roleta daquela rodada. Nenhuma pergunta se repete dentro da mesma partida.
- **BREAKING (comportamento do modo local)**: o cronômetro por pergunta é removido. Não há contagem visível nem descarte automático por tempo — o jogador responde quando quiser e a única forma de avançar é escolher uma opção.
- A pontuação do modo local passa a ser **fixa por acerto** em vez de escalonada por velocidade, coerente com a ausência de tempo.
- A estatística final "Mais rápida" sai do resumo do modo local, já que ninguém é mais cronometrado.
- A tela de revelação vira um **resumo da rodada**: para cada jogador, a pergunta que ele recebeu, o que respondeu, qual era a correta e quantos pontos ganhou. Só aparece depois que o último jogador respondeu.
- O modo online do Trivia **não muda**: continua com pergunta compartilhada, cronômetro e pontuação por velocidade.

## Capabilities

### New Capabilities
- `trivia-local`: o Trivia jogado em um único celular — configuração dos jogadores, sorteio de tema por rodada, sorteio de uma pergunta distinta por jogador, turnos com passagem do aparelho sem cronômetro, pontuação fixa por acerto, resumo da rodada e resumo final.

### Modified Capabilities

Nenhuma. O repositório ainda não tem specs publicados em `openspec/specs/`, e o modo online do Trivia continua com o comportamento atual.

## Impact

- `components/local/local-trivia-game.tsx`: sorteio passa a ser por jogador, remoção do cronômetro e dos seus efeitos, nova tela de resumo da rodada, pontuação fixa, remoção da estatística "Mais rápida".
- `lib/trivia-themes.ts`: nova constante de pontos fixos do modo local. `triviaQuestionSeconds` continua existindo para o modo online.
- `lib/trivia-engine.ts`: reutilizado sem alteração de assinatura. `scoreTriviaAnswer` deixa de ser chamado pelo modo local; `updateFastestCorrect` também.
- Sem impacto em banco de dados, API, socket ou no modo online. É uma mudança contida no cliente do modo local.
