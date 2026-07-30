import { prisma } from "./prisma";
import type { TriviaThemeId } from "./trivia-themes";

export type RandomTriviaQuestion = {
  id: string;
  theme: string;
  question: string;
  options: string[];
  correctIndex: number;
};

export async function getRandomTriviaQuestion(
  theme: TriviaThemeId,
  excludeIds: string[]
): Promise<RandomTriviaQuestion | null> {
  const where = {
    theme,
    isActive: true,
    ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
  };

  let count = await prisma.triviaQuestion.count({ where });
  let effectiveWhere = where;

  if (count === 0) {
    // Tema esgotado nesta partida: permite repetir uma pergunta ja usada
    // desse tema em vez de travar a rodada.
    effectiveWhere = { theme, isActive: true };
    count = await prisma.triviaQuestion.count({ where: effectiveWhere });
  }

  if (count === 0) {
    return null;
  }

  const question = await prisma.triviaQuestion.findFirst({
    where: effectiveWhere,
    orderBy: { id: "asc" },
    skip: Math.floor(Math.random() * count),
    select: {
      id: true,
      theme: true,
      question: true,
      options: true,
      correctIndex: true,
    },
  });

  if (!question) {
    return null;
  }

  return {
    id: question.id,
    theme: question.theme,
    question: question.question,
    options: question.options as string[],
    correctIndex: question.correctIndex,
  };
}
