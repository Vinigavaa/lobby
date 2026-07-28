import { notFound } from "next/navigation";

import { MimicaGame } from "@/components/mimica/mimica-game";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type MimicaPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function MimicaPage({ params }: MimicaPageProps) {
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
              type: "mimica",
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
    room.selectedGame?.type !== "mimica" ||
    room.matches.length === 0
  ) {
    notFound();
  }

  return <MimicaGame code={room.code} />;
}
