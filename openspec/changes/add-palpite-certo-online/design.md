## Context

O Looby e um Next.js (App Router) com um servidor Socket.IO custom
(`server.mjs` + `lib/socket/server.ts`). Todos os jogos online seguem o mesmo
padrao ja consolidado:

- catalogo em `Game` (seed), sala em `Room`, jogadores em `RoomPlayer`;
- uma partida por sala em `Match`, com o estado completo em `Match.state` (Json);
- eventos cliente->servidor e servidor->cliente declarados em
  `lib/socket/events.ts` e tipados em `lib/socket/types.ts`;
- handlers e funcoes de partida em `lib/socket/server.ts`;
- logica pura (pontuacao, sorteio) isolada em `lib/<jogo>-engine.ts`;
- pagina server component em `app/room/[code]/<jogo>/page.tsx` que valida sala,
  jogo selecionado e partida ativa, e renderiza um client component em
  `components/<jogo>/`.

O Trivia e o parente mais proximo (perguntas, rodadas, ranking), mas difere em
tres pontos que definem este design: a resposta e um numero aberto em vez de
alternativa, o avanco e controlado pelo host em vez de timer, e a partida nao
tem numero fixo de rodadas.

## Goals / Non-Goals

**Goals:**

- Reaproveitar integralmente o padrao existente de sala/partida/socket, sem
  introduzir nova infraestrutura.
- Garantir no servidor que palpites permanecam secretos ate a revelacao.
- Garantir no servidor que apenas o host avance as fases.
- Manter a logica de pontuacao e desempate em modulo puro e testavel.
- Sorteio sem repeticao dentro da partida, com reciclagem ao esgotar o banco.

**Non-Goals:**

- Modo local (mesmo celular). Este change cobre apenas o modo online.
- Timer automatico por rodada. O ritmo de 30 a 60 segundos e consequencia do
  fluxo, nao uma regra imposta pelo servidor.
- Configuracao de sala para escolher entre 20 e 0 pontos de participacao. A
  pontuacao de participacao fica fixa em 20 pontos nesta entrega; tornar isso
  configuravel e complexidade antecipada sem demanda real.
- Historico persistente de partidas ou estatisticas alem do ranking da partida
  em andamento.
- Perguntas criadas pelo usuario.

## Decisions

### Estado da partida em `Match.state` (Json)

Segue o padrao dos demais jogos: uma linha `Match` por partida, `status`
`playing` -> `finished`, e o estado completo serializado em `state`.

```ts
type PalpiteCertoState = {
  phase: "question" | "reveal" | "finished";
  roundNumber: number;
  question: { id: string; text: string; emoji: string | null; unit: string | null };
  correctValue: number;              // NUNCA enviado ao cliente antes de "reveal"
  usedQuestionIds: string[];
  guesses: Record<string, { value: number; submittedAt: string }>;
  players: Record<string, { nickname: string; avatar: string | null; totalScore: number }>;
  lastRound: PalpiteCertoRoundResult[] | null;
};
```

Alternativa considerada: tabelas dedicadas (`PalpiteCertoRound`,
`PalpiteCertoGuess`). Descartada porque o estado e efemero, cabe em um Json e
nenhuma consulta relacional e necessaria — e divergiria do padrao dos outros
cinco jogos.

### Sigilo: dois payloads derivados do mesmo estado

O estado bruto nunca vai para o cliente. Uma funcao
`toPalpiteCertoStatePayload(state, viewerUserId)` monta o payload por
destinatario:

- fases `question` e `waiting`: omite `correctValue`, omite `guesses` de
  terceiros, envia apenas `hasGuessed` por jogador, o proprio palpite do viewer
  e os contadores `answeredCount` / `totalPlayers`;
- fases `reveal`, `ranking` e `finished`: envia `correctValue` e o ranking
  completo com palpite, diferenca e pontos.

Isso mantem o sigilo como propriedade do servidor, e nao da interface — o
cliente nunca recebe dado que nao pode mostrar. Emissao por socket individual
(`emitPalpiteCertoStateToSocket` por jogador), como ja e feito no Impostor para
papeis privados e na Mimica para a palavra do mimico.

### Autorizacao do host no servidor

Cada handler de avanco (`reveal`, `next-question`, `end-match`) valida
`RoomPlayer.isHost` antes de mutar o estado. O flag `isHost` no payload apenas
decide o que a UI renderiza; a regra vive no backend. `reveal` valida tambem que
nao ha jogador conectado pendente.

### Pontuacao e desempate em modulo puro

`lib/palpite-certo-engine.ts` exporta funcoes sem dependencia de Prisma ou
React:

```ts
scorePalpiteCertoRound(
  guesses: { userId: string; value: number; submittedAt: number }[],
  correctValue: number,
  players: { userId: string }[]
): PalpiteCertoRoundResult[]
```

Ordenacao: `Math.abs(value - correctValue)` crescente; empate desempatado por
`submittedAt` crescente. Empate integral (mesma diferenca e mesmo instante)
recebe a mesma posicao e a mesma pontuacao, e a proxima posicao pula as
ocupadas (ranking competitivo padrao: 1, 1, 3). Pontos por posicao:
`{1: 100, 2: 70, 3: 50}`, demais 20. Jogadores sem palpite ficam ao final, sem
diferenca e com 0 pontos.

