import type { Prisma } from "../generated/prisma/client";

import { prisma } from "./prisma";

export type RandomImpostorWord = {
  category: string;
  value: string;
};

const categoryOrder = [
  "Comida",
  "Filmes",
  "Países",
  "Objetos",
  "Animais",
  "Memes",
  "Aleatório",
];

export async function getImpostorWordCategories() {
  const categories = await prisma.impostorWord.findMany({
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

export async function getRandomImpostorWord(
  category?: string
): Promise<RandomImpostorWord | null> {
  const normalizedCategory = category?.trim();
  const selectedCategory =
    normalizedCategory && normalizedCategory.length > 0
      ? normalizedCategory
      : await getRandomActiveCategory();

  if (!selectedCategory) {
    return null;
  }

  const where = {
    category: selectedCategory,
    isActive: true,
  };
  const wordCount = await prisma.impostorWord.count({ where });

  if (wordCount === 0) {
    return null;
  }

  const word = await prisma.impostorWord.findFirst({
    where,
    orderBy: {
      id: "asc",
    },
    skip: Math.floor(Math.random() * wordCount),
    select: {
      category: true,
      value: true,
    },
  });

  return word;
}

export async function getRandomImpostorWordExcept(
  previousWord?: RandomImpostorWord | null
): Promise<RandomImpostorWord | null> {
  const where: Prisma.ImpostorWordWhereInput = {
    isActive: true,
    ...(previousWord
      ? {
          NOT: {
            category: previousWord.category,
            value: previousWord.value,
          },
        }
      : {}),
  };
  const wordCount = await prisma.impostorWord.count({ where });

  if (wordCount === 0) {
    return previousWord ? getRandomImpostorWord() : null;
  }

  return prisma.impostorWord.findFirst({
    where,
    orderBy: {
      id: "asc",
    },
    skip: Math.floor(Math.random() * wordCount),
    select: {
      category: true,
      value: true,
    },
  });
}

async function getRandomActiveCategory() {
  const categories = await getImpostorWordCategories();

  if (categories.length === 0) {
    return null;
  }

  return categories[Math.floor(Math.random() * categories.length)];
}
