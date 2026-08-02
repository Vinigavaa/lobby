/**
 * Logica pura do Stop (Adedonha): sorteio de letra, normalizacao, validacao e
 * pontuacao. Nao depende de Prisma nem de React e e usada exclusivamente no
 * servidor para que a pontuacao nao possa ser manipulada pelo cliente.
 */

export const stopMinimumPlayers = 2;

// Letras evitadas no sorteio inicial por gerarem poucas respostas.
const excludedLetters = new Set(["K", "W", "X", "Y"]);
const playableLetters = "ABCDEFGHIJLMNOPQRSTUVZ"
  .split("")
  .filter((letter) => !excludedLetters.has(letter));

const diacriticsRegex = new RegExp("[\\u0300-\\u036f]", "g");

export type StopAnswerStatus =
  | "unique"
  | "duplicate"
  | "invalid"
  | "blank"
  | "rejected";

export type StopScoreEntry = {
  userId: string;
  nickname: string;
  answer: string;
  points: number;
  status: StopAnswerStatus;
};

export type StopScoreCategory = {
  key: string;
  entries: StopScoreEntry[];
};

export type StopScoreResult = {
  roundScores: Record<string, number>;
  detail: StopScoreCategory[];
};

type StopScoringInput = {
  letter: string | null;
  categories: string[];
  players: Array<{ userId: string; nickname: string }>;
  submissions: Record<string, { answers: Record<string, string> }>;
  rejections: Record<string, string[]>;
};

export function drawStopLetter(previousLetter?: string | null): string {
  const pool =
    previousLetter && playableLetters.length > 1
      ? playableLetters.filter((letter) => letter !== previousLetter)
      : playableLetters;

  return pool[Math.floor(Math.random() * pool.length)];
}

export function normalizeStopAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(diacriticsRegex, "");
}

export function startsWithLetter(value: string, letter: string): boolean {
  const normalizedValue = normalizeStopAnswer(value);
  const normalizedLetter = normalizeStopAnswer(letter);

  return (
    normalizedValue.length > 0 &&
    normalizedLetter.length > 0 &&
    normalizedValue[0] === normalizedLetter[0]
  );
}

export function rejectionKey(userId: string, category: string): string {
  return `${userId}|${category}`;
}

function isRejectedByMajority(
  rejectVoters: string[] | undefined,
  ownerUserId: string,
  totalPlayers: number
): boolean {
  if (!rejectVoters || rejectVoters.length === 0) {
    return false;
  }

  const distinctVoters = new Set(
    rejectVoters.filter((voter) => voter !== ownerUserId)
  );
  const eligibleVoters = Math.max(1, totalPlayers - 1);

  return distinctVoters.size * 2 > eligibleVoters;
}

export function computeStopScores(state: StopScoringInput): StopScoreResult {
  const roundScores: Record<string, number> = {};

  for (const player of state.players) {
    roundScores[player.userId] = 0;
  }

  const detail: StopScoreCategory[] = [];
  const totalPlayers = state.players.length;

  for (const category of state.categories) {
    const entries: StopScoreEntry[] = [];
    const normalizedCounts = new Map<string, number>();

    // Primeira passada: descobrir respostas validas e contar duplicidades.
    for (const player of state.players) {
      const rawAnswer =
        state.submissions[player.userId]?.answers[category] ?? "";
      const normalized = normalizeStopAnswer(rawAnswer);
      const rejected = isRejectedByMajority(
        state.rejections[rejectionKey(player.userId, category)],
        player.userId,
        totalPlayers
      );
      const isValid =
        !rejected &&
        state.letter !== null &&
        startsWithLetter(rawAnswer, state.letter);

      if (isValid) {
        normalizedCounts.set(
          normalized,
          (normalizedCounts.get(normalized) ?? 0) + 1
        );
      }
    }

    // Segunda passada: atribuir pontos.
    for (const player of state.players) {
      const rawAnswer =
        state.submissions[player.userId]?.answers[category] ?? "";
      const trimmed = rawAnswer.trim();
      const normalized = normalizeStopAnswer(rawAnswer);
      const rejected = isRejectedByMajority(
        state.rejections[rejectionKey(player.userId, category)],
        player.userId,
        totalPlayers
      );

      let status: StopAnswerStatus;
      let points: number;

      if (trimmed.length === 0) {
        status = "blank";
        points = 0;
      } else if (rejected) {
        status = "rejected";
        points = 0;
      } else if (
        state.letter === null ||
        !startsWithLetter(rawAnswer, state.letter)
      ) {
        status = "invalid";
        points = 0;
      } else if ((normalizedCounts.get(normalized) ?? 0) > 1) {
        status = "duplicate";
        points = 5;
      } else {
        status = "unique";
        points = 10;
      }

      roundScores[player.userId] = (roundScores[player.userId] ?? 0) + points;
      entries.push({
        userId: player.userId,
        nickname: player.nickname,
        answer: trimmed,
        points,
        status,
      });
    }

    detail.push({ key: category, entries });
  }

  return { roundScores, detail };
}
