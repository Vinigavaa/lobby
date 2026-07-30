## Context

O lobby hospeda vários mini-jogos multiplayer presenciais (`impostor`, `mimica`, `stop`, `trivia`, `guess-who`), todos seguindo o mesmo esqueleto:

- Uma linha em `Game` (`type`, `name`, `description`, `isActive`) selecionável no `room-lobby.tsx`.
- Uma `Match` por partida, com `state: Json` guardando toda a máquina de estados do jogo (fases, jogadores, respostas).
- Um conjunto de eventos `ClientToServerEvents`/`ServerToClientEvents` específicos do jogo em `lib/socket/types.ts` e `lib/socket/events.ts`, tratados em `lib/socket/server.ts` (arquivo único, ~5500 linhas, organizado em seções por jogo).
- Uma rota `app/room/[code]/<jogo>/page.tsx` + componente `components/<jogo>/<jogo>-game.tsx` que abre um socket, entra na sala (`room:join`) e reage a `<jogo>:state-updated`.

O `guess-who` atual (Quem Sou Eu clássico) sorteia cartas de `GuessWhoCard` e só tem duas fases (`playing`/`result`), sem interação de jogador além de "revelar" — não dá pra reaproveitar sua máquina de estados para o modo personalizado, que precisa de: submissão de texto por jogador, fase de espera, descoberta assíncrona por jogador, votação por partida e resultado com ranking temporal.

O impostor é a referência mais próxima: já tem fases (`reveal` → `hints` → `voting` → `result`), votação com maioria e transação Prisma por evento. O modo personalizado reaproveita esse padrão de votação, mas com votação **por jogador que tenta acertar** (não uma votação única da partida) e permite múltiplas rodadas de "descoberta" dentro da mesma `Match`.

## Goals / Non-Goals

**Goals:**
- Novo jogo `quem-sou-eu-personalizado`, isolado dos jogos existentes (nenhuma alteração em `guess-who`, `impostor`, etc.).
- Toda regra de jogo (ordem circular, obrigatoriedade do texto, maioria da votação, transição de fases, fim de partida) validada e decidida no servidor — o app mobile/web só renderiza o estado recebido.
- Sincronização em tempo real via WebSocket (Socket.IO), como os demais jogos.
- Suportar "Jogar novamente" com os mesmos participantes, gerando nova ordem circular e nova `Match`.

**Non-Goals:**
- Não implementa contagem de perguntas feitas (são verbais, fora do app) — decisão confirmada com o usuário.
- Não implementa timeout automático para jogador desconectado durante a escrita do personagem — o host cancela manualmente e a sala volta ao lobby.
- Não implementa moderação/filtro de palavrão no campo de personagem (mesmo tratamento dado hoje aos textos livres de `impostor`/`stop`).
- Não reaproveita nem altera o `guess-who` clássico.

## Decisions

### 1. Jogo novo e independente, não um "modo" do guess-who
Criar `type: "quem-sou-eu-personalizado"` como jogo próprio em `Game`, com sua própria seção em `server.ts`, tipos em `types.ts`/`events.ts` e componente em `components/quem-sou-eu-personalizado/`.
- **Alternativa considerada**: adicionar um seletor de modo dentro do guess-who existente. Rejeitada — exigiria unificar duas máquinas de estado muito diferentes (cartas do banco vs. texto livre por jogador; sem votação vs. com votação por acerto) na mesma `GuessWhoMatchState`, indo contra a simplicidade do padrão atual do repo (um tipo de jogo = um fluxo).

### 2. Estado da partida como state machine única em `Match.state`
```ts
type CustomGuessWhoPhase = "writing" | "playing" | "finished";

type CustomGuessWhoPlayer = {
  userId: string;
  nickname: string;
  avatar: string | null;
  writesForUserId: string;       // ordem circular: quem este jogador escreve
  characterSubmittedAt: string | null;
  hasSolved: boolean;
  solvedAt: string | null;
  solvedOrder: number | null;    // 1, 2, 3... preenchido ao confirmar acerto
  pendingGuess: {
    guessText: string;
    submittedAt: string;
    votes: { voterUserId: string; correct: boolean }[];
  } | null;
};

type CustomGuessWhoMatchState = {
  phase: CustomGuessWhoPhase;
  startedAt: string;
  players: CustomGuessWhoPlayer[];
  // characters ficam em um map separado userId -> texto, nunca enviado
  // ao próprio userId no payload (ver Decisão 4)
};
```
Os personagens de cada jogador (texto escrito por quem "escreve para" ele) ficam guardados no próprio `state`, mas o payload enviado a cada socket é filtrado por jogador (ver Decisão 4) — igual ao `guess-who` já faz para não vazar a própria carta.
- **Alternativa considerada**: tabela própria (`CustomGuessWhoAnswer`) no banco. Rejeitada por desnecessária — volume de dados é pequeno (1 partida = poucos KB) e o padrão `Match.state: Json` já resolve isso para todos os outros jogos, sem exigir migration.

