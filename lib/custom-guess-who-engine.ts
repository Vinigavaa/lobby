export const customGuessWhoGameType = "quem-sou-eu-personalizado";
export const customGuessWhoMinimumPlayers = 2;
export const customGuessWhoCharacterMaxLength = 40;

export type CustomGuessWhoPhase = "writing" | "playing" | "finished";

export type CustomGuessWhoVote = {
  voterUserId: string;
  correct: boolean;
};

export type CustomGuessWhoPendingGuess = {
  guess: string;
  submittedAt: string;
  votes: CustomGuessWhoVote[];
};

export type CustomGuessWhoStatePlayer = {
  userId: string;
  nickname: string;
  avatar: string | null;
  /** Jogador para quem este jogador escreve o personagem. */
  writesForUserId: string;
  /** Personagem atribuido a este jogador (escrito por outro). */
  character: string | null;
  /** Momento em que este jogador enviou o personagem que escreveu. */
  writtenAt: string | null;
  hasSolved: boolean;
  solvedAt: string | null;
  solvedOrder: number | null;
  pendingGuess: CustomGuessWhoPendingGuess | null;
};

export type CustomGuessWhoMatchState = {
  phase: CustomGuessWhoPhase;
  startedAt: string;
  /**
   * Inicio da fase de jogo. O tempo de cada jogador e medido a partir daqui,
   * para nao incluir o tempo que o grupo levou escrevendo os personagens.
   */
  playingStartedAt: string | null;
  players: CustomGuessWhoStatePlayer[];
};

export type CustomGuessWhoGuessOutcome = "confirmed" | "rejected" | "pending";

/**
 * Monta a sequencia circular: cada jogador escreve para o proximo da lista
 * embaralhada, e o ultimo escreve para o primeiro.
 */
export function buildCircularAssignments(
  players: Array<{ userId: string; nickname: string; avatar: string | null }>
): CustomGuessWhoStatePlayer[] {
  const ordered = shuffle(players);

  return ordered.map((player, index) => ({
    userId: player.userId,
    nickname: player.nickname,
    avatar: player.avatar,
    writesForUserId: ordered[(index + 1) % ordered.length].userId,
    character: null,
    writtenAt: null,
    hasSolved: false,
    solvedAt: null,
    solvedOrder: null,
    pendingGuess: null,
  }));
}

export function normalizeCustomGuessWhoText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ");
}

/**
 * Quantos jogadores podem votar em uma tentativa: todos menos o autor,
 * incluindo quem ja descobriu o proprio personagem.
 */
export function countEligibleVoters(
  state: CustomGuessWhoMatchState,
  guesserUserId: string
) {
  return state.players.filter((player) => player.userId !== guesserUserId).length;
}

/**
 * Resolve a tentativa por maioria simples. Empate conta como nao confirmado.
 */
export function resolveGuessOutcome(
  votes: CustomGuessWhoVote[],
  totalVoters: number
): CustomGuessWhoGuessOutcome {
  if (totalVoters <= 0) {
    return "rejected";
  }

  const required = Math.floor(totalVoters / 2) + 1;
  const yesCount = votes.filter((vote) => vote.correct).length;
  const noCount = votes.length - yesCount;

  if (yesCount >= required) {
    return "confirmed";
  }

  if (noCount >= required) {
    return "rejected";
  }

  if (votes.length >= totalVoters) {
    return "rejected";
  }

  return "pending";
}

export function countUnsolvedPlayers(state: CustomGuessWhoMatchState) {
  return state.players.filter((player) => !player.hasSolved).length;
}

export function nextSolvedOrder(state: CustomGuessWhoMatchState) {
  return state.players.filter((player) => player.hasSolved).length + 1;
}

/** Tentativas em aberto perdem sentido quando a partida encerra. */
export function clearPendingGuesses(players: CustomGuessWhoStatePlayer[]) {
  return players.map((player) =>
    player.pendingGuess ? { ...player, pendingGuess: null } : player
  );
}

export function isCustomGuessWhoMatchState(
  state: unknown
): state is CustomGuessWhoMatchState {
  if (!state || typeof state !== "object") {
    return false;
  }

  const candidate = state as Partial<CustomGuessWhoMatchState>;

  return (
    (candidate.phase === "writing" ||
      candidate.phase === "playing" ||
      candidate.phase === "finished") &&
    typeof candidate.startedAt === "string" &&
    (typeof candidate.playingStartedAt === "string" ||
      candidate.playingStartedAt === null) &&
    Array.isArray(candidate.players) &&
    candidate.players.every(isCustomGuessWhoStatePlayer)
  );
}

function isCustomGuessWhoStatePlayer(
  player: unknown
): player is CustomGuessWhoStatePlayer {
  if (!player || typeof player !== "object") {
    return false;
  }

  const candidate = player as Partial<CustomGuessWhoStatePlayer>;

  return (
    typeof candidate.userId === "string" &&
    typeof candidate.nickname === "string" &&
    (typeof candidate.avatar === "string" || candidate.avatar === null) &&
    typeof candidate.writesForUserId === "string" &&
    (typeof candidate.character === "string" || candidate.character === null) &&
    (typeof candidate.writtenAt === "string" || candidate.writtenAt === null) &&
    typeof candidate.hasSolved === "boolean" &&
    (typeof candidate.solvedAt === "string" || candidate.solvedAt === null) &&
    (typeof candidate.solvedOrder === "number" ||
      candidate.solvedOrder === null) &&
    isCustomGuessWhoPendingGuess(candidate.pendingGuess)
  );
}

function isCustomGuessWhoPendingGuess(
  pendingGuess: unknown
): pendingGuess is CustomGuessWhoPendingGuess | null {
  if (pendingGuess === null) {
    return true;
  }

  if (!pendingGuess || typeof pendingGuess !== "object") {
    return false;
  }

  const candidate = pendingGuess as Partial<CustomGuessWhoPendingGuess>;

  return (
    typeof candidate.guess === "string" &&
    typeof candidate.submittedAt === "string" &&
    Array.isArray(candidate.votes)
  );
}

function shuffle<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentItem = shuffled[index];

    shuffled[index] = shuffled[randomIndex];
    shuffled[randomIndex] = currentItem;
  }

  return shuffled;
}
