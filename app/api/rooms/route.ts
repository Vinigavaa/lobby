import { randomInt } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const maxCodeAttempts = 30;

type CreateRoomPayload = {
  nickname?: unknown;
  avatar?: unknown;
  userId?: unknown;
};

function isValidUserId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizePayload(payload: CreateRoomPayload) {
  const nickname =
    typeof payload.nickname === "string" ? payload.nickname.trim() : "";
  const avatar = typeof payload.avatar === "string" ? payload.avatar : null;
  const userId =
    typeof payload.userId === "string" && payload.userId.trim()
      ? payload.userId.trim()
      : null;

  if (!nickname) {
    return { error: "Nickname obrigatorio" };
  }

  if (nickname.length > 24) {
    return { error: "Nickname deve ter no maximo 24 caracteres" };
  }

  return { data: { nickname, avatar, userId } };
}

function generateRoomCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function POST(request: NextRequest) {
  let payload: CreateRoomPayload;

  try {
    payload = (await request.json()) as CreateRoomPayload;
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const parsedPayload = normalizePayload(payload);

  if ("error" in parsedPayload) {
    return NextResponse.json({ error: parsedPayload.error }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingUser = isValidUserId(parsedPayload.data.userId)
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

      let code: string | null = null;

      for (let attempt = 0; attempt < maxCodeAttempts; attempt++) {
        const candidate = generateRoomCode();
        const existingRoom = await tx.room.findUnique({
          where: { code: candidate },
          select: { id: true, status: true },
        });

        if (!existingRoom) {
          code = candidate;
          break;
        }
      }

      if (!code) {
        throw new Error("ROOM_CODE_UNAVAILABLE");
      }

      const room = await tx.room.create({
        data: {
          code,
          status: "waiting",
          hostId: user.id,
        },
      });

      await tx.roomPlayer.create({
        data: {
          roomId: room.id,
          userId: user.id,
          isHost: true,
          isConnected: true,
        },
      });

      return {
        code: room.code,
        roomId: room.id,
        userId: user.id,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "ROOM_CODE_UNAVAILABLE") {
      return NextResponse.json(
        { error: "Nao foi possivel gerar codigo da sala" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Nao foi possivel criar a sala" },
      { status: 500 }
    );
  }
}
