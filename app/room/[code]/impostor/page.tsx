import { notFound } from "next/navigation";

import { ImpostorGame } from "@/components/impostor/impostor-game";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ImpostorPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function ImpostorPage({ params }: ImpostorPageProps) {
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
              type: "impostor",
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
    room.selectedGame?.type !== "impostor" ||
    room.matches.length === 0
  ) {
    notFound();
  }

  return <ImpostorGame code={room.code} />;
}
