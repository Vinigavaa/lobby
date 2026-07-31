## Why

O Looby ja tem jogos online sincronizados (Impostor, Mimica, Stop, Trivia), mas
nenhum deles funciona com resposta numerica aberta. O Palpite Certo cobre esse
formato: uma pergunta com resposta numerica, todos palpitam ao mesmo tempo e
ganha quem chega mais perto. E um formato rapido (30 a 60 segundos por rodada),
facil de explicar e que funciona bem para grupos presenciais com um celular por
pessoa, que e exatamente o publico do Looby.

## What Changes

- Novo jogo `palpite-certo` disponivel na selecao de jogos da sala.
- Novo banco de perguntas numericas (`GuessNumberQuestion`) com migration e seed.
- Sorteio sem repeticao dentro da partida: enquanto houver pergunta inedita,
  nenhuma se repete; ao esgotar, o banco e reembaralhado e o ciclo recomeca.
- Fluxo por rodada sincronizado pelo servidor, com fases:
  `question` (todos palpitam) -> `waiting` (contador "X de N responderam") ->
  `reveal` (contagem animada + resposta correta) -> `ranking` da rodada.
- Palpites ficam ocultos ate a revelacao; o servidor nunca envia o palpite de um
  jogador para outro antes da fase de revelacao.
- Somente o host avanca as etapas (`Mostrar Resultados`, `Proxima Pergunta`,
  `Encerrar Partida`); jogadores comuns nunca recebem esses controles.
- Pontuacao por colocacao na rodada (100 / 70 / 50 / 20), com empate resolvido
  por quem enviou o palpite primeiro e posicoes seguintes ajustadas quando o
  empate persiste.
- Ranking geral acumulado, visivel durante toda a partida e atualizado ao final
  de cada rodada.
- Partida sem limite de rodadas: so termina quando o host encerra ou quando o
  banco de perguntas se esgota.
- Campo de resposta apenas numerico, com teclado numerico automatico no celular,
  bloqueado apos a confirmacao.

## Capabilities

### New Capabilities
- `palpite-certo`: partida online de palpites numericos — lobby, ciclo de
  rodadas controlado pelo host, sigilo dos palpites, revelacao, pontuacao por
  colocacao e ranking geral acumulado.
- `palpite-certo-question-bank`: banco de perguntas numericas persistido, com
  sorteio aleatorio sem repeticao por partida e reciclagem apos esgotamento.

### Modified Capabilities
<!-- Nenhuma: openspec/specs/ ainda nao possui specs publicadas. O catalogo de
     jogos e alterado apenas por dados (seed) e roteamento, sem mudanca de
     requisito ja especificado. -->

## Impact

- `prisma/schema.prisma` + nova migration: modelo `GuessNumberQuestion`.
- `prisma/seed.ts`: novo jogo `palpite-certo` no catalogo `Game` e carga do
  banco de perguntas.
- `lib/palpite-certo-engine.ts` (novo): logica pura de pontuacao, ordenacao e
  desempate.
- `lib/palpite-certo-questions.ts` + `lib/palpite-certo-questions-data.ts`
  (novos): acesso ao banco e dados do seed.
- `lib/socket/events.ts`, `lib/socket/types.ts`, `lib/socket/server.ts`: novos
  eventos, payloads e handlers do fluxo da partida.
- `app/room/[code]/palpite-certo/page.tsx` + `loading.tsx` (novos).
- `components/palpite-certo/*` (novo): tela de pergunta, espera, revelacao,
  ranking e podio, com animacoes em `framer-motion`.
- `components/room/room-lobby.tsx` e `app/room/[code]/page.tsx`: registro do novo
  tipo de jogo e roteamento.
