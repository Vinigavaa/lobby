import { notFound } from "next/navigation";

import { StopGame } from "@/components/stop/stop-game";
import { PageTransition } from "@/components/ui/page-transition";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type StopPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function StopPage({ params }: StopPageProps) {
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
              type: "stop",
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

  if (!room || room.selectedGame?.type !== "stop" || room.matches.length === 0) {
    notFound();
  }

  return (
    <PageTransition>
      <StopGame code={room.code} />
    </PageTransition>
  );
}
