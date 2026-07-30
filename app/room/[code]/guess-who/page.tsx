import { notFound } from "next/navigation";

import { GuessWhoGame } from "@/components/guess-who/guess-who-game";
import { PageTransition } from "@/components/ui/page-transition";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type GuessWhoPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function GuessWhoPage({ params }: GuessWhoPageProps) {
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
              type: "quem-sou-eu",
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
    room.selectedGame?.type !== "quem-sou-eu" ||
    room.matches.length === 0
  ) {
    notFound();
  }

  return (
    <PageTransition>
      <GuessWhoGame code={room.code} />
    </PageTransition>
  );
}