### Banco de perguntas

Novo modelo Prisma:

```prisma
model GuessNumberQuestion {
  id           String   @id @default(cuid())
  question     String   @unique
  correctValue Float
  unit         String?
  emoji        String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([isActive])
}
```

`correctValue` e `Float` para suportar tanto inteiros grandes (habitantes do
Japao) quanto valores decimais (litros por pessoa). O palpite do jogador
permanece inteiro na UI; a diferenca e calculada em ponto flutuante.

`unit` e `emoji` existem para a tela de revelacao ("🍦 Resposta correta / 17
litros") sem hardcode na interface.

Sorteio em `lib/palpite-certo-questions.ts`, no mesmo formato do Trivia:
`count` com `id notIn usedQuestionIds` + `findFirst` com `skip` aleatorio. Se a
contagem der zero, `usedQuestionIds` e zerado e o sorteio repete sobre o banco
inteiro — e o "reembaralhar e reiniciar o ciclo" exigido pela spec. Zero
perguntas ativas no banco e erro real: log e recusa da acao.

Alternativa considerada: carregar todo o banco em memoria e embaralhar. Melhor
teoricamente, mas exige cache por processo e invalidacao; a query com `skip`
aleatorio ja e o padrao do projeto e roda em um banco de poucos milhares de
linhas.

### Fases e navegacao

O servidor tem tres fases: `question`, `reveal` e `finished`.

A tela de espera nao e uma fase: o jogador entra nela assim que confirma o
palpite, o que o payload representa com `hasGuessed`. A fase global permanece
`question` ate a revelacao.

O ranking da rodada tambem nao e uma fase. Contador animado, resposta correta e
ranking sao etapas de uma mesma animacao dentro de `reveal`; separa-las em duas
fases de servidor obrigaria o host a um clique extra sem nada acontecer entre
elas.

As transicoes globais sao todas disparadas pelo host:
`question -> reveal -> question` (nova pergunta) ou `-> finished`.

Navegacao segue o padrao existente: evento `palpite-certo:started` com `path`
para levar todos a `/room/[code]/palpite-certo`, e
`palpite-certo:back-to-lobby-nav` no encerramento.

### Lock de linha ao gravar palpites

O estado da partida e um unico JSON, entao registrar um palpite e um
read-modify-write. Como o jogo e feito para todos responderem ao mesmo tempo,
duas confirmacoes simultaneas leem a mesma versao do estado e a segunda
sobrescreve a primeira — um palpite desaparece e a rodada trava esperando um
jogador que ja respondeu. Isso foi observado na pratica no teste de ponta a
ponta.

`submitPalpiteCertoGuess` e `revealPalpiteCertoRound` passam a ler o estado com
`SELECT state FROM "Match" WHERE id = ... FOR UPDATE` dentro da transacao. As
transacoes concorrentes esperam em vez de lerem a mesma versao, o que serializa
as gravacoes.

Alternativa considerada: um mutex em memoria por `matchId`. Mais simples, mas
so vale enquanto houver um unico processo Node — o lock no banco continua
correto se o servidor for escalado.

### Campo numerico

`<input inputMode="numeric" pattern="[0-9]*">` com filtro `replace(/\D/g, "")`
no `onChange`. Isso abre o teclado numerico no celular e impede letras e
caracteres especiais sem depender de validacao de submit. O servidor revalida
com `Number.isFinite` e `Number.isInteger` — a UI nao e fonte de verdade.

## Risks / Trade-offs

- **Partida trava se um jogador nao responde e nao desconecta** → a spec exige
  todos os conectados; mitigado porque o host pode encerrar a partida a qualquer
  momento, e jogadores desconectados saem da contagem de pendentes.
- **`Match.state` cresce com o numero de rodadas** (`usedQuestionIds`) → sao
  apenas cuids por rodada; irrelevante para partidas de dezenas de rodadas.
- **Sorteio com `skip` aleatorio faz duas queries por rodada** → aceitavel na
  escala atual; mesmo custo ja pago pelo Trivia.
- **Perguntas com resposta que envelhece** (populacao, recordes) → `unit` e
  `isActive` permitem corrigir ou desativar sem migration.
- **Divergencia de relogio no desempate por ordem de envio** → `submittedAt` e
  sempre carimbado no servidor, no momento do recebimento, nunca pelo cliente.

## Migration Plan

1. Migration Prisma criando `GuessNumberQuestion` (aditiva, sem alterar tabelas
   existentes — nenhum risco para salas em andamento).
2. Seed adiciona o `Game` `palpite-certo` e a carga de perguntas de forma
   idempotente (`upsert` por `question`).
3. Deploy do servidor com os novos eventos. Eventos sao aditivos; clientes
   antigos ignoram o que nao conhecem.
4. Rollback: desativar o jogo (`Game.isActive = false`) remove o modo do lobby
   sem reverter migration nem codigo.

## Open Questions

- Volume alvo do banco inicial de perguntas. A entrega assume ~100 perguntas no
  seed; se for insuficiente na pratica, basta ampliar `palpite-certo-questions-data.ts`
  sem mudar codigo.
