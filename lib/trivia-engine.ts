/**
 * Logica pura do Trivia: sorteio de tema sem repeticao, pontuacao por
 * velocidade de resposta e agregacao de estatisticas/ranking final. Nao
 * depende de Prisma nem de React, para ser usada tanto pelo servidor
 * (multiplayer) quanto pelo componente local (mesmo celular), garantindo que
 * as regras nao possam divergir entre os dois modos.
 */
import { triviaQuestionSeconds, triviaThemeIds, type TriviaThemeId } from "./trivia-themes";

export type TriviaPlayerStats = {
  userId: string;
  nickname: string;
  avatar: string | null;
  totalScore: number;
  correctCount: number;
  answeredCount: number;
  currentStreak: number;
  bestStreak: number;
  fastestCorrectMs: number | null;
  bestRoundScore: number;
  themeScores: Partial<Record<TriviaThemeId, number>>;
};

export function createTriviaPlayerStats(player: {
  userId: string;
  nickname: string;
  avatar: string | null;
}): TriviaPlayerStats {
  return {
    userId: player.userId,
    nickname: player.nickname,
    avatar: player.avatar,
    totalScore: 0,
    correctCount: 0,
    answeredCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    fastestCorrectMs: null,
    bestRoundScore: 0,
    themeScores: {},
  };
}

/** Sorteia o proximo tema de uma "sacola" sem repeticao; reembaralha quando vazia. */
export function drawNextTheme(bag: TriviaThemeId[]): {
  theme: TriviaThemeId;
  remainingBag: TriviaThemeId[];
} {
  const pool = bag.length > 0 ? bag : shuffleThemes();
  const index = Math.floor(Math.random() * pool.length);
  const theme = pool[index];
  const remainingBag = pool.filter((_, position) => position !== index);

  return { theme, remainingBag };
}

function shuffleThemes(): TriviaThemeId[] {
  const shuffled = [...triviaThemeIds];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));

    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

/**
 * Pontos de uma resposta pelo tempo decorrido (ms) desde a pergunta aparecer.
 * Incorreta ou fora da janela de `triviaQuestionSeconds` sempre vale 0.
 */
export function scoreTriviaAnswer(isCorrect: boolean, elapsedMs: number): number {
  if (!isCorrect) {
    return 0;
  }

  const elapsedSeconds = elapsedMs / 1000;

  if (elapsedSeconds <= 5) {
    return 1000;
  }

  if (elapsedSeconds <= 10) {
    return 800;
  }

  if (elapsedSeconds <= 15) {
    return 600;
  }

  if (elapsedSeconds <= triviaQuestionSeconds) {
    return 400;
  }

  return 0;
}

/** Aplica o resultado de uma rodada as estatisticas acumuladas do jogador (mutavel, retorna novo objeto). */
export function applyTriviaRoundResult(
  stats: TriviaPlayerStats,
  input: { theme: TriviaThemeId; isCorrect: boolean; answered: boolean; points: number }
): TriviaPlayerStats {
  const nextStreak = input.isCorrect ? stats.currentStreak + 1 : 0;
  const nextThemeScores = { ...stats.themeScores };
  nextThemeScores[input.theme] = (nextThemeScores[input.theme] ?? 0) + input.points;

  return {
    ...stats,
    totalScore: stats.totalScore + input.points,
    correctCount: stats.correctCount + (input.isCorrect ? 1 : 0),
    answeredCount: stats.answeredCount + (input.answered ? 1 : 0),
    currentStreak: nextStreak,
    bestStreak: Math.max(stats.bestStreak, nextStreak),
    fastestCorrectMs: stats.fastestCorrectMs,
    bestRoundScore: Math.max(stats.bestRoundScore, input.points),
    themeScores: nextThemeScores,
  };
}

export function updateFastestCorrect(
  stats: TriviaPlayerStats,
  elapsedMs: number
): TriviaPlayerStats {
  return {
    ...stats,
    fastestCorrectMs:
      stats.fastestCorrectMs === null
        ? elapsedMs
        : Math.min(stats.fastestCorrectMs, elapsedMs),
  };
}

export type TriviaRankingEntry = {
  position: number;
  userId: string;
  nickname: string;
  avatar: string | null;
  totalScore: number;
  correctCount: number;
};

/** Ordena por pontuacao total e, em empate, por total de acertos; empatados dividem a posicao. */
export function buildTriviaRanking(
  players: TriviaPlayerStats[]
): TriviaRankingEntry[] {
  const sorted = [...players].sort(
    (first, second) =>
      second.totalScore - first.totalScore ||
      second.correctCount - first.correctCount
  );

  let position = 0;
  let previous: { totalScore: number; correctCount: number } | null = null;

  return sorted.map((player, index) => {
    if (
      !previous ||
      previous.totalScore !== player.totalScore ||
      previous.correctCount !== player.correctCount
    ) {
      position = index + 1;
    }

    previous = { totalScore: player.totalScore, correctCount: player.correctCount };

    return {
      position,
      userId: player.userId,
      nickname: player.nickname,
      avatar: player.avatar,
      totalScore: player.totalScore,
      correctCount: player.correctCount,
    };
  });
}

export type TriviaFinalStats = {
  userId: string;
  nickname: string;
  avatar: string | null;
  totalScore: number;
  correctCount: number;
  accuracyPercent: number;
  fastestCorrectMs: number | null;
  bestStreak: number;
  bestRoundScore: number;
  bestTheme: TriviaThemeId | null;
};

export function buildTriviaFinalStats(
  players: TriviaPlayerStats[],
  totalRounds: number
): TriviaFinalStats[] {
  return players.map((player) => {
    const bestTheme = Object.entries(player.themeScores).sort(
      ([, first], [, second]) => (second ?? 0) - (first ?? 0)
    )[0]?.[0] as TriviaThemeId | undefined;

    return {
      userId: player.userId,
      nickname: player.nickname,
      avatar: player.avatar,
      totalScore: player.totalScore,
      correctCount: player.correctCount,
      accuracyPercent:
        totalRounds > 0 ? Math.round((player.correctCount / totalRounds) * 100) : 0,
      fastestCorrectMs: player.fastestCorrectMs,
      bestStreak: player.bestStreak,
      bestRoundScore: player.bestRoundScore,
      bestTheme: bestTheme ?? null,
    };
  });
}
