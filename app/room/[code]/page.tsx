import { notFound } from "next/navigation";

import { RoomLobby } from "@/components/room/room-lobby";
import { PageTransition } from "@/components/ui/page-transition";
import { prisma } from "@/lib/prisma";
import type { GamePayload } from "@/lib/socket/types";

export const dynamic = "force-dynamic";

type RoomPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { code } = await params;

  if (!/^\d{6}$/.test(code)) {
    notFound();
  }

  const [room, games] = await Promise.all([
    prisma.room.findUnique({
      where: { code },
      include: {
        selectedGame: true,
        players: {
          include: {
            user: true,
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
      },
    }),
    prisma.game.findMany(),
  ]);

  if (!room) {
    notFound();
  }

  const gameOrder = new Map(
    ["impostor", "quem-sou-eu", "mimica", "stop", "trivia", "cidade-dorme"].map(
      (type, index) => [type, index]
    )
  );

  const orderedGames: GamePayload[] = games
    .map((game) => ({
      id: game.id,
      type: game.type,
      name: game.name,
      description: game.description,
      isActive: game.isActive,
    }))
    .sort(
      (first, second) =>
        (gameOrder.get(first.type) ?? Number.MAX_SAFE_INTEGER) -
          (gameOrder.get(second.type) ?? Number.MAX_SAFE_INTEGER) ||
        first.name.localeCompare(second.name)
    );

  return (
    <PageTransition>
      <RoomLobby
        code={room.code}
        status={room.status}
        games={orderedGames}
        initialSelectedGame={
          room.selectedGame
            ? {
                id: room.selectedGame.id,
                type: room.selectedGame.type,
                name: room.selectedGame.name,
                description: room.selectedGame.description,
                isActive: room.selectedGame.isActive,
              }
            : null
        }
        initialPlayers={room.players.map((player) => ({
          id: player.id,
          userId: player.userId,
          nickname: player.user.nickname,
          avatar: player.user.avatar,
          isHost: player.isHost,
          isConnected: player.isConnected,
          joinedAt: player.joinedAt.toISOString(),
        }))}
      />
    </PageTransition>
  );
}
