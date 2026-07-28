import type { Prisma } from "../generated/prisma/client";

import { prisma } from "./prisma";

export type GuessWhoCardResult = {
  id: string;
  category: string;
  value: string;
  difficulty: string;
};

const categoryOrder = [
  "Famosos",
  "Personagens",
  "Animais",
  "Objetos",
  "Profissões",
  "Filmes",
  "Aleatório",
];

export async function listGuessWhoCategories() {
  const categories = await prisma.guessWhoCard.findMany({
    where: {
      isActive: true,
    },
    distinct: ["category"],
    select: {
      category: true,
    },
  });

  const order = new Map(
    categoryOrder.map((category, index) => [category, index])
  );

  return categories
    .map((item) => item.category)
    .sort(
      (first, second) =>
        (order.get(first) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(second) ?? Number.MAX_SAFE_INTEGER) ||
        first.localeCompare(second)
    );
}

export async function getRandomGuessWhoCards(
  quantity: number,
  category?: string
): Promise<GuessWhoCardResult[]> {
  const safeQuantity = Math.max(0, Math.floor(quantity));

  if (safeQuantity === 0) {
    return [];
  }

  const normalizedCategory = category?.trim();
  const where: Prisma.GuessWhoCardWhereInput = {
    isActive: true,
    ...(normalizedCategory ? { category: normalizedCategory } : {}),
  };
  const cards = await prisma.guessWhoCard.findMany({
    where,
    orderBy: {
      id: "asc",
    },
    select: {
      id: true,
      category: true,
      value: true,
      difficulty: true,
    },
  });

  return shuffle(cards).slice(0, safeQuantity);
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
