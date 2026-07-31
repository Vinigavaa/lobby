import { prisma } from "./prisma";

export type RandomGuessNumberQuestion = {
  id: string;
  question: string;
  correctValue: number;
  unit: string | null;
  emoji: string | null;
};

export type DrawGuessNumberQuestionResult = {
  question: RandomGuessNumberQuestion;
  /**
   * `true` quando todas as perguntas ja tinham sido usadas e o banco foi
   * reciclado. O chamador deve zerar `usedQuestionIds` para reiniciar o ciclo.
   */
  cycleRestarted: boolean;
};

/**
 * Sorteia uma pergunta inedita para a partida.
 *
 * Enquanto houver pergunta ativa fora de `excludeIds`, nenhuma se repete. Ao
 * esgotar, o banco inteiro volta a ser elegivel e o retorno sinaliza o
 * reinicio do ciclo, garantindo que a partida nunca trave por falta de
 * pergunta inedita.
 */
export async function getRandomGuessNumberQuestion(
  excludeIds: string[]
): Promise<DrawGuessNumberQuestionResult | null> {
  const unseenWhere = {
    isActive: true,
    ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
  };

  let where = unseenWhere;
  let cycleRestarted = false;
  let count = await prisma.guessNumberQuestion.count({ where });

  if (count === 0 && excludeIds.length > 0) {
    where = { isActive: true };
    cycleRestarted = true;
    count = await prisma.guessNumberQuestion.count({ where });
  }

  if (count === 0) {
    console.error(
      "[palpite-certo] Nenhuma pergunta ativa no banco: rode o seed (`npx prisma db seed`) ou reative perguntas em GuessNumberQuestion."
    );
    return null;
  }

  const question = await prisma.guessNumberQuestion.findFirst({
    where,
    orderBy: { id: "asc" },
    skip: Math.floor(Math.random() * count),
    select: {
      id: true,
      question: true,
      correctValue: true,
      unit: true,
      emoji: true,
    },
  });

  if (!question) {
    console.error(
      "[palpite-certo] Sorteio nao retornou pergunta apesar da contagem positiva; possivel escrita concorrente em GuessNumberQuestion."
    );
    return null;
  }

  return { question, cycleRestarted };
}
