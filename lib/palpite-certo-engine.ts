/**
 * Logica pura do Palpite Certo: ordenacao dos palpites por proximidade,
 * desempate, pontuacao por colocacao e ranking geral acumulado. Nao depende
 * de Prisma nem de React para que a regra possa ser lida e testada isolada do
 * transporte (socket) e da interface.
 */

export const palpiteCertoGameType = "palpite-certo";

/** Pontos por colocacao na rodada. Do 4o lugar em diante vale a participacao. */
export const palpiteCertoPointsByPosition: Record<number, number> = {
  1: 100,
  2: 70,
  3: 50,
};
export const palpiteCertoParticipationPoints = 20;
export const palpiteCertoMinimumPlayers = 2;

export type PalpiteCertoPlayerStats = {
  userId: string;
  nickname: string;
  avatar: string | null;
  totalScore: number;
};

export type PalpiteCertoGuessInput = {
  userId: string;
  value: number;
  /** Carimbado sempre no servidor, nunca pelo cliente. */
  submittedAt: number;
};

export type PalpiteCertoRoundResult = {
  position: number;
  userId: string;
  /** `null` quando o jogador nao confirmou palpite na rodada. */
  guess: number | null;
  difference: number | null;
  points: number;
};

export function createPalpiteCertoPlayerStats(player: {
  userId: string;
  nickname: string;
  avatar: string | null;
}): PalpiteCertoPlayerStats {
  return {
    userId: player.userId,
    nickname: player.nickname,
    avatar: player.avatar,
    totalScore: 0,
  };
}

/**
 * Apura a rodada: quem chegou mais perto vence.
 *
 * Ordena pela menor diferenca absoluta; empate na diferenca e resolvido por
 * quem enviou primeiro. Se ainda assim houver empate (mesma diferenca e mesmo
 * instante), os empatados dividem a mesma posicao e a mesma pontuacao, e a
 * posicao seguinte pula as ja ocupadas (1, 1, 3). Jogadores sem palpite ficam
 * ao final, sem diferenca e com 0 pontos.
 */
export function scorePalpiteCertoRound(
  guesses: PalpiteCertoGuessInput[],
  correctValue: number,
  players: { userId: string }[]
): PalpiteCertoRoundResult[] {
  const guessByUserId = new Map(guesses.map((guess) => [guess.userId, guess]));
  const ranked = players
    .map((player) => guessByUserId.get(player.userId))
    .filter((guess): guess is PalpiteCertoGuessInput => Boolean(guess))
    .map((guess) => ({
      ...guess,
      difference: Math.abs(guess.value - correctValue),
    }))
    .sort(
      (first, second) =>
        first.difference - second.difference ||
        first.submittedAt - second.submittedAt
    );

  const results: PalpiteCertoRoundResult[] = [];
  let position = 0;

  ranked.forEach((entry, index) => {
    const previous = ranked[index - 1];
    const tiedWithPrevious =
      previous !== undefined &&
      previous.difference === entry.difference &&
      previous.submittedAt === entry.submittedAt;

    // Empate integral repete a posicao; caso contrario a posicao acompanha o
    // indice, o que naturalmente pula as posicoes ocupadas por um empate.
    position = tiedWithPrevious ? position : index + 1;

    results.push({
      position,
      userId: entry.userId,
      guess: entry.value,
      difference: entry.difference,
      points:
        palpiteCertoPointsByPosition[position] ??
        palpiteCertoParticipationPoints,
    });
  });

  for (const player of players) {
    if (guessByUserId.has(player.userId)) {
      continue;
    }

    results.push({
      position: results.length + 1,
      userId: player.userId,
      guess: null,
      difference: null,
      points: 0,
    });
  }

  return results;
}

/** Soma os pontos da rodada ao total acumulado de cada jogador. */
export function applyPalpiteCertoRoundResult(
  players: PalpiteCertoPlayerStats[],
  results: PalpiteCertoRoundResult[]
): PalpiteCertoPlayerStats[] {
  const pointsByUserId = new Map(
    results.map((result) => [result.userId, result.points])
  );

  return players.map((player) => ({
    ...player,
    totalScore: player.totalScore + (pointsByUserId.get(player.userId) ?? 0),
  }));
}

/** Ranking geral acumulado, do maior total para o menor. */
export function sortPalpiteCertoRanking(
  players: PalpiteCertoPlayerStats[]
): { position: number; player: PalpiteCertoPlayerStats }[] {
  const sorted = [...players].sort(
    (first, second) =>
      second.totalScore - first.totalScore ||
      first.nickname.localeCompare(second.nickname)
  );

  let position = 0;

  return sorted.map((player, index) => {
    const previous = sorted[index - 1];

    // Mesmo total divide a posicao; totais distintos assumem o indice, o que
    // pula as posicoes ocupadas por um empate.
    position =
      previous && previous.totalScore === player.totalScore
        ? position
        : index + 1;

    return { position, player };
  });
}
