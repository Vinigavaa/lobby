import type { Prisma } from "../generated/prisma/client";

import { mimicaCategoryOrder } from "./mimica-words-data";
import { prisma } from "./prisma";

export type RandomMimicaWord = {
  category: string;
  value: string;
};

export async function getMimicaWordCategories() {
  const categories = await prisma.mimicaWord.findMany({
    where: {
      isActive: true,
    },
    distinct: ["category"],
    select: {
      category: true,
    },
  });

  const order = new Map(
    mimicaCategoryOrder.map((category, index) => [category, index])
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

export async function getRandomMimicaWord(
  category?: string
): Promise<RandomMimicaWord | null> {
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
  const wordCount = await prisma.mimicaWord.count({ where });

  if (wordCount === 0) {
    return null;
  }

  return prisma.mimicaWord.findFirst({
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

export async function getRandomMimicaWordExcept(
  category: string,
  previousWord?: RandomMimicaWord | null
): Promise<RandomMimicaWord | null> {
  const normalizedCategory = category.trim();

  if (!normalizedCategory) {
    return getRandomMimicaWord();
  }

  const where: Prisma.MimicaWordWhereInput = {
    isActive: true,
    category: normalizedCategory,
    ...(previousWord
      ? {
          NOT: {
            value: previousWord.value,
          },
        }
      : {}),
  };
  const wordCount = await prisma.mimicaWord.count({ where });

  if (wordCount === 0) {
    return getRandomMimicaWord(normalizedCategory);
  }

  return prisma.mimicaWord.findFirst({
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
  const categories = await getMimicaWordCategories();

  if (categories.length === 0) {
    return null;
  }

  return categories[Math.floor(Math.random() * categories.length)];
}