### 3. Distribuição circular calculada no servidor ao iniciar
Ao receber `quem-sou-eu-personalizado:start`, o servidor embaralha a lista de jogadores conectados (mesmo `shuffle` usado em `guess-who-cards.ts`) e define `writesForUserId` como o próximo da lista (circular). Nenhum jogador escolhe para quem escreve, conforme especificado.

### 4. Payload por jogador filtra personagens ocultos, como no guess-who
`getCustomGuessWhoStatePayload(state, viewerUserId)` monta, para cada jogador da lista:
- Se `player.userId === viewerUserId`: `character: null` (ou `"❓ Quem sou eu?"` do lado do cliente).
- Caso contrário: `character: <texto escrito para ele>`, exceto se ainda não foi enviado (fase `writing`) — nesse caso `character: null` com uma flag `submitted: boolean` para a tela de espera.

Isso é emitido individualmente por socket (como já faz `emitGuessWhoStateToSocket`), não em broadcast único, porque o payload difere por jogador.

### 5. Votação por tentativa de acerto (não votação única da partida)
Cada `pendingGuess` carrega sua própria lista de votos. Quando `votes.length` atinge maioria simples dos jogadores aptos a votar (todos exceto o próprio autor da tentativa — incluindo espectadores que já acertaram, conforme decidido), o servidor resolve:
- Maioria "sim" → marca `hasSolved: true`, `solvedOrder` = próximo número disponível, `solvedAt = now()`, limpa `pendingGuess`.
- Maioria "não" (ou empate) → limpa `pendingGuess`, jogador continua tentando (pode chutar de novo depois).
Maioria simples usa `Math.floor(elegiveis/2) + 1` votos "sim" para confirmar, resolvendo empate como "não confirmado" (mesma lógica conservadora do `impostor`).

### 6. Fim de partida e transição de fase
Quando `players.filter(p => !p.hasSolved).length === 1`, o servidor marca `phase: "finished"` automaticamente (o último jogador sem descobrir não precisa acertar — a partida encerra e revela o personagem dele também no resumo final). O resumo final é derivado do próprio `state` (ordem por `solvedOrder`, tempo = `solvedAt - startedAt`), sem tabela extra.

### 7. Cancelamento pelo host
Novo evento `quem-sou-eu-personalizado:cancel` (host-only, qualquer fase exceto `finished`) marca a `Match` como `status: "cancelled"`, `endedAt: now()` e volta `Room.status` para `"waiting"`, emitindo `quem-sou-eu-personalizado:back-to-lobby-nav` para todos — mesmo padrão de `*:back-to-lobby` dos outros jogos.

### 8. "Jogar novamente" gera nova Match com nova ordem
Reaproveita os mesmos `RoomPlayer` conectados no momento, mas roda o mesmo sorteio circular da Decisão 3 (não repete a ordem anterior) — evita viés e é consistente com "Jogar novamente" do `impostor`/`trivia`.

## Risks / Trade-offs

- [Jogador digita personagem ofensivo/vazio] → Validação no servidor: campo obrigatório, `trim()` não vazio, limite de caracteres (ex.: 40), rejeitado com `room:error` se inválido. Sem moderação de conteúdo (mesmo nível dos demais jogos com texto livre).
- [Empate na votação de confirmação em salas com número par de votantes] → Resolvido como "não confirmado" (mesma regra conservadora do impostor), jogador tenta de novo.
- [Jogador atualiza a página/perde conexão durante `writing`] → Como não há timeout automático, a partida trava aguardando o envio dele; host precisa cancelar manualmente. Aceito como trade-off de simplicidade (decisão confirmada com usuário); pode virar melhoria futura.
- [Múltiplos jogadores tentam "Já sei quem eu sou!" ao mesmo tempo] → Cada tentativa é independente (`pendingGuess` por jogador), sem lock global — mas escrita no `Match.state` é sempre dentro de `prisma.$transaction`, evitando race condition de leitura-modificação-escrita concorrente.

## Migration Plan

1. Seed: adicionar registro `Game` (`type: "quem-sou-eu-personalizado"`) via `prisma/seed.ts` (sem migration de schema — reaproveita `Match.state: Json` e tabelas existentes).
2. Deploy padrão pelo branch `main` (Render), sem passos manuais adicionais.
3. Rollback: `isActive: false` no registro `Game` remove o jogo da lista de seleção sem precisar reverter código.

## Open Questions

Nenhuma pendente — decisões de escopo (jogo separado, sem contagem de perguntas, espectadores votam, cancelamento manual pelo host) já confirmadas com o usuário.
