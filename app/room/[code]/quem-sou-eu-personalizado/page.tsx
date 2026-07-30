import { notFound } from "next/navigation";

import { CustomGuessWhoGame } from "@/components/quem-sou-eu-personalizado/custom-guess-who-game";
import { customGuessWhoGameType } from "@/lib/custom-guess-who-engine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CustomGuessWhoPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function CustomGuessWhoPage({
  params,
}: CustomGuessWhoPageProps) {
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
              type: customGuessWhoGameType,
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
    room.selectedGame?.type !== customGuessWhoGameType ||
    room.matches.length === 0
  ) {
    notFound();
  }

  return <CustomGuessWhoGame code={room.code} />;
}
