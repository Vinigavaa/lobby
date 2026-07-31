import { notFound } from "next/navigation";

import { PalpiteCertoGame } from "@/components/palpite-certo/palpite-certo-game";
import { PageTransition } from "@/components/ui/page-transition";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PalpiteCertoPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function PalpiteCertoPage({
  params,
}: PalpiteCertoPageProps) {
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
              type: "palpite-certo",
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
    room.selectedGame?.type !== "palpite-certo" ||
    room.matches.length === 0
  ) {
    notFound();
  }

  return (
    <PageTransition>
      <PalpiteCertoGame code={room.code} />
    </PageTransition>
  );
}
