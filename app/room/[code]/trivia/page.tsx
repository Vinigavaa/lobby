import { notFound } from "next/navigation";

import { TriviaGame } from "@/components/trivia/trivia-game";
import { PageTransition } from "@/components/ui/page-transition";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type TriviaPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function TriviaPage({ params }: TriviaPageProps) {
  const { code } = await params;

  if (!/^\d{6}$/.test(code)) {
    notFound();
  }

  const room = await prisma.room.findUnique({
    where: { code },
    select: {
      code: true,
      selectedGame: {
        select: {
          type: true,
        },
      },
      matches: {
        where: {
          status: "playing",
          endedAt: null,
          game: {
            is: {
              type: "trivia",
            },
          },
        },
        take: 1,
        select: {
          id: true,
        },
      },
    },
  });

  if (
    !room ||
    room.selectedGame?.type !== "trivia" ||
    room.matches.length === 0
  ) {
    notFound();
  }

  return (
    <PageTransition>
      <TriviaGame code={room.code} />
    </PageTransition>
  );
}
