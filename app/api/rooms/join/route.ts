import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type JoinRoomPayload = {
  nickname?: unknown;
  avatar?: unknown;
  code?: unknown;
  userId?: unknown;
};

function normalizePayload(payload: JoinRoomPayload) {
  const nickname =
    typeof payload.nickname === "string" ? payload.nickname.trim() : "";
  const avatar = typeof payload.avatar === "string" ? payload.avatar : null;
  const code = typeof payload.code === "string" ? payload.code.trim() : "";
  const userId =
    typeof payload.userId === "string" && payload.userId.trim()
      ? payload.userId.trim()
      : null;

  if (!nickname) {
    return { error: "Informe um nickname para continuar." };
  }

  if (nickname.length > 24) {
    return { error: "Nickname deve ter no maximo 24 caracteres." };
  }

  if (!/^\d{6}$/.test(code)) {
    return { error: "Informe um codigo de 6 digitos." };
  }

  return { data: { nickname, avatar, code, userId } };
}

export async function POST(request: NextRequest) {
  let payload: JoinRoomPayload;

  try {
    payload = (await request.json()) as JoinRoomPayload;
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const parsedPayload = normalizePayload(payload);

  if ("error" in parsedPayload) {
    return NextResponse.json({ error: parsedPayload.error }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { code: parsedPayload.data.code },
        select: { id: true, code: true, status: true },
      });

      if (!room) {
        return { error: "Sala nao encontrada", status: 404 as const };
      }

      if (room.status !== "waiting") {
        return { error: "Essa partida ja comecou", status: 409 as const };
      }

      const existingUser = parsedPayload.data.userId
        ? await tx.user.findUnique({
            where: { id: parsedPayload.data.userId },
            select: { id: true },
          })
        : null;

      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              nickname: parsedPayload.data.nickname,
              avatar: parsedPayload.data.avatar,
            },
          })
        : await tx.user.create({
            data: {
              nickname: parsedPayload.data.nickname,
              avatar: parsedPayload.data.avatar,
            },
          });

      await tx.roomPlayer.upsert({
        where: {
          roomId_userId: {
            roomId: room.id,
            userId: user.id,
          },
        },
        create: {
          roomId: room.id,
          userId: user.id,
          isHost: false,
          isConnected: true,
        },
        update: {
          isConnected: true,
        },
      });

      return {
        code: room.code,
        userId: user.id,
        status: 200 as const,
      };
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(
      { code: result.code, userId: result.userId },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel entrar na sala" },
      { status: 500 }
    );
  }
}
