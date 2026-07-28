import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";

import { getRandomGuessWhoCards } from "../guess-who-cards";
import {
  getRandomImpostorWord,
  getRandomImpostorWordExcept,
} from "../impostor-words";
import {
  getRandomMimicaWord,
  getRandomMimicaWordExcept,
  type RandomMimicaWord,
} from "../mimica-words";
import {
  getStopCategoryLabel,
  stopCategoryKeys,
  stopDurationOptions,
  stopRoundOptions,
} from "../stop-categories";
import { computeStopScores, drawStopLetter, rejectionKey } from "../stop-engine";
import { prisma } from "../prisma";
import { SOCKET_PATH } from "./config";
import { SOCKET_EVENTS } from "./events";
import type {
  ClientToServerEvents,
  GamePayload,
  GameUpdatedPayload,
  GuessWhoStatePayload,
  HostUpdatedPayload,
  ImpostorHintsUpdatedPayload,
  ImpostorReadyUpdatedPayload,
  ImpostorResultPayload,
  ImpostorTurnChangedPayload,
  ImpostorVotesUpdatedPayload,
  MimicaStatePayload,
  PlayersUpdatedPayload,
  ServerToClientEvents,
  SocketData,
  StopRankingEntryPayload,
  StopReviewCategoryPayload,
  StopStatePayload,
} from "./types";

type InterServerEvents = Record<string, never>;

export type LobbySocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
type LobbySocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
type RoleSocket = Pick<LobbySocket, "data" | "emit">;

let io: LobbySocketServer | undefined;
const minimumPlayersToStart = 3;

type SocketServerTransaction = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];
type SelectGameResult = { error: string } | { roomCode: string };
type StartGuessWhoResult =
  | { error: string }
  | { roomCode: string; matchId: string };
type EndGuessWhoRoundResult =
  | { error: string }
  | { roomCode: string; matchId: string };
type ImpostorReadyResult =
  | { error: string }
  | { readyPayload: ImpostorReadyUpdatedPayload; phaseChanged: boolean };
type ImpostorHintResult =
  | { error: string }
  | {
      readyPayload: ImpostorReadyUpdatedPayload;
      hintsPayload: ImpostorHintsUpdatedPayload;
      turnPayload: ImpostorTurnChangedPayload;
      phaseChanged: boolean;
    };
type ImpostorVoteResult =
  | { error: string }
  | {
      readyPayload: ImpostorReadyUpdatedPayload;
      votesPayload: ImpostorVotesUpdatedPayload;
      resultPayload: ImpostorResultPayload | null;
      phaseChanged: boolean;
    };
type ConnectedImpostorPlayer = {
  userId: string;
  nickname: string;
  avatar: string | null;
};
type ConnectedGuessWhoPlayer = ConnectedImpostorPlayer;
type ImpostorMatchState = {
  phase: "reveal" | "hints" | "voting" | "result";
  category: string;
  word: string;
  impostorUserId: string;
  players: Array<{
    userId: string;
    nickname: string;
    avatar: string | null;
    isReady: boolean;
    isAlive: boolean;
  }>;
  hints: Array<{
    userId: string;
    nickname: string;
    text: string;
    createdAt: string;
  }>;
  votes: Array<{
    voterUserId: string;
    targetUserId: string;
    createdAt: string;
  }>;
  result?: {
    word: string;
    selectedUserId: string;
    selectedNickname: string;
    impostorUserId: string;
    impostorNickname: string;
    groupWon: boolean;
    tied: boolean;
    votes: Array<{
      voterUserId: string;
      voterNickname: string;
      targetUserId: string;
      targetNickname: string;
      createdAt: string;
    }>;
  };
};
type GuessWhoMatchState = {
  phase: "playing" | "result";
  players: Array<{
    userId: string;
    nickname: string;
    avatar: string | null;
    card: {
      id: string;
      category: string;
      value: string;
      difficulty: string;
    };
  }>;
};
type ConnectedMimicaPlayer = ConnectedImpostorPlayer;
type MimicaMatchState = {
  phase: "setup" | "reveal" | "playing" | "roundResult";
  category: string | null;
  durationSeconds: number;
  word: string | null;
  wordCategory: string | null;
  currentMimerUserId: string | null;
  roundNumber: number;
  roundEndsAt: string | null;
  lastRound: {
    word: string;
    success: boolean;
    mimerUserId: string;
    mimerNickname: string;
  } | null;
  players: Array<{
    userId: string;
    nickname: string;
    avatar: string | null;
    score: number;
  }>;
};
type MimicaMutationResult =
  | { error: string }
  | { roomCode: string; matchId: string };

const mimicaRandomCategory = "Aleatória";
const mimicaDurationOptions = [30, 60];
const mimicaTimers = new Map<string, NodeJS.Timeout>();

type ConnectedStopPlayer = ConnectedImpostorPlayer;
type StopMatchState = {
  phase: "setup" | "playing" | "review" | "roundResult" | "finished";
  durationSeconds: number;
  totalRounds: number;
  roundNumber: number;
  categories: string[];
  letter: string | null;
  roundEndsAt: string | null;
  players: Array<{
    userId: string;
    nickname: string;
    avatar: string | null;
    totalScore: number;
  }>;
  submissions: Record<string, { submitted: boolean; answers: Record<string, string> }>;
  rejections: Record<string, string[]>;
  roundScores: Record<string, number> | null;
};
type StopMutationResult =
  | { error: string }
  | { roomCode: string; matchId: string };

const stopTimerGraceMs = 1500;
const stopTimers = new Map<string, NodeJS.Timeout>();

function pickImpostorPlayer(
  players: ConnectedImpostorPlayer[],
  previousImpostorUserId?: string
) {
  const eligiblePlayers = previousImpostorUserId
    ? players.filter((player) => player.userId !== previousImpostorUserId)
    : players;
  const pool = eligiblePlayers.length > 0 ? eligiblePlayers : players;

  return pool[Math.floor(Math.random() * pool.length)];
}

export function getSocketServer() {
  return io;
}

export function createSocketServer(httpServer: HttpServer) {
  if (io) {
    return io;
  }

  io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    path: SOCKET_PATH,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on(SOCKET_EVENTS.JOIN_ROOM, async ({ roomCode, userId }) => {
      const normalizedRoomCode = normalizeRoomCode(roomCode);
      const normalizedUserId = userId.trim();

      if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "Sala ou usuario invalido" });
        return;
      }

      try {
        const room = await prisma.room.findUnique({
          where: { code: normalizedRoomCode },
          select: { id: true, code: true },
        });

        if (!room) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: "Sala nao encontrada" });
          return;
        }

        const roomPlayer = await prisma.roomPlayer.findUnique({
          where: {
            roomId_userId: {
              roomId: room.id,
              userId: normalizedUserId,
            },
          },
          select: { id: true },
        });

        if (!roomPlayer) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Voce nao participa desta sala",
          });
          return;
        }

        await prisma.roomPlayer.update({
          where: { id: roomPlayer.id },
          data: {
            socketId: socket.id,
            isConnected: true,
          },
        });

        socket.data.roomCode = room.code;
        socket.data.userId = normalizedUserId;
        socket.join(room.code);

        await emitRoomState(room.code);
        await emitImpostorPrivateRole(socket, room.code, normalizedUserId);
        await emitImpostorReadyStateToSocket(socket, room.code);
        await emitGuessWhoStateToSocket(socket, room.code, normalizedUserId);
        await emitMimicaStateToSocket(socket, room.code, normalizedUserId);
        await emitMimicaPrivateWordToSocket(socket, room.code, normalizedUserId);
        await emitStopStateToSocket(socket, room.code, normalizedUserId);
      } catch {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Nao foi possivel conectar na sala",
        });
      }
    });

    socket.on(SOCKET_EVENTS.LEAVE_ROOM, async ({ roomCode, userId }) => {
      const normalizedRoomCode = normalizeRoomCode(roomCode);
      const normalizedUserId = userId.trim();

      if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "Sala ou usuario invalido" });
        return;
      }

      await leaveRoom(normalizedRoomCode, normalizedUserId);
      socket.leave(normalizedRoomCode);
      socket.data.roomCode = undefined;
      socket.data.userId = undefined;
    });

    socket.on(SOCKET_EVENTS.KICK_PLAYER, () => {
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: "Remocao de jogadores sera implementada em breve",
      });
    });

    socket.on(
      SOCKET_EVENTS.GAME_SELECTED,
      async ({ roomCode, userId, gameId }) => {
        const normalizedRoomCode = normalizeRoomCode(roomCode);
        const normalizedUserId = userId.trim();
        const normalizedGameId = gameId.trim();

        if (
          !isValidRoomPayload(normalizedRoomCode, normalizedUserId) ||
          !normalizedGameId
        ) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Sala, usuario ou jogo invalido",
          });
          return;
        }

        try {
          const result: SelectGameResult = await prisma.$transaction(
            async (tx) => {
            const room = await tx.room.findUnique({
              where: { code: normalizedRoomCode },
              select: {
                id: true,
                code: true,
                status: true,
                hostId: true,
              },
            });

            if (!room) {
              return { error: "Sala nao encontrada" };
            }

            if (room.status !== "waiting") {
              return { error: "A partida ja foi iniciada" };
            }

            const roomPlayer = await tx.roomPlayer.findUnique({
              where: {
                roomId_userId: {
                  roomId: room.id,
                  userId: normalizedUserId,
                },
              },
              select: { isHost: true },
            });

            if (!roomPlayer?.isHost || room.hostId !== normalizedUserId) {
              return { error: "Apenas o host pode escolher o jogo" };
            }

            const game = await tx.game.findUnique({
              where: { id: normalizedGameId },
              select: gameSelect,
            });

            if (!game) {
              return { error: "Jogo nao encontrado" };
            }

            if (!game.isActive) {
              return { error: "Esse jogo estara disponivel em breve" };
            }

            await tx.room.update({
              where: { id: room.id },
              data: { selectedGameId: game.id },
            });

            return { roomCode: room.code };
            }
          );

          if ("error" in result) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
            return;
          }

          await emitRoomState(result.roomCode);
        } catch {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Nao foi possivel escolher o jogo",
          });
        }
      }
    );

    socket.on(SOCKET_EVENTS.IMPOSTOR_START, async ({ roomCode, userId }) => {
      const normalizedRoomCode = normalizeRoomCode(roomCode);
      const normalizedUserId = userId.trim();

      if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "Sala ou usuario invalido" });
        return;
      }

      try {
        const result = await startImpostorMatch(
          normalizedRoomCode,
          normalizedUserId
        );

        if ("error" in result) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
          return;
        }

        await emitRoomState(result.roomCode, result.matchId);
        io?.to(result.roomCode).emit(SOCKET_EVENTS.IMPOSTOR_STARTED, {
          roomCode: result.roomCode,
          matchId: result.matchId,
          path: `/room/${result.roomCode}/impostor`,
        });
        await emitImpostorPrivateRoles(result.roomCode, result.matchId);
        await emitImpostorReadyState(result.roomCode, result.matchId);
      } catch {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Nao foi possivel iniciar a partida",
        });
      }
    });

    socket.on(SOCKET_EVENTS.IMPOSTOR_READY, async ({ roomCode, userId }) => {
      const normalizedRoomCode = normalizeRoomCode(roomCode);
      const normalizedUserId = userId.trim();

      if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "Sala ou usuario invalido" });
        return;
      }

      try {
        const result = await markImpostorPlayerReady(
          normalizedRoomCode,
          normalizedUserId
        );

        if ("error" in result) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
          return;
        }

        emitImpostorReadyUpdated(result.readyPayload);

        if (result.phaseChanged) {
          io?.to(result.readyPayload.roomCode).emit(
            SOCKET_EVENTS.IMPOSTOR_PHASE_CHANGED,
            {
              roomCode: result.readyPayload.roomCode,
              matchId: result.readyPayload.matchId,
              phase: "hints",
            }
          );
        }
      } catch {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Nao foi possivel marcar pronto",
        });
      }
    });

    socket.on(
      SOCKET_EVENTS.IMPOSTOR_SUBMIT_HINT,
      async ({ roomCode, userId, text }) => {
        const normalizedRoomCode = normalizeRoomCode(roomCode);
        const normalizedUserId = userId.trim();
        const normalizedText = text.trim();

        if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Sala ou usuario invalido",
          });
          return;
        }

        if (!normalizedText) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: "Dica obrigatoria" });
          return;
        }

        if (normalizedText.length > 30) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Dica deve ter no maximo 30 caracteres",
          });
          return;
        }

        try {
          const result = await submitImpostorHint(
            normalizedRoomCode,
            normalizedUserId,
            normalizedText
          );

          if ("error" in result) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
            return;
          }

          emitImpostorReadyUpdated(result.readyPayload);
          io?.to(result.hintsPayload.roomCode).emit(
            SOCKET_EVENTS.IMPOSTOR_HINTS_UPDATED,
            result.hintsPayload
          );
          io?.to(result.turnPayload.roomCode).emit(
            SOCKET_EVENTS.IMPOSTOR_TURN_CHANGED,
            result.turnPayload
          );

          if (result.phaseChanged) {
            io?.to(result.readyPayload.roomCode).emit(
              SOCKET_EVENTS.IMPOSTOR_PHASE_CHANGED,
              {
                roomCode: result.readyPayload.roomCode,
                matchId: result.readyPayload.matchId,
                phase: "voting",
              }
            );
          }
        } catch {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Nao foi possivel enviar a dica",
          });
        }
      }
    );

    socket.on(
      SOCKET_EVENTS.IMPOSTOR_VOTE,
      async ({ roomCode, userId, targetUserId }) => {
        const normalizedRoomCode = normalizeRoomCode(roomCode);
        const normalizedUserId = userId.trim();
        const normalizedTargetUserId = targetUserId.trim();

        if (
          !isValidRoomPayload(normalizedRoomCode, normalizedUserId) ||
          !normalizedTargetUserId
        ) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Sala, usuario ou voto invalido",
          });
          return;
        }

        try {
          const result = await submitImpostorVote(
            normalizedRoomCode,
            normalizedUserId,
            normalizedTargetUserId
          );

          if ("error" in result) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
            return;
          }

          emitImpostorReadyUpdated(result.readyPayload);
          io?.to(result.votesPayload.roomCode).emit(
            SOCKET_EVENTS.IMPOSTOR_VOTES_UPDATED,
            result.votesPayload
          );

          if (result.phaseChanged && result.resultPayload) {
            io?.to(result.readyPayload.roomCode).emit(
              SOCKET_EVENTS.IMPOSTOR_PHASE_CHANGED,
              {
                roomCode: result.readyPayload.roomCode,
                matchId: result.readyPayload.matchId,
                phase: "result",
              }
            );
            io?.to(result.resultPayload.roomCode).emit(
              SOCKET_EVENTS.IMPOSTOR_RESULT,
              result.resultPayload
            );
          }
        } catch {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Nao foi possivel registrar o voto",
          });
        }
      }
    );

    socket.on(SOCKET_EVENTS.IMPOSTOR_PLAY_AGAIN, async ({ roomCode, userId }) => {
      const normalizedRoomCode = normalizeRoomCode(roomCode);
      const normalizedUserId = userId.trim();

      if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "Sala ou usuario invalido" });
        return;
      }

      try {
        const result = await createNextImpostorMatch(
          normalizedRoomCode,
          normalizedUserId
        );

        if ("error" in result) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
          return;
        }

        io?.to(result.roomCode).emit(SOCKET_EVENTS.IMPOSTOR_STARTED, {
          roomCode: result.roomCode,
          matchId: result.matchId,
          path: `/room/${result.roomCode}/impostor`,
        });
        await emitImpostorPrivateRoles(result.roomCode, result.matchId);
        await emitImpostorReadyState(result.roomCode, result.matchId);
      } catch {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Nao foi possivel iniciar nova partida",
        });
      }
    });

    socket.on(
      SOCKET_EVENTS.IMPOSTOR_BACK_TO_LOBBY,
      async ({ roomCode, userId }) => {
        const normalizedRoomCode = normalizeRoomCode(roomCode);
        const normalizedUserId = userId.trim();

        if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Sala ou usuario invalido",
          });
          return;
        }

        try {
          const result = await backImpostorRoomToLobby(
            normalizedRoomCode,
            normalizedUserId
          );

          if ("error" in result) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
            return;
          }

          await emitRoomState(result.roomCode);
          io?.to(result.roomCode).emit(SOCKET_EVENTS.IMPOSTOR_BACK_TO_LOBBY, {
            roomCode: result.roomCode,
            path: `/room/${result.roomCode}`,
          });
        } catch {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Nao foi possivel voltar ao lobby",
          });
        }
      }
    );

    socket.on(SOCKET_EVENTS.START_GAME, async ({ roomCode, userId }) => {
      const normalizedRoomCode = normalizeRoomCode(roomCode);
      const normalizedUserId = userId.trim();

      if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "Sala ou usuario invalido" });
        return;
      }

      try {
        const result = await startGuessWhoMatch(
          normalizedRoomCode,
          normalizedUserId
        );

        if ("error" in result) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
          return;
        }

        await emitRoomState(result.roomCode, result.matchId);
        io?.to(result.roomCode).emit(SOCKET_EVENTS.GUESS_WHO_STARTED, {
          roomCode: result.roomCode,
          matchId: result.matchId,
          path: `/room/${result.roomCode}/guess-who`,
        });
        await emitGuessWhoStates(result.roomCode, result.matchId);
      } catch {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Nao foi possivel iniciar a partida",
        });
      }
    });

    socket.on(SOCKET_EVENTS.MIMICA_START, async ({ roomCode, userId }) => {
      const normalizedRoomCode = normalizeRoomCode(roomCode);
      const normalizedUserId = userId.trim();

      if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "Sala ou usuario invalido" });
        return;
      }

      try {
        const result = await startMimicaMatch(
          normalizedRoomCode,
          normalizedUserId
        );

        if ("error" in result) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
          return;
        }

        await emitRoomState(result.roomCode, result.matchId);
        io?.to(result.roomCode).emit(SOCKET_EVENTS.MIMICA_STARTED, {
          roomCode: result.roomCode,
          matchId: result.matchId,
          path: `/room/${result.roomCode}/mimica`,
        });
        await emitMimicaState(result.roomCode, result.matchId);
      } catch {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Nao foi possivel iniciar a partida",
        });
      }
    });

    socket.on(
      SOCKET_EVENTS.MIMICA_BEGIN,
      async ({ roomCode, userId, category, durationSeconds }) => {
        const normalizedRoomCode = normalizeRoomCode(roomCode);
        const normalizedUserId = userId.trim();
        const normalizedCategory =
          typeof category === "string" ? category.trim() : "";
        const normalizedDuration = Number(durationSeconds);

        if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Sala ou usuario invalido",
          });
          return;
        }

        if (!mimicaDurationOptions.includes(normalizedDuration)) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Tempo da rodada invalido",
          });
          return;
        }

        try {
          const result = await beginMimicaRound(
            normalizedRoomCode,
            normalizedUserId,
            normalizedCategory,
            normalizedDuration
          );

          if ("error" in result) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
            return;
          }

          await emitMimicaState(result.roomCode, result.matchId);
          await emitMimicaPrivateWordToMimer(result.roomCode, result.matchId);
        } catch {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Nao foi possivel iniciar a rodada",
          });
        }
      }
    );

    socket.on(
      SOCKET_EVENTS.MIMICA_START_MIME,
      async ({ roomCode, userId }) => {
        const normalizedRoomCode = normalizeRoomCode(roomCode);
        const normalizedUserId = userId.trim();

        if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Sala ou usuario invalido",
          });
          return;
        }

        try {
          const result = await startMimicaPlay(
            normalizedRoomCode,
            normalizedUserId
          );

          if ("error" in result) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
            return;
          }

          await emitMimicaState(result.roomCode, result.matchId);
          await scheduleMimicaTimeout(result.matchId, result.roomCode);
        } catch {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Nao foi possivel comecar a mimica",
          });
        }
      }
    );

    socket.on(SOCKET_EVENTS.MIMICA_CORRECT, async ({ roomCode, userId }) => {
      const normalizedRoomCode = normalizeRoomCode(roomCode);
      const normalizedUserId = userId.trim();

      if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "Sala ou usuario invalido" });
        return;
      }

      try {
        const result = await registerMimicaCorrect(
          normalizedRoomCode,
          normalizedUserId
        );

        if ("error" in result) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
          return;
        }

        clearMimicaTimeout(result.matchId);
        await emitMimicaState(result.roomCode, result.matchId);
      } catch {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Nao foi possivel registrar o acerto",
        });
      }
    });

    socket.on(SOCKET_EVENTS.MIMICA_NEXT_ROUND, async ({ roomCode, userId }) => {
      const normalizedRoomCode = normalizeRoomCode(roomCode);
      const normalizedUserId = userId.trim();

      if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "Sala ou usuario invalido" });
        return;
      }

      try {
        const result = await advanceMimicaRound(
          normalizedRoomCode,
          normalizedUserId
        );

        if ("error" in result) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
          return;
        }

        await emitMimicaState(result.roomCode, result.matchId);
        await emitMimicaPrivateWordToMimer(result.roomCode, result.matchId);
      } catch {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Nao foi possivel iniciar a proxima rodada",
        });
      }
    });

    socket.on(
      SOCKET_EVENTS.MIMICA_BACK_TO_LOBBY,
      async ({ roomCode, userId }) => {
        const normalizedRoomCode = normalizeRoomCode(roomCode);
        const normalizedUserId = userId.trim();

        if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Sala ou usuario invalido",
          });
          return;
        }

        try {
          const result = await backMimicaRoomToLobby(
            normalizedRoomCode,
            normalizedUserId
          );

          if ("error" in result) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
            return;
          }

          clearMimicaTimeout(result.matchId);
          await emitRoomState(result.roomCode);
          io?.to(result.roomCode).emit(SOCKET_EVENTS.MIMICA_BACK_TO_LOBBY_NAV, {
            roomCode: result.roomCode,
            path: `/room/${result.roomCode}`,
          });
        } catch {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Nao foi possivel voltar ao lobby",
          });
        }
      }
    );

    socket.on(SOCKET_EVENTS.STOP_START, async ({ roomCode, userId }) => {
      const normalizedRoomCode = normalizeRoomCode(roomCode);
      const normalizedUserId = userId.trim();

      if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "Sala ou usuario invalido" });
        return;
      }

      try {
        const result = await startStopMatch(normalizedRoomCode, normalizedUserId);

        if ("error" in result) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
          return;
        }

        await emitRoomState(result.roomCode, result.matchId);
        io?.to(result.roomCode).emit(SOCKET_EVENTS.STOP_STARTED, {
          roomCode: result.roomCode,
          matchId: result.matchId,
          path: `/room/${result.roomCode}/stop`,
        });
        await emitStopState(result.roomCode, result.matchId);
      } catch {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Nao foi possivel iniciar a partida",
        });
      }
    });

    socket.on(
      SOCKET_EVENTS.STOP_BEGIN,
      async ({ roomCode, userId, durationSeconds, totalRounds, categories }) => {
        const normalizedRoomCode = normalizeRoomCode(roomCode);
        const normalizedUserId = userId.trim();
        const normalizedDuration = Number(durationSeconds);
        const normalizedRounds = Number(totalRounds);
        const normalizedCategories = Array.isArray(categories)
          ? categories.filter((category) => stopCategoryKeys.includes(category))
          : [];

        if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Sala ou usuario invalido",
          });
          return;
        }

        if (!stopDurationOptions.includes(normalizedDuration)) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Tempo da rodada invalido",
          });
          return;
        }

        if (!stopRoundOptions.includes(normalizedRounds)) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Numero de rodadas invalido",
          });
          return;
        }

        if (normalizedCategories.length < 2) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Selecione ao menos 2 categorias",
          });
          return;
        }

        try {
          const result = await beginStopRound(
            normalizedRoomCode,
            normalizedUserId,
            normalizedDuration,
            normalizedRounds,
            normalizedCategories
          );

          if ("error" in result) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
            return;
          }

          await emitStopState(result.roomCode, result.matchId);
          await scheduleStopTimeout(result.matchId, result.roomCode);
        } catch {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Nao foi possivel iniciar a rodada",
          });
        }
      }
    );

    socket.on(
      SOCKET_EVENTS.STOP_SUBMIT,
      async ({ roomCode, userId, answers }) => {
        const normalizedRoomCode = normalizeRoomCode(roomCode);
        const normalizedUserId = userId.trim();

        if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Sala ou usuario invalido",
          });
          return;
        }

        try {
          const result = await submitStopAnswers(
            normalizedRoomCode,
            normalizedUserId,
            answers ?? {}
          );

          if ("error" in result) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
            return;
          }

          if (result.phaseChanged) {
            clearStopTimeout(result.matchId);
          }

          await emitStopState(result.roomCode, result.matchId);
        } catch {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Nao foi possivel enviar as respostas",
          });
        }
      }
    );

    socket.on(
      SOCKET_EVENTS.STOP_VOTE,
      async ({ roomCode, userId, targetUserId, category, reject }) => {
        const normalizedRoomCode = normalizeRoomCode(roomCode);
        const normalizedUserId = userId.trim();
        const normalizedTargetUserId =
          typeof targetUserId === "string" ? targetUserId.trim() : "";
        const normalizedCategory =
          typeof category === "string" ? category.trim() : "";

        if (
          !isValidRoomPayload(normalizedRoomCode, normalizedUserId) ||
          !normalizedTargetUserId ||
          !normalizedCategory
        ) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Voto invalido",
          });
          return;
        }

        try {
          const result = await voteStopAnswer(
            normalizedRoomCode,
            normalizedUserId,
            normalizedTargetUserId,
            normalizedCategory,
            Boolean(reject)
          );

          if ("error" in result) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
            return;
          }

          await emitStopState(result.roomCode, result.matchId);
        } catch {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Nao foi possivel registrar o voto",
          });
        }
      }
    );

    socket.on(
      SOCKET_EVENTS.STOP_REVEAL_RESULT,
      async ({ roomCode, userId }) => {
        const normalizedRoomCode = normalizeRoomCode(roomCode);
        const normalizedUserId = userId.trim();

        if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Sala ou usuario invalido",
          });
          return;
        }

        try {
          const result = await revealStopResult(
            normalizedRoomCode,
            normalizedUserId
          );

          if ("error" in result) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
            return;
          }

          await emitStopState(result.roomCode, result.matchId);
        } catch {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Nao foi possivel calcular o resultado",
          });
        }
      }
    );

    socket.on(SOCKET_EVENTS.STOP_NEXT_ROUND, async ({ roomCode, userId }) => {
      const normalizedRoomCode = normalizeRoomCode(roomCode);
      const normalizedUserId = userId.trim();

      if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "Sala ou usuario invalido" });
        return;
      }

      try {
        const result = await advanceStopRound(
          normalizedRoomCode,
          normalizedUserId
        );

        if ("error" in result) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
          return;
        }

        await emitStopState(result.roomCode, result.matchId);

        if (result.scheduleTimer) {
          await scheduleStopTimeout(result.matchId, result.roomCode);
        }
      } catch {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Nao foi possivel iniciar a proxima rodada",
        });
      }
    });

    socket.on(SOCKET_EVENTS.STOP_BACK_TO_LOBBY, async ({ roomCode, userId }) => {
      const normalizedRoomCode = normalizeRoomCode(roomCode);
      const normalizedUserId = userId.trim();

      if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "Sala ou usuario invalido" });
        return;
      }

      try {
        const result = await backStopRoomToLobby(
          normalizedRoomCode,
          normalizedUserId
        );

        if ("error" in result) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
          return;
        }

        clearStopTimeout(result.matchId);
        await emitRoomState(result.roomCode);
        io?.to(result.roomCode).emit(SOCKET_EVENTS.STOP_BACK_TO_LOBBY_NAV, {
          roomCode: result.roomCode,
          path: `/room/${result.roomCode}`,
        });
      } catch {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Nao foi possivel voltar ao lobby",
        });
      }
    });

    socket.on(
      SOCKET_EVENTS.GUESS_WHO_END_ROUND,
      async ({ roomCode, userId }) => {
        const normalizedRoomCode = normalizeRoomCode(roomCode);
        const normalizedUserId = userId.trim();

        if (!isValidRoomPayload(normalizedRoomCode, normalizedUserId)) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Sala ou usuario invalido",
          });
          return;
        }

        try {
          const result = await endGuessWhoRound(
            normalizedRoomCode,
            normalizedUserId
          );

          if ("error" in result) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
            return;
          }

          await emitGuessWhoStates(result.roomCode, result.matchId);
        } catch {
          socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Nao foi possivel encerrar a rodada",
          });
        }
      }
    );

    socket.on("disconnect", async () => {
      const roomCode = socket.data.roomCode;
      const userId = socket.data.userId;

      if (!roomCode || !userId) {
        return;
      }

      await disconnectRoomPlayer(roomCode, userId, socket.id);
    });
  });

  return io;
}

function normalizeRoomCode(roomCode: string) {
  return roomCode.trim();
}

function isValidRoomPayload(roomCode: string, userId: string) {
  return /^\d{6}$/.test(roomCode) && userId.length > 0;
}

const gameSelect = {
  id: true,
  type: true,
  name: true,
  description: true,
  isActive: true,
} as const;

function toGamePayload(game: GamePayload): GamePayload {
  return {
    id: game.id,
    type: game.type,
    name: game.name,
    description: game.description,
    isActive: game.isActive,
  };
}

async function startImpostorMatch(
  roomCode: string,
  hostUserId: string
): Promise<{ error: string } | { roomCode: string; matchId: string }> {
  const initialRoom = await prisma.room.findUnique({
    where: { code: roomCode },
    select: {
      id: true,
      status: true,
      hostId: true,
      selectedGame: {
        select: gameSelect,
      },
      players: {
        where: {
          isConnected: true,
        },
        include: {
          user: true,
        },
        orderBy: {
          joinedAt: "asc",
        },
      },
    },
  });

  const validationError = validateImpostorStartRoom(initialRoom, hostUserId);

  if (validationError) {
    return { error: validationError };
  }

  const selectedWord = await getRandomImpostorWord();

  if (!selectedWord) {
    return { error: "Nao ha palavras ativas para iniciar Impostor" };
  }

  return prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { code: roomCode },
      select: {
        id: true,
        code: true,
        status: true,
        hostId: true,
        selectedGame: {
          select: gameSelect,
        },
        players: {
          where: {
            isConnected: true,
          },
          include: {
            user: true,
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
      },
    });

    const transactionValidationError = validateImpostorStartRoom(
      room,
      hostUserId
    );

    if (transactionValidationError) {
      return { error: transactionValidationError };
    }

    if (!room || !room.selectedGame) {
      return { error: "Sala nao encontrada" };
    }

    const players: ConnectedImpostorPlayer[] = room.players.map((player) => ({
      userId: player.userId,
      nickname: player.user.nickname,
      avatar: player.user.avatar,
    }));
    const impostor = pickImpostorPlayer(players);
    const state: ImpostorMatchState = {
      phase: "reveal",
      category: selectedWord.category,
      word: selectedWord.value,
      impostorUserId: impostor.userId,
      players: players.map((player) => ({
        userId: player.userId,
        nickname: player.nickname,
        avatar: player.avatar,
        isReady: false,
        isAlive: true,
      })),
      hints: [],
      votes: [],
    };

    const match = await tx.match.create({
      data: {
        roomId: room.id,
        gameId: room.selectedGame.id,
        status: "playing",
        state,
        startedAt: new Date(),
      },
      select: {
        id: true,
      },
    });

    await tx.room.update({
      where: { id: room.id },
      data: { status: "playing" },
    });

    return { roomCode: room.code, matchId: match.id };
  });
}

async function markImpostorPlayerReady(
  roomCode: string,
  userId: string
): Promise<ImpostorReadyResult> {
  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findFirst({
      where: {
        status: "playing",
        endedAt: null,
        room: {
          code: roomCode,
          players: {
            some: {
              userId,
            },
          },
        },
        game: {
          is: {
            type: "impostor",
          },
        },
      },
      orderBy: {
        startedAt: "desc",
      },
      select: {
        id: true,
        state: true,
        room: {
          select: {
            code: true,
          },
        },
      },
    });

    if (!match) {
      return { error: "Partida de Impostor nao encontrada" };
    }

    if (!isImpostorMatchState(match.state)) {
      return { error: "Estado da partida invalido" };
    }

    const playerIndex = match.state.players.findIndex(
      (player) => player.userId === userId
    );

    if (playerIndex < 0) {
      return { error: "Voce nao participa desta partida" };
    }

    if (match.state.players[playerIndex].isReady) {
      return {
        readyPayload: toImpostorReadyPayload(
          match.room.code,
          match.id,
          match.state
        ),
        phaseChanged: false,
      };
    }

    const nextPlayers = match.state.players.map((player, index) =>
      index === playerIndex ? { ...player, isReady: true } : player
    );
    const allReady = nextPlayers.every((player) => player.isReady);
    const phaseChanged = allReady && match.state.phase === "reveal";
    const nextState: ImpostorMatchState = {
      ...match.state,
      phase: phaseChanged ? "hints" : match.state.phase,
      players: nextPlayers,
    };

    await tx.match.update({
      where: { id: match.id },
      data: {
        state: nextState,
      },
    });

    return {
      readyPayload: toImpostorReadyPayload(match.room.code, match.id, nextState),
      phaseChanged,
    };
  });
}

async function submitImpostorHint(
  roomCode: string,
  userId: string,
  text: string
): Promise<ImpostorHintResult> {
  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findFirst({
      where: {
        status: "playing",
        endedAt: null,
        room: {
          code: roomCode,
          players: {
            some: {
              userId,
            },
          },
        },
        game: {
          is: {
            type: "impostor",
          },
        },
      },
      orderBy: {
        startedAt: "desc",
      },
      select: {
        id: true,
        state: true,
        room: {
          select: {
            code: true,
          },
        },
      },
    });

    if (!match) {
      return { error: "Partida de Impostor nao encontrada" };
    }

    if (!isImpostorMatchState(match.state)) {
      return { error: "Estado da partida invalido" };
    }

    if (match.state.phase !== "hints") {
      return { error: "Dicas so podem ser enviadas na fase de dicas" };
    }

    const player = match.state.players.find((item) => item.userId === userId);

    if (!player) {
      return { error: "Voce nao participa desta partida" };
    }

    if (match.state.hints.some((hint) => hint.userId === userId)) {
      return { error: "Voce ja enviou sua dica" };
    }

    const currentTurnUserId = getCurrentHintTurnUserId(match.state);

    if (currentTurnUserId !== userId) {
      return { error: "Aguarde sua vez para enviar a dica" };
    }

    const nextHints = [
      ...match.state.hints,
      {
        userId,
        nickname: player.nickname,
        text,
        createdAt: new Date().toISOString(),
      },
    ];
    const allHintsSubmitted = nextHints.length === match.state.players.length;
    const nextState: ImpostorMatchState = {
      ...match.state,
      phase: allHintsSubmitted ? "voting" : "hints",
      hints: nextHints,
    };

    await tx.match.update({
      where: { id: match.id },
      data: {
        state: nextState,
      },
    });

    return {
      readyPayload: toImpostorReadyPayload(match.room.code, match.id, nextState),
      hintsPayload: toImpostorHintsPayload(match.room.code, match.id, nextState),
      turnPayload: toImpostorTurnPayload(match.room.code, match.id, nextState),
      phaseChanged: allHintsSubmitted,
    };
  });
}

async function submitImpostorVote(
  roomCode: string,
  voterUserId: string,
  targetUserId: string
): Promise<ImpostorVoteResult> {
  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findFirst({
      where: {
        status: "playing",
        endedAt: null,
        room: {
          code: roomCode,
          players: {
            some: {
              userId: voterUserId,
            },
          },
        },
        game: {
          is: {
            type: "impostor",
          },
        },
      },
      orderBy: {
        startedAt: "desc",
      },
      select: {
        id: true,
        state: true,
        room: {
          select: {
            code: true,
          },
        },
      },
    });

    if (!match) {
      return { error: "Partida de Impostor nao encontrada" };
    }

    if (!isImpostorMatchState(match.state)) {
      return { error: "Estado da partida invalido" };
    }

    if (match.state.phase !== "voting") {
      return { error: "Votos so podem ser enviados na fase de votacao" };
    }

    const voter = match.state.players.find(
      (player) => player.userId === voterUserId
    );

    if (!voter) {
      return { error: "Voce nao participa desta partida" };
    }

    const target = match.state.players.find(
      (player) => player.userId === targetUserId
    );

    if (!target) {
      return { error: "Voto deve ser em jogador da sala" };
    }

    if (match.state.votes.some((vote) => vote.voterUserId === voterUserId)) {
      return { error: "Voce ja votou" };
    }

    const nextVotes = [
      ...match.state.votes,
      {
        voterUserId,
        targetUserId,
        createdAt: new Date().toISOString(),
      },
    ];
    const allVotesSubmitted = nextVotes.length === match.state.players.length;
    const result = allVotesSubmitted
      ? calculateImpostorResult(match.state, nextVotes)
      : null;
    const nextState: ImpostorMatchState = {
      ...match.state,
      phase: result ? "result" : "voting",
      votes: nextVotes,
      ...(result
        ? {
            result: {
              word: result.word,
              selectedUserId: result.selectedUserId,
              selectedNickname: result.selectedNickname,
              impostorUserId: result.impostorUserId,
              impostorNickname: result.impostorNickname,
              groupWon: result.groupWon,
              tied: result.tied,
              votes: result.votes,
            },
          }
        : {}),
    };

    await tx.match.update({
      where: { id: match.id },
      data: {
        state: nextState,
      },
    });

    return {
      readyPayload: toImpostorReadyPayload(match.room.code, match.id, nextState),
      votesPayload: toImpostorVotesPayload(match.room.code, match.id, nextState),
      resultPayload: result
        ? toImpostorResultPayload(match.room.code, match.id, result)
        : null,
      phaseChanged: Boolean(result),
    };
  });
}

async function createNextImpostorMatch(
  roomCode: string,
  hostUserId: string
): Promise<{ error: string } | { roomCode: string; matchId: string }> {
  return prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { code: roomCode },
      select: {
        id: true,
        code: true,
        status: true,
        hostId: true,
        selectedGame: {
          select: gameSelect,
        },
        players: {
          where: {
            isConnected: true,
          },
          include: {
            user: true,
          },
          orderBy: {
            joinedAt: "asc",
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
          orderBy: {
            startedAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            state: true,
          },
        },
      },
    });

    const validationError = validateImpostorHostActionRoom(room, hostUserId);

    if (validationError) {
      return { error: validationError };
    }

    if (!room || !room.selectedGame) {
      return { error: "Sala nao encontrada" };
    }

    const currentMatch = room.matches.at(0);

    if (
      !currentMatch ||
      !isImpostorMatchState(currentMatch.state) ||
      currentMatch.state.phase !== "result"
    ) {
      return { error: "A partida atual ainda nao terminou" };
    }

    const selectedWord = await getRandomImpostorWordExcept({
      category: currentMatch.state.category,
      value: currentMatch.state.word,
    });

    if (!selectedWord) {
      return { error: "Nao ha palavras ativas para iniciar Impostor" };
    }

    await tx.match.update({
      where: { id: currentMatch.id },
      data: {
        status: "finished",
        endedAt: new Date(),
      },
    });

    const players: ConnectedImpostorPlayer[] = room.players.map((player) => ({
      userId: player.userId,
      nickname: player.user.nickname,
      avatar: player.user.avatar,
    }));
    const impostor = pickImpostorPlayer(
      players,
      currentMatch.state.impostorUserId
    );
    const state: ImpostorMatchState = {
      phase: "reveal",
      category: selectedWord.category,
      word: selectedWord.value,
      impostorUserId: impostor.userId,
      players: players.map((player) => ({
        userId: player.userId,
        nickname: player.nickname,
        avatar: player.avatar,
        isReady: false,
        isAlive: true,
      })),
      hints: [],
      votes: [],
    };

    const match = await tx.match.create({
      data: {
        roomId: room.id,
        gameId: room.selectedGame.id,
        status: "playing",
        state,
        startedAt: new Date(),
      },
      select: {
        id: true,
      },
    });

    await tx.room.update({
      where: { id: room.id },
      data: { status: "playing" },
    });

    return { roomCode: room.code, matchId: match.id };
  });
}

async function backImpostorRoomToLobby(
  roomCode: string,
  hostUserId: string
): Promise<{ error: string } | { roomCode: string }> {
  return prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { code: roomCode },
      select: {
        id: true,
        code: true,
        status: true,
        hostId: true,
        selectedGame: {
          select: gameSelect,
        },
        players: {
          where: {
            isConnected: true,
          },
          select: {
            id: true,
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
          orderBy: {
            startedAt: "desc",
          },
          take: 1,
          select: {
            id: true,
          },
        },
      },
    });

    const validationError = validateImpostorHostActionRoom(room, hostUserId);

    if (validationError) {
      return { error: validationError };
    }

    if (!room) {
      return { error: "Sala nao encontrada" };
    }

    const currentMatch = room.matches.at(0);

    if (currentMatch) {
      await tx.match.update({
        where: { id: currentMatch.id },
        data: {
          status: "finished",
          endedAt: new Date(),
        },
      });
    }

    await tx.room.update({
      where: { id: room.id },
      data: {
        status: "waiting",
      },
    });

    return { roomCode: room.code };
  });
}

async function startGuessWhoMatch(
  roomCode: string,
  hostUserId: string
): Promise<StartGuessWhoResult> {
  const initialRoom = await prisma.room.findUnique({
    where: { code: roomCode },
    select: {
      id: true,
      status: true,
      hostId: true,
      selectedGame: {
        select: gameSelect,
      },
      players: {
        where: {
          isConnected: true,
        },
        include: {
          user: true,
        },
        orderBy: {
          joinedAt: "asc",
        },
      },
    },
  });
  const validationError = validateGuessWhoStartRoom(initialRoom, hostUserId);

  if (validationError) {
    return { error: validationError };
  }

  const selectedCards = await getRandomGuessWhoCards(
    initialRoom?.players.length ?? 0
  );

  if (selectedCards.length < (initialRoom?.players.length ?? 0)) {
    return { error: "Nao ha cartas ativas suficientes para iniciar Quem Sou Eu" };
  }

  return prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { code: roomCode },
      select: {
        id: true,
        code: true,
        status: true,
        hostId: true,
        selectedGame: {
          select: gameSelect,
        },
        players: {
          where: {
            isConnected: true,
          },
          include: {
            user: true,
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
      },
    });
    const transactionValidationError = validateGuessWhoStartRoom(
      room,
      hostUserId
    );

    if (transactionValidationError) {
      return { error: transactionValidationError };
    }

    if (!room || !room.selectedGame) {
      return { error: "Sala nao encontrada" };
    }

    if (selectedCards.length < room.players.length) {
      return {
        error: "Nao ha cartas ativas suficientes para iniciar Quem Sou Eu",
      };
    }

    const players: ConnectedGuessWhoPlayer[] = room.players.map((player) => ({
      userId: player.userId,
      nickname: player.user.nickname,
      avatar: player.user.avatar,
    }));
    const state: GuessWhoMatchState = {
      phase: "playing",
      players: players.map((player, index) => ({
        ...player,
        card: selectedCards[index],
      })),
    };

    const match = await tx.match.create({
      data: {
        roomId: room.id,
        gameId: room.selectedGame.id,
        status: "playing",
        state,
        startedAt: new Date(),
      },
      select: {
        id: true,
      },
    });

    await tx.room.update({
      where: { id: room.id },
      data: {
        status: "playing",
      },
    });

    return { roomCode: room.code, matchId: match.id };
  });
}

async function endGuessWhoRound(
  roomCode: string,
  hostUserId: string
): Promise<EndGuessWhoRoundResult> {
  return prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { code: roomCode },
      select: {
        id: true,
        code: true,
        status: true,
        hostId: true,
        selectedGame: {
          select: gameSelect,
        },
        players: {
          where: {
            isConnected: true,
          },
          select: {
            id: true,
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
          orderBy: {
            startedAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            state: true,
          },
        },
      },
    });
    const validationError = validateGuessWhoHostActionRoom(room, hostUserId);

    if (validationError) {
      return { error: validationError };
    }

    if (!room) {
      return { error: "Sala nao encontrada" };
    }

    const match = room.matches.at(0);

    if (!match || !isGuessWhoMatchState(match.state)) {
      return { error: "Partida de Quem Sou Eu nao encontrada" };
    }

    if (match.state.phase === "result") {
      return { roomCode: room.code, matchId: match.id };
    }

    const nextState: GuessWhoMatchState = {
      ...match.state,
      phase: "result",
    };

    await tx.match.update({
      where: { id: match.id },
      data: {
        state: nextState,
      },
    });

    return { roomCode: room.code, matchId: match.id };
  });
}

const mimicaRoomSelect = {
  id: true,
  code: true,
  status: true,
  hostId: true,
  selectedGame: {
    select: gameSelect,
  },
  players: {
    where: {
      isConnected: true,
    },
    include: {
      user: true,
    },
    orderBy: {
      joinedAt: "asc",
    },
  },
} as const;

const mimicaHostRoomSelect = {
  id: true,
  code: true,
  status: true,
  hostId: true,
  selectedGame: {
    select: gameSelect,
  },
  players: {
    where: {
      isConnected: true,
    },
    select: {
      id: true,
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
    orderBy: {
      startedAt: "desc",
    },
    take: 1,
    select: {
      id: true,
      state: true,
    },
  },
} as const;

async function fetchMimicaWord(
  category: string,
  previousWord: RandomMimicaWord | null
): Promise<RandomMimicaWord | null> {
  const isRandom = !category || category === mimicaRandomCategory;

  if (isRandom) {
    return getRandomMimicaWord();
  }

  return previousWord
    ? getRandomMimicaWordExcept(category, previousWord)
    : getRandomMimicaWord(category);
}

function pickMimicaMimer(
  players: MimicaMatchState["players"],
  roundNumber: number
) {
  if (players.length === 0) {
    return null;
  }

  return players[(roundNumber - 1) % players.length].userId;
}

async function startMimicaMatch(
  roomCode: string,
  hostUserId: string
): Promise<MimicaMutationResult> {
  const initialRoom = await prisma.room.findUnique({
    where: { code: roomCode },
    select: mimicaRoomSelect,
  });
  const validationError = validateMimicaStartRoom(initialRoom, hostUserId);

  if (validationError) {
    return { error: validationError };
  }

  return prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { code: roomCode },
      select: mimicaRoomSelect,
    });
    const transactionValidationError = validateMimicaStartRoom(
      room,
      hostUserId
    );

    if (transactionValidationError) {
      return { error: transactionValidationError };
    }

    if (!room || !room.selectedGame) {
      return { error: "Sala nao encontrada" };
    }

    const players: ConnectedMimicaPlayer[] = room.players.map((player) => ({
      userId: player.userId,
      nickname: player.user.nickname,
      avatar: player.user.avatar,
    }));
    const state: MimicaMatchState = {
      phase: "setup",
      category: null,
      durationSeconds: 60,
      word: null,
      wordCategory: null,
      currentMimerUserId: null,
      roundNumber: 0,
      roundEndsAt: null,
      lastRound: null,
      players: players.map((player) => ({
        userId: player.userId,
        nickname: player.nickname,
        avatar: player.avatar,
        score: 0,
      })),
    };

    const match = await tx.match.create({
      data: {
        roomId: room.id,
        gameId: room.selectedGame.id,
        status: "playing",
        state,
        startedAt: new Date(),
      },
      select: {
        id: true,
      },
    });

    await tx.room.update({
      where: { id: room.id },
      data: { status: "playing" },
    });

    return { roomCode: room.code, matchId: match.id };
  });
}

async function beginMimicaRound(
  roomCode: string,
  hostUserId: string,
  category: string,
  durationSeconds: number
): Promise<MimicaMutationResult> {
  const word = await fetchMimicaWord(category, null);

  if (!word) {
    return { error: "Nao ha palavras ativas para iniciar a Mimica" };
  }

  return prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { code: roomCode },
      select: mimicaHostRoomSelect,
    });
    const validationError = validateMimicaHostActionRoom(room, hostUserId);

    if (validationError) {
      return { error: validationError };
    }

    if (!room) {
      return { error: "Sala nao encontrada" };
    }

    const match = room.matches.at(0);

    if (!match || !isMimicaMatchState(match.state)) {
      return { error: "Partida de Mimica nao encontrada" };
    }

    if (match.state.phase !== "setup") {
      return { error: "A partida ja foi configurada" };
    }

    if (match.state.players.length === 0) {
      return { error: "Sem jogadores conectados na partida" };
    }

    const roundNumber = 1;
    const mimerUserId = pickMimicaMimer(match.state.players, roundNumber);
    const nextState: MimicaMatchState = {
      ...match.state,
      phase: "reveal",
      category:
        category && category.length > 0 ? category : mimicaRandomCategory,
      durationSeconds,
      word: word.value,
      wordCategory: word.category,
      currentMimerUserId: mimerUserId,
      roundNumber,
      roundEndsAt: null,
      lastRound: null,
    };

    await tx.match.update({
      where: { id: match.id },
      data: { state: nextState },
    });

    return { roomCode: room.code, matchId: match.id };
  });
}

async function startMimicaPlay(
  roomCode: string,
  userId: string
): Promise<MimicaMutationResult> {
  return prisma.$transaction(async (tx) => {
    const match = await findActiveMimicaMatch(tx, roomCode, userId);

    if (!match || !isMimicaMatchState(match.state)) {
      return { error: "Partida de Mimica nao encontrada" };
    }

    if (match.state.phase !== "reveal") {
      return { error: "A rodada nao esta na fase de revelacao" };
    }

    if (match.state.currentMimerUserId !== userId) {
      return { error: "Apenas quem faz a mimica pode comecar" };
    }

    const roundEndsAt = new Date(
      Date.now() + match.state.durationSeconds * 1000
    ).toISOString();
    const nextState: MimicaMatchState = {
      ...match.state,
      phase: "playing",
      roundEndsAt,
    };

    await tx.match.update({
      where: { id: match.id },
      data: { state: nextState },
    });

    return { roomCode: match.room.code, matchId: match.id };
  });
}

async function registerMimicaCorrect(
  roomCode: string,
  userId: string
): Promise<MimicaMutationResult> {
  return prisma.$transaction(async (tx) => {
    const match = await findActiveMimicaMatch(tx, roomCode, userId);

    if (!match || !isMimicaMatchState(match.state)) {
      return { error: "Partida de Mimica nao encontrada" };
    }

    if (match.state.phase !== "playing") {
      return { error: "A rodada nao esta em andamento" };
    }

    if (match.state.currentMimerUserId !== userId) {
      return { error: "Apenas quem faz a mimica pode marcar o acerto" };
    }

    const state = match.state;
    const mimer = state.players.find(
      (player) => player.userId === state.currentMimerUserId
    );
    const nextState: MimicaMatchState = {
      ...state,
      phase: "roundResult",
      roundEndsAt: null,
      players: state.players.map((player) =>
        player.userId === state.currentMimerUserId
          ? { ...player, score: player.score + 1 }
          : player
      ),
      lastRound: {
        word: state.word ?? "",
        success: true,
        mimerUserId: state.currentMimerUserId ?? "",
        mimerNickname: mimer?.nickname ?? "",
      },
    };

    await tx.match.update({
      where: { id: match.id },
      data: { state: nextState },
    });

    return { roomCode: match.room.code, matchId: match.id };
  });
}

async function advanceMimicaRound(
  roomCode: string,
  hostUserId: string
): Promise<MimicaMutationResult> {
  const current = await prisma.match.findFirst({
    where: {
      status: "playing",
      endedAt: null,
      room: { code: roomCode },
      game: { is: { type: "mimica" } },
    },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      state: true,
      room: { select: { code: true, hostId: true } },
    },
  });

  if (!current || !isMimicaMatchState(current.state)) {
    return { error: "Partida de Mimica nao encontrada" };
  }

  if (current.room.hostId !== hostUserId) {
    return { error: "Apenas o host pode iniciar a proxima rodada" };
  }

  if (current.state.phase !== "roundResult") {
    return { error: "A rodada atual ainda nao terminou" };
  }

  const previousWord: RandomMimicaWord | null =
    current.state.word && current.state.wordCategory
      ? { category: current.state.wordCategory, value: current.state.word }
      : null;
  const word = await fetchMimicaWord(current.state.category ?? "", previousWord);

  if (!word) {
    return { error: "Nao ha palavras ativas para a Mimica" };
  }

  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findFirst({
      where: {
        status: "playing",
        endedAt: null,
        room: { code: roomCode },
        game: { is: { type: "mimica" } },
      },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        state: true,
        room: { select: { code: true, hostId: true } },
      },
    });

    if (!match || !isMimicaMatchState(match.state)) {
      return { error: "Partida de Mimica nao encontrada" };
    }

    if (match.room.hostId !== hostUserId) {
      return { error: "Apenas o host pode iniciar a proxima rodada" };
    }

    if (match.state.phase !== "roundResult") {
      return { error: "A rodada atual ainda nao terminou" };
    }

    const roundNumber = match.state.roundNumber + 1;
    const mimerUserId = pickMimicaMimer(match.state.players, roundNumber);
    const nextState: MimicaMatchState = {
      ...match.state,
      phase: "reveal",
      word: word.value,
      wordCategory: word.category,
      currentMimerUserId: mimerUserId,
      roundNumber,
      roundEndsAt: null,
      lastRound: null,
    };

    await tx.match.update({
      where: { id: match.id },
      data: { state: nextState },
    });

    return { roomCode: match.room.code, matchId: match.id };
  });
}

async function backMimicaRoomToLobby(
  roomCode: string,
  hostUserId: string
): Promise<MimicaMutationResult> {
  return prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { code: roomCode },
      select: mimicaHostRoomSelect,
    });
    const validationError = validateMimicaHostActionRoom(room, hostUserId);

    if (validationError) {
      return { error: validationError };
    }

    if (!room) {
      return { error: "Sala nao encontrada" };
    }

    const match = room.matches.at(0);

    if (match) {
      await tx.match.update({
        where: { id: match.id },
        data: {
          status: "finished",
          endedAt: new Date(),
        },
      });
    }

    await tx.room.update({
      where: { id: room.id },
      data: { status: "waiting" },
    });

    return { roomCode: room.code, matchId: match?.id ?? "" };
  });
}

function findActiveMimicaMatch(
  tx: SocketServerTransaction,
  roomCode: string,
  userId: string
) {
  return tx.match.findFirst({
    where: {
      status: "playing",
      endedAt: null,
      room: {
        code: roomCode,
        players: {
          some: {
            userId,
          },
        },
      },
      game: {
        is: {
          type: "mimica",
        },
      },
    },
    orderBy: {
      startedAt: "desc",
    },
    select: {
      id: true,
      state: true,
      room: {
        select: {
          code: true,
        },
      },
    },
  });
}

function validateMimicaStartRoom(
  room: {
    status: string;
    hostId: string;
    selectedGame: GamePayload | null;
    players: unknown[];
  } | null,
  hostUserId: string
) {
  if (!room) {
    return "Sala nao encontrada";
  }

  if (room.hostId !== hostUserId) {
    return "Apenas o host pode iniciar a partida";
  }

  if (room.status !== "waiting") {
    return "A partida ja foi iniciada";
  }

  if (!room.selectedGame) {
    return "Escolha um jogo antes de iniciar";
  }

  if (room.selectedGame.type !== "mimica") {
    return "O inicio desta partida esta disponivel apenas para Mimica";
  }

  if (!room.selectedGame.isActive) {
    return "O jogo selecionado ainda nao esta disponivel";
  }

  if (room.players.length < minimumPlayersToStart) {
    return `A partida precisa de pelo menos ${minimumPlayersToStart} jogadores`;
  }

  return null;
}

function validateMimicaHostActionRoom(
  room: {
    hostId: string;
    selectedGame: GamePayload | null;
  } | null,
  hostUserId: string
) {
  if (!room) {
    return "Sala nao encontrada";
  }

  if (room.hostId !== hostUserId) {
    return "Apenas o host pode controlar a partida";
  }

  if (!room.selectedGame || room.selectedGame.type !== "mimica") {
    return "Essa acao esta disponivel apenas para Mimica";
  }

  if (!room.selectedGame.isActive) {
    return "O jogo selecionado ainda nao esta disponivel";
  }

  return null;
}

async function scheduleMimicaTimeout(matchId: string, roomCode: string) {
  clearMimicaTimeout(matchId);

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { state: true },
  });

  if (!match || !isMimicaMatchState(match.state)) {
    return;
  }

  if (match.state.phase !== "playing" || !match.state.roundEndsAt) {
    return;
  }

  const delay = new Date(match.state.roundEndsAt).getTime() - Date.now();
  const timer = setTimeout(() => {
    void expireMimicaRound(matchId, roomCode);
  }, Math.max(0, delay));

  mimicaTimers.set(matchId, timer);
}

function clearMimicaTimeout(matchId: string) {
  const timer = mimicaTimers.get(matchId);

  if (timer) {
    clearTimeout(timer);
    mimicaTimers.delete(matchId);
  }
}

async function expireMimicaRound(matchId: string, roomCode: string) {
  mimicaTimers.delete(matchId);

  try {
    const changed = await prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: matchId },
        select: { id: true, state: true },
      });

      if (!match || !isMimicaMatchState(match.state)) {
        return false;
      }

      if (match.state.phase !== "playing") {
        return false;
      }

      const state = match.state;
      const mimer = state.players.find(
        (player) => player.userId === state.currentMimerUserId
      );
      const nextState: MimicaMatchState = {
        ...state,
        phase: "roundResult",
        roundEndsAt: null,
        lastRound: {
          word: state.word ?? "",
          success: false,
          mimerUserId: state.currentMimerUserId ?? "",
          mimerNickname: mimer?.nickname ?? "",
        },
      };

      await tx.match.update({
        where: { id: match.id },
        data: { state: nextState },
      });

      return true;
    });

    if (changed) {
      await emitMimicaState(roomCode, matchId);
    }
  } catch {
    return;
  }
}

function toMimicaStatePayload(
  roomCode: string,
  matchId: string,
  state: MimicaMatchState,
  userId: string,
  hostId: string
): MimicaStatePayload {
  const currentMimer = state.players.find(
    (player) => player.userId === state.currentMimerUserId
  );

  return {
    roomCode,
    matchId,
    phase: state.phase,
    category: state.category,
    durationSeconds: state.durationSeconds,
    roundNumber: state.roundNumber,
    roundEndsAt: state.roundEndsAt,
    currentMimerUserId: state.currentMimerUserId,
    currentMimerNickname: currentMimer?.nickname ?? null,
    isHost: hostId === userId,
    isCurrentMimer: state.currentMimerUserId === userId,
    players: state.players.map((player) => ({
      userId: player.userId,
      nickname: player.nickname,
      avatar: player.avatar,
      score: player.score,
      isCurrentMimer: player.userId === state.currentMimerUserId,
    })),
    lastRound: state.lastRound
      ? {
          word: state.lastRound.word,
          success: state.lastRound.success,
          mimerUserId: state.lastRound.mimerUserId,
          mimerNickname: state.lastRound.mimerNickname,
        }
      : null,
  };
}

async function getMimicaStatePayload(
  roomCode: string,
  userId: string,
  matchId?: string
): Promise<MimicaStatePayload | null> {
  const match = await prisma.match.findFirst({
    where: {
      ...(matchId ? { id: matchId } : {}),
      status: "playing",
      endedAt: null,
      room: {
        code: roomCode,
      },
      game: {
        is: {
          type: "mimica",
        },
      },
    },
    orderBy: {
      startedAt: "desc",
    },
    select: {
      id: true,
      state: true,
      room: {
        select: {
          code: true,
          hostId: true,
        },
      },
    },
  });

  if (!match || !isMimicaMatchState(match.state)) {
    return null;
  }

  return toMimicaStatePayload(
    match.room.code,
    match.id,
    match.state,
    userId,
    match.room.hostId
  );
}

async function emitMimicaState(roomCode: string, matchId?: string) {
  const sockets = await io?.in(roomCode).fetchSockets();

  if (!sockets) {
    return;
  }

  for (const roomSocket of sockets) {
    const userId = roomSocket.data.userId;

    if (!userId) {
      continue;
    }

    const payload = await getMimicaStatePayload(roomCode, userId, matchId);

    if (!payload) {
      continue;
    }

    roomSocket.emit(SOCKET_EVENTS.MIMICA_STATE_UPDATED, payload);

    if (payload.phase === "playing" && !mimicaTimers.has(payload.matchId)) {
      await scheduleMimicaTimeout(payload.matchId, roomCode);
    }
  }
}

async function emitMimicaStateToSocket(
  socket: RoleSocket,
  roomCode: string,
  userId: string
) {
  const payload = await getMimicaStatePayload(roomCode, userId);

  if (!payload) {
    return;
  }

  socket.emit(SOCKET_EVENTS.MIMICA_STATE_UPDATED, payload);

  if (payload.phase === "playing" && !mimicaTimers.has(payload.matchId)) {
    await scheduleMimicaTimeout(payload.matchId, roomCode);
  }
}

async function emitMimicaPrivateWordToMimer(roomCode: string, matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, state: true },
  });

  if (!match || !isMimicaMatchState(match.state)) {
    return;
  }

  if (
    match.state.phase !== "reveal" ||
    !match.state.word ||
    !match.state.currentMimerUserId
  ) {
    return;
  }

  const sockets = await io?.in(roomCode).fetchSockets();

  if (!sockets) {
    return;
  }

  for (const roomSocket of sockets) {
    if (roomSocket.data.userId === match.state.currentMimerUserId) {
      roomSocket.emit(SOCKET_EVENTS.MIMICA_PRIVATE_WORD, {
        roomCode,
        matchId: match.id,
        category: match.state.wordCategory ?? match.state.category ?? "",
        word: match.state.word,
      });
    }
  }
}

async function emitMimicaPrivateWordToSocket(
  socket: RoleSocket,
  roomCode: string,
  userId: string
) {
  const match = await prisma.match.findFirst({
    where: {
      status: "playing",
      endedAt: null,
      room: { code: roomCode },
      game: { is: { type: "mimica" } },
    },
    orderBy: { startedAt: "desc" },
    select: { id: true, state: true },
  });

  if (!match || !isMimicaMatchState(match.state)) {
    return;
  }

  if (
    match.state.phase !== "reveal" ||
    match.state.currentMimerUserId !== userId ||
    !match.state.word
  ) {
    return;
  }

  socket.emit(SOCKET_EVENTS.MIMICA_PRIVATE_WORD, {
    roomCode,
    matchId: match.id,
    category: match.state.wordCategory ?? match.state.category ?? "",
    word: match.state.word,
  });
}

function isMimicaMatchState(state: unknown): state is MimicaMatchState {
  if (!state || typeof state !== "object") {
    return false;
  }

  const candidate = state as Partial<MimicaMatchState>;

  return (
    (candidate.phase === "setup" ||
      candidate.phase === "reveal" ||
      candidate.phase === "playing" ||
      candidate.phase === "roundResult") &&
    typeof candidate.durationSeconds === "number" &&
    typeof candidate.roundNumber === "number" &&
    Array.isArray(candidate.players)
  );
}

const stopHostRoomSelect = {
  id: true,
  code: true,
  status: true,
  hostId: true,
  selectedGame: {
    select: gameSelect,
  },
  players: {
    where: {
      isConnected: true,
    },
    select: {
      id: true,
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
    orderBy: {
      startedAt: "desc",
    },
    take: 1,
    select: {
      id: true,
      state: true,
    },
  },
} as const;

function buildEmptyStopSubmissions(players: StopMatchState["players"]) {
  const submissions: StopMatchState["submissions"] = {};

  for (const player of players) {
    submissions[player.userId] = { submitted: false, answers: {} };
  }

  return submissions;
}

async function startStopMatch(
  roomCode: string,
  hostUserId: string
): Promise<StopMutationResult> {
  const initialRoom = await prisma.room.findUnique({
    where: { code: roomCode },
    select: mimicaRoomSelect,
  });
  const validationError = validateStopStartRoom(initialRoom, hostUserId);

  if (validationError) {
    return { error: validationError };
  }

  return prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { code: roomCode },
      select: mimicaRoomSelect,
    });
    const transactionValidationError = validateStopStartRoom(room, hostUserId);

    if (transactionValidationError) {
      return { error: transactionValidationError };
    }

    if (!room || !room.selectedGame) {
      return { error: "Sala nao encontrada" };
    }

    const players: ConnectedStopPlayer[] = room.players.map((player) => ({
      userId: player.userId,
      nickname: player.user.nickname,
      avatar: player.user.avatar,
    }));
    const state: StopMatchState = {
      phase: "setup",
      durationSeconds: 60,
      totalRounds: 5,
      roundNumber: 0,
      categories: [...stopCategoryKeys],
      letter: null,
      roundEndsAt: null,
      players: players.map((player) => ({
        userId: player.userId,
        nickname: player.nickname,
        avatar: player.avatar,
        totalScore: 0,
      })),
      submissions: {},
      rejections: {},
      roundScores: null,
    };

    const match = await tx.match.create({
      data: {
        roomId: room.id,
        gameId: room.selectedGame.id,
        status: "playing",
        state,
        startedAt: new Date(),
      },
      select: { id: true },
    });

    await tx.room.update({
      where: { id: room.id },
      data: { status: "playing" },
    });

    return { roomCode: room.code, matchId: match.id };
  });
}

async function beginStopRound(
  roomCode: string,
  hostUserId: string,
  durationSeconds: number,
  totalRounds: number,
  categories: string[]
): Promise<StopMutationResult> {
  return prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { code: roomCode },
      select: stopHostRoomSelect,
    });
    const validationError = validateStopHostActionRoom(room, hostUserId);

    if (validationError) {
      return { error: validationError };
    }

    if (!room) {
      return { error: "Sala nao encontrada" };
    }

    const match = room.matches.at(0);

    if (!match || !isStopMatchState(match.state)) {
      return { error: "Partida de Stop nao encontrada" };
    }

    if (match.state.phase !== "setup") {
      return { error: "A partida ja foi configurada" };
    }

    const letter = drawStopLetter();
    const roundEndsAt = new Date(
      Date.now() + durationSeconds * 1000
    ).toISOString();
    const nextState: StopMatchState = {
      ...match.state,
      phase: "playing",
      durationSeconds,
      totalRounds,
      categories,
      roundNumber: 1,
      letter,
      roundEndsAt,
      submissions: buildEmptyStopSubmissions(match.state.players),
      rejections: {},
      roundScores: null,
    };

    await tx.match.update({
      where: { id: match.id },
      data: { state: nextState },
    });

    return { roomCode: room.code, matchId: match.id };
  });
}

async function submitStopAnswers(
  roomCode: string,
  userId: string,
  answers: Record<string, string>
): Promise<
  { error: string } | { roomCode: string; matchId: string; phaseChanged: boolean }
> {
  return prisma.$transaction(async (tx) => {
    const match = await findActiveStopMatch(tx, roomCode, userId);

    if (!match || !isStopMatchState(match.state)) {
      return { error: "Partida de Stop nao encontrada" };
    }

    if (match.state.phase !== "playing") {
      return { error: "A rodada nao esta em andamento" };
    }

    const state = match.state;

    if (!state.players.some((player) => player.userId === userId)) {
      return { error: "Voce nao participa desta partida" };
    }

    if (state.submissions[userId]?.submitted) {
      return { roomCode: match.room.code, matchId: match.id, phaseChanged: false };
    }

    const sanitizedAnswers: Record<string, string> = {};

    for (const category of state.categories) {
      const value = answers[category];
      sanitizedAnswers[category] =
        typeof value === "string" ? value.slice(0, 40) : "";
    }

    const submissions: StopMatchState["submissions"] = {
      ...state.submissions,
      [userId]: { submitted: true, answers: sanitizedAnswers },
    };
    const allSubmitted = state.players.every(
      (player) => submissions[player.userId]?.submitted
    );
    const nextState: StopMatchState = {
      ...state,
      submissions,
      phase: allSubmitted ? "review" : "playing",
      roundEndsAt: allSubmitted ? null : state.roundEndsAt,
    };

    await tx.match.update({
      where: { id: match.id },
      data: { state: nextState },
    });

    return {
      roomCode: match.room.code,
      matchId: match.id,
      phaseChanged: allSubmitted,
    };
  });
}

async function voteStopAnswer(
  roomCode: string,
  voterUserId: string,
  targetUserId: string,
  category: string,
  reject: boolean
): Promise<StopMutationResult> {
  return prisma.$transaction(async (tx) => {
    const match = await findActiveStopMatch(tx, roomCode, voterUserId);

    if (!match || !isStopMatchState(match.state)) {
      return { error: "Partida de Stop nao encontrada" };
    }

    const state = match.state;

    if (state.phase !== "review") {
      return { error: "A votacao nao esta disponivel agora" };
    }

    if (voterUserId === targetUserId) {
      return { error: "Nao e possivel votar na propria resposta" };
    }

    if (!state.players.some((player) => player.userId === targetUserId)) {
      return { error: "Jogador invalido" };
    }

    if (!state.categories.includes(category)) {
      return { error: "Categoria invalida" };
    }

    const key = rejectionKey(targetUserId, category);
    const currentVoters = state.rejections[key] ?? [];
    const alreadyVoted = currentVoters.includes(voterUserId);
    let nextVoters = currentVoters;

    if (reject && !alreadyVoted) {
      nextVoters = [...currentVoters, voterUserId];
    } else if (!reject && alreadyVoted) {
      nextVoters = currentVoters.filter((voter) => voter !== voterUserId);
    }

    const rejections: StopMatchState["rejections"] = { ...state.rejections };

    if (nextVoters.length === 0) {
      delete rejections[key];
    } else {
      rejections[key] = nextVoters;
    }

    const nextState: StopMatchState = { ...state, rejections };

    await tx.match.update({
      where: { id: match.id },
      data: { state: nextState },
    });

    return { roomCode: match.room.code, matchId: match.id };
  });
}

async function revealStopResult(
  roomCode: string,
  hostUserId: string
): Promise<StopMutationResult> {
  return prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { code: roomCode },
      select: stopHostRoomSelect,
    });
    const validationError = validateStopHostActionRoom(room, hostUserId);

    if (validationError) {
      return { error: validationError };
    }

    if (!room) {
      return { error: "Sala nao encontrada" };
    }

    const match = room.matches.at(0);

    if (!match || !isStopMatchState(match.state)) {
      return { error: "Partida de Stop nao encontrada" };
    }

    const state = match.state;

    if (state.phase !== "review") {
      return { error: "A rodada nao esta em revisao" };
    }

    const { roundScores } = computeStopScores({
      letter: state.letter,
      categories: state.categories,
      players: state.players,
      submissions: state.submissions,
      rejections: state.rejections,
    });
    const nextState: StopMatchState = {
      ...state,
      phase: "roundResult",
      players: state.players.map((player) => ({
        ...player,
        totalScore: player.totalScore + (roundScores[player.userId] ?? 0),
      })),
      roundScores,
    };

    await tx.match.update({
      where: { id: match.id },
      data: { state: nextState },
    });

    return { roomCode: room.code, matchId: match.id };
  });
}

async function advanceStopRound(
  roomCode: string,
  hostUserId: string
): Promise<
  | { error: string }
  | { roomCode: string; matchId: string; scheduleTimer: boolean }
> {
  return prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { code: roomCode },
      select: stopHostRoomSelect,
    });
    const validationError = validateStopHostActionRoom(room, hostUserId);

    if (validationError) {
      return { error: validationError };
    }

    if (!room) {
      return { error: "Sala nao encontrada" };
    }

    const match = room.matches.at(0);

    if (!match || !isStopMatchState(match.state)) {
      return { error: "Partida de Stop nao encontrada" };
    }

    const state = match.state;

    if (state.phase !== "roundResult") {
      return { error: "A rodada atual ainda nao terminou" };
    }

    if (state.roundNumber >= state.totalRounds) {
      const finishedState: StopMatchState = {
        ...state,
        phase: "finished",
        roundEndsAt: null,
      };

      await tx.match.update({
        where: { id: match.id },
        data: { state: finishedState },
      });

      return { roomCode: room.code, matchId: match.id, scheduleTimer: false };
    }

    const letter = drawStopLetter(state.letter);
    const roundNumber = state.roundNumber + 1;
    const roundEndsAt = new Date(
      Date.now() + state.durationSeconds * 1000
    ).toISOString();
    const nextState: StopMatchState = {
      ...state,
      phase: "playing",
      roundNumber,
      letter,
      roundEndsAt,
      submissions: buildEmptyStopSubmissions(state.players),
      rejections: {},
      roundScores: null,
    };

    await tx.match.update({
      where: { id: match.id },
      data: { state: nextState },
    });

    return { roomCode: room.code, matchId: match.id, scheduleTimer: true };
  });
}

async function backStopRoomToLobby(
  roomCode: string,
  hostUserId: string
): Promise<StopMutationResult> {
  return prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { code: roomCode },
      select: stopHostRoomSelect,
    });
    const validationError = validateStopHostActionRoom(room, hostUserId);

    if (validationError) {
      return { error: validationError };
    }

    if (!room) {
      return { error: "Sala nao encontrada" };
    }

    const match = room.matches.at(0);

    if (match) {
      await tx.match.update({
        where: { id: match.id },
        data: {
          status: "finished",
          endedAt: new Date(),
        },
      });
    }

    await tx.room.update({
      where: { id: room.id },
      data: { status: "waiting" },
    });

    return { roomCode: room.code, matchId: match?.id ?? "" };
  });
}

function findActiveStopMatch(
  tx: SocketServerTransaction,
  roomCode: string,
  userId: string
) {
  return tx.match.findFirst({
    where: {
      status: "playing",
      endedAt: null,
      room: {
        code: roomCode,
        players: {
          some: {
            userId,
          },
        },
      },
      game: {
        is: {
          type: "stop",
        },
      },
    },
    orderBy: {
      startedAt: "desc",
    },
    select: {
      id: true,
      state: true,
      room: {
        select: {
          code: true,
        },
      },
    },
  });
}

function validateStopStartRoom(
  room: {
    status: string;
    hostId: string;
    selectedGame: GamePayload | null;
    players: unknown[];
  } | null,
  hostUserId: string
) {
  if (!room) {
    return "Sala nao encontrada";
  }

  if (room.hostId !== hostUserId) {
    return "Apenas o host pode iniciar a partida";
  }

  if (room.status !== "waiting") {
    return "A partida ja foi iniciada";
  }

  if (!room.selectedGame) {
    return "Escolha um jogo antes de iniciar";
  }

  if (room.selectedGame.type !== "stop") {
    return "O inicio desta partida esta disponivel apenas para Stop";
  }

  if (!room.selectedGame.isActive) {
    return "O jogo selecionado ainda nao esta disponivel";
  }

  if (room.players.length < minimumPlayersToStart) {
    return `A partida precisa de pelo menos ${minimumPlayersToStart} jogadores`;
  }

  return null;
}

function validateStopHostActionRoom(
  room: {
    hostId: string;
    selectedGame: GamePayload | null;
  } | null,
  hostUserId: string
) {
  if (!room) {
    return "Sala nao encontrada";
  }

  if (room.hostId !== hostUserId) {
    return "Apenas o host pode controlar a partida";
  }

  if (!room.selectedGame || room.selectedGame.type !== "stop") {
    return "Essa acao esta disponivel apenas para Stop";
  }

  if (!room.selectedGame.isActive) {
    return "O jogo selecionado ainda nao esta disponivel";
  }

  return null;
}

async function scheduleStopTimeout(matchId: string, roomCode: string) {
  clearStopTimeout(matchId);

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { state: true },
  });

  if (!match || !isStopMatchState(match.state)) {
    return;
  }

  if (match.state.phase !== "playing" || !match.state.roundEndsAt) {
    return;
  }

  const delay =
    new Date(match.state.roundEndsAt).getTime() - Date.now() + stopTimerGraceMs;
  const timer = setTimeout(() => {
    void expireStopRound(matchId, roomCode);
  }, Math.max(0, delay));

  stopTimers.set(matchId, timer);
}

function clearStopTimeout(matchId: string) {
  const timer = stopTimers.get(matchId);

  if (timer) {
    clearTimeout(timer);
    stopTimers.delete(matchId);
  }
}

async function expireStopRound(matchId: string, roomCode: string) {
  stopTimers.delete(matchId);

  try {
    const changed = await prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: matchId },
        select: { id: true, state: true },
      });

      if (!match || !isStopMatchState(match.state)) {
        return false;
      }

      if (match.state.phase !== "playing") {
        return false;
      }

      const state = match.state;
      const submissions: StopMatchState["submissions"] = { ...state.submissions };

      for (const player of state.players) {
        const existing = submissions[player.userId];

        submissions[player.userId] = {
          submitted: true,
          answers: existing?.answers ?? {},
        };
      }

      const nextState: StopMatchState = {
        ...state,
        phase: "review",
        roundEndsAt: null,
        submissions,
      };

      await tx.match.update({
        where: { id: match.id },
        data: { state: nextState },
      });

      return true;
    });

    if (changed) {
      await emitStopState(roomCode, matchId);
    }
  } catch {
    return;
  }
}

function buildStopReview(
  state: StopMatchState,
  userId: string
): StopReviewCategoryPayload[] {
  const { detail } = computeStopScores({
    letter: state.letter,
    categories: state.categories,
    players: state.players,
    submissions: state.submissions,
    rejections: state.rejections,
  });

  return detail.map((category) => ({
    key: category.key,
    label: getStopCategoryLabel(category.key),
    answers: category.entries.map((entry) => {
      const voters = state.rejections[rejectionKey(entry.userId, category.key)] ?? [];

      return {
        userId: entry.userId,
        nickname: entry.nickname,
        answer: entry.answer,
        points: entry.points,
        status: entry.status,
        rejectCount: voters.length,
        rejectedByMe: voters.includes(userId),
      };
    }),
  }));
}

function buildStopRanking(
  state: StopMatchState,
  byRound: boolean
): StopRankingEntryPayload[] {
  const entries = state.players.map((player) => ({
    userId: player.userId,
    nickname: player.nickname,
    avatar: player.avatar,
    roundScore: state.roundScores?.[player.userId] ?? 0,
    totalScore: player.totalScore,
  }));

  entries.sort((first, second) =>
    byRound
      ? second.roundScore - first.roundScore ||
        second.totalScore - first.totalScore
      : second.totalScore - first.totalScore ||
        second.roundScore - first.roundScore
  );

  return entries.map((entry, index) => ({
    position: index + 1,
    ...entry,
  }));
}

function toStopStatePayload(
  roomCode: string,
  matchId: string,
  state: StopMatchState,
  userId: string,
  hostId: string
): StopStatePayload {
  const showReview = state.phase === "review" || state.phase === "roundResult";
  const ranking =
    state.phase === "roundResult"
      ? buildStopRanking(state, true)
      : state.phase === "finished"
        ? buildStopRanking(state, false)
        : null;

  return {
    roomCode,
    matchId,
    phase: state.phase,
    durationSeconds: state.durationSeconds,
    totalRounds: state.totalRounds,
    roundNumber: state.roundNumber,
    categories: state.categories.map((key) => ({
      key,
      label: getStopCategoryLabel(key),
    })),
    letter: state.phase === "setup" ? null : state.letter,
    roundEndsAt: state.roundEndsAt,
    isHost: hostId === userId,
    hasSubmitted: Boolean(state.submissions[userId]?.submitted),
    players: state.players.map((player) => ({
      userId: player.userId,
      nickname: player.nickname,
      avatar: player.avatar,
      totalScore: player.totalScore,
      submitted: Boolean(state.submissions[player.userId]?.submitted),
    })),
    review: showReview ? buildStopReview(state, userId) : null,
    ranking,
    isFinal: state.phase === "finished",
  };
}

async function getStopStatePayload(
  roomCode: string,
  userId: string,
  matchId?: string
): Promise<StopStatePayload | null> {
  const match = await prisma.match.findFirst({
    where: {
      ...(matchId ? { id: matchId } : {}),
      status: "playing",
      endedAt: null,
      room: {
        code: roomCode,
      },
      game: {
        is: {
          type: "stop",
        },
      },
    },
    orderBy: {
      startedAt: "desc",
    },
    select: {
      id: true,
      state: true,
      room: {
        select: {
          code: true,
          hostId: true,
        },
      },
    },
  });

  if (!match || !isStopMatchState(match.state)) {
    return null;
  }

  return toStopStatePayload(
    match.room.code,
    match.id,
    match.state,
    userId,
    match.room.hostId
  );
}

async function emitStopState(roomCode: string, matchId?: string) {
  const sockets = await io?.in(roomCode).fetchSockets();

  if (!sockets) {
    return;
  }

  for (const roomSocket of sockets) {
    const userId = roomSocket.data.userId;

    if (!userId) {
      continue;
    }

    const payload = await getStopStatePayload(roomCode, userId, matchId);

    if (!payload) {
      continue;
    }

    roomSocket.emit(SOCKET_EVENTS.STOP_STATE_UPDATED, payload);

    if (payload.phase === "playing" && !stopTimers.has(payload.matchId)) {
      await scheduleStopTimeout(payload.matchId, roomCode);
    }
  }
}

async function emitStopStateToSocket(
  socket: RoleSocket,
  roomCode: string,
  userId: string
) {
  const payload = await getStopStatePayload(roomCode, userId);

  if (!payload) {
    return;
  }

  socket.emit(SOCKET_EVENTS.STOP_STATE_UPDATED, payload);

  if (payload.phase === "playing" && !stopTimers.has(payload.matchId)) {
    await scheduleStopTimeout(payload.matchId, roomCode);
  }
}

function isStopMatchState(state: unknown): state is StopMatchState {
  if (!state || typeof state !== "object") {
    return false;
  }

  const candidate = state as Partial<StopMatchState>;

  return (
    (candidate.phase === "setup" ||
      candidate.phase === "playing" ||
      candidate.phase === "review" ||
      candidate.phase === "roundResult" ||
      candidate.phase === "finished") &&
    typeof candidate.durationSeconds === "number" &&
    typeof candidate.totalRounds === "number" &&
    typeof candidate.roundNumber === "number" &&
    Array.isArray(candidate.categories) &&
    Array.isArray(candidate.players) &&
    typeof candidate.submissions === "object" &&
    candidate.submissions !== null &&
    typeof candidate.rejections === "object" &&
    candidate.rejections !== null
  );
}

function validateImpostorStartRoom(
  room: {
    status: string;
    hostId: string;
    selectedGame: GamePayload | null;
    players: unknown[];
  } | null,
  hostUserId: string
) {
  if (!room) {
    return "Sala nao encontrada";
  }

  if (room.hostId !== hostUserId) {
    return "Apenas o host pode iniciar a partida";
  }

  if (room.status !== "waiting") {
    return "A partida ja foi iniciada";
  }

  if (!room.selectedGame) {
    return "Escolha um jogo antes de iniciar";
  }

  if (room.selectedGame.type !== "impostor") {
    return "O inicio desta partida esta disponivel apenas para Impostor";
  }

  if (!room.selectedGame.isActive) {
    return "O jogo selecionado ainda nao esta disponivel";
  }

  if (room.players.length < minimumPlayersToStart) {
    return `A partida precisa de pelo menos ${minimumPlayersToStart} jogadores`;
  }

  return null;
}

function validateImpostorHostActionRoom(
  room: {
    status: string;
    hostId: string;
    selectedGame: GamePayload | null;
    players: unknown[];
  } | null,
  hostUserId: string
) {
  if (!room) {
    return "Sala nao encontrada";
  }

  if (room.hostId !== hostUserId) {
    return "Apenas o host pode controlar a partida";
  }

  if (!room.selectedGame || room.selectedGame.type !== "impostor") {
    return "Essa acao esta disponivel apenas para Impostor";
  }

  if (!room.selectedGame.isActive) {
    return "O jogo selecionado ainda nao esta disponivel";
  }

  if (room.players.length < minimumPlayersToStart) {
    return `A sala precisa de pelo menos ${minimumPlayersToStart} jogadores conectados`;
  }

  return null;
}

function validateGuessWhoStartRoom(
  room: {
    status: string;
    hostId: string;
    selectedGame: GamePayload | null;
    players: unknown[];
  } | null,
  hostUserId: string
) {
  if (!room) {
    return "Sala nao encontrada";
  }

  if (room.hostId !== hostUserId) {
    return "Apenas o host pode iniciar a partida";
  }

  if (room.status !== "waiting") {
    return "A partida ja foi iniciada";
  }

  if (!room.selectedGame) {
    return "Escolha um jogo antes de iniciar";
  }

  if (room.selectedGame.type === "impostor") {
    return "Inicie Impostor pelo evento impostor:start";
  }

  if (room.selectedGame.type !== "quem-sou-eu") {
    return "Esse jogo ainda nao esta implementado";
  }

  if (!room.selectedGame.isActive) {
    return "O jogo selecionado ainda nao esta disponivel";
  }

  if (room.players.length < minimumPlayersToStart) {
    return `A partida precisa de pelo menos ${minimumPlayersToStart} jogadores`;
  }

  return null;
}

function validateGuessWhoHostActionRoom(
  room: {
    hostId: string;
    selectedGame: GamePayload | null;
  } | null,
  hostUserId: string
) {
  if (!room) {
    return "Sala nao encontrada";
  }

  if (room.hostId !== hostUserId) {
    return "Apenas o host pode controlar a partida";
  }

  if (!room.selectedGame || room.selectedGame.type !== "quem-sou-eu") {
    return "Essa acao esta disponivel apenas para Quem Sou Eu";
  }

  if (!room.selectedGame.isActive) {
    return "O jogo selecionado ainda nao esta disponivel";
  }

  return null;
}

async function disconnectRoomPlayer(
  roomCode: string,
  userId: string,
  socketId: string
) {
  try {
    await prisma.$transaction(async (tx) => {
      const roomPlayer = await findRoomPlayer(tx, roomCode, userId);

      if (!roomPlayer || roomPlayer.socketId !== socketId) {
        return;
      }

      await tx.roomPlayer.update({
        where: { id: roomPlayer.id },
        data: {
          socketId: null,
          isConnected: false,
        },
      });

      if (roomPlayer.isHost) {
        await transferHost(tx, roomPlayer.roomId);
      }
    });

    await emitRoomState(roomCode);
  } catch {
    return;
  }
}

async function leaveRoom(roomCode: string, userId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const roomPlayer = await findRoomPlayer(tx, roomCode, userId);

      if (!roomPlayer) {
        return;
      }

      await tx.roomPlayer.update({
        where: { id: roomPlayer.id },
        data: {
          socketId: null,
          isConnected: false,
        },
      });

      if (roomPlayer.isHost) {
        await transferHost(tx, roomPlayer.roomId);
      }
    });

    await emitRoomState(roomCode);
  } catch {
    return;
  }
}

async function findRoomPlayer(
  tx: SocketServerTransaction,
  roomCode: string,
  userId: string
) {
  const room = await tx.room.findUnique({
    where: { code: roomCode },
    select: { id: true },
  });

  if (!room) {
    return null;
  }

  return tx.roomPlayer.findUnique({
    where: {
      roomId_userId: {
        roomId: room.id,
        userId,
      },
    },
    select: {
      id: true,
      roomId: true,
      socketId: true,
      isHost: true,
    },
  });
}

async function transferHost(tx: SocketServerTransaction, roomId: string) {
  const nextHost = await tx.roomPlayer.findFirst({
    where: {
      roomId,
      isConnected: true,
    },
    orderBy: {
      joinedAt: "asc",
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!nextHost) {
    return null;
  }

  await tx.roomPlayer.updateMany({
    where: { roomId },
    data: { isHost: false },
  });

  await tx.roomPlayer.update({
    where: { id: nextHost.id },
    data: { isHost: true },
  });

  await tx.room.update({
    where: { id: roomId },
    data: { hostId: nextHost.userId },
  });

  return nextHost.userId;
}

async function emitGuessWhoStates(roomCode: string, matchId?: string) {
  const sockets = await io?.in(roomCode).fetchSockets();

  if (!sockets) {
    return;
  }

  for (const roomSocket of sockets) {
    const userId = roomSocket.data.userId;

    if (!userId) {
      continue;
    }

    await emitGuessWhoStateToSocket(roomSocket, roomCode, userId, matchId);
  }
}

async function emitGuessWhoStateToSocket(
  socket: RoleSocket,
  roomCode: string,
  userId: string,
  matchId?: string
) {
  const payload = await getGuessWhoStatePayload(roomCode, userId, matchId);

  if (!payload) {
    return;
  }

  socket.emit(SOCKET_EVENTS.GUESS_WHO_STATE_UPDATED, payload);
}

async function getGuessWhoStatePayload(
  roomCode: string,
  userId: string,
  matchId?: string
): Promise<GuessWhoStatePayload | null> {
  const match = await prisma.match.findFirst({
    where: {
      ...(matchId ? { id: matchId } : {}),
      status: "playing",
      endedAt: null,
      room: {
        code: roomCode,
      },
      game: {
        is: {
          type: "quem-sou-eu",
        },
      },
    },
    orderBy: {
      startedAt: "desc",
    },
    select: {
      id: true,
      state: true,
      room: {
        select: {
          code: true,
          hostId: true,
        },
      },
    },
  });

  if (!match || !isGuessWhoMatchState(match.state)) {
    return null;
  }

  const state = match.state;
  const currentPlayer = state.players.find((player) => player.userId === userId);

  if (!currentPlayer) {
    return null;
  }

  return {
    roomCode: match.room.code,
    matchId: match.id,
    phase: state.phase,
    isHost: match.room.hostId === userId,
    players: state.players.map((player) => {
      const isCurrentUser = player.userId === userId;
      const shouldHideCard = state.phase !== "result" && player.userId === userId;

      return {
        userId: player.userId,
        nickname: player.nickname,
        avatar: player.avatar,
        isCurrentUser,
        card: shouldHideCard
          ? null
          : {
              category: player.card.category,
              value: player.card.value,
              difficulty: player.card.difficulty,
            },
      };
    }),
  };
}

async function emitImpostorPrivateRoles(roomCode: string, matchId: string) {
  const sockets = await io?.in(roomCode).fetchSockets();

  if (!sockets) {
    return;
  }

  for (const roomSocket of sockets) {
    const userId = roomSocket.data.userId;

    if (!userId) {
      continue;
    }

    await emitImpostorPrivateRole(roomSocket, roomCode, userId, matchId);
  }
}

async function emitImpostorReadyState(roomCode: string, matchId?: string) {
  const readyPayload = await getImpostorReadyPayload(roomCode, matchId);

  if (!readyPayload) {
    return;
  }

  emitImpostorReadyUpdated(readyPayload);
}

async function emitImpostorReadyStateToSocket(
  socket: RoleSocket,
  roomCode: string,
  matchId?: string
) {
  const readyPayload = await getImpostorReadyPayload(roomCode, matchId);

  if (!readyPayload) {
    return;
  }

  socket.emit(SOCKET_EVENTS.IMPOSTOR_READY_UPDATED, readyPayload);
}

async function getImpostorReadyPayload(roomCode: string, matchId?: string) {
  const match = await prisma.match.findFirst({
    where: {
      ...(matchId ? { id: matchId } : {}),
      status: "playing",
      endedAt: null,
      room: {
        code: roomCode,
      },
      game: {
        is: {
          type: "impostor",
        },
      },
    },
    orderBy: {
      startedAt: "desc",
    },
    select: {
      id: true,
      state: true,
      room: {
        select: {
          code: true,
        },
      },
    },
  });

  if (!match || !isImpostorMatchState(match.state)) {
    return null;
  }

  return toImpostorReadyPayload(match.room.code, match.id, match.state);
}

function emitImpostorReadyUpdated(payload: ImpostorReadyUpdatedPayload) {
  io?.to(payload.roomCode).emit(SOCKET_EVENTS.IMPOSTOR_READY_UPDATED, payload);
}

function toImpostorHintsPayload(
  roomCode: string,
  matchId: string,
  state: ImpostorMatchState
): ImpostorHintsUpdatedPayload {
  return {
    roomCode,
    matchId,
    hints: state.hints,
  };
}

function toImpostorTurnPayload(
  roomCode: string,
  matchId: string,
  state: ImpostorMatchState
): ImpostorTurnChangedPayload {
  return {
    roomCode,
    matchId,
    currentTurnUserId: getCurrentHintTurnUserId(state),
  };
}

function toImpostorVotesPayload(
  roomCode: string,
  matchId: string,
  state: ImpostorMatchState
): ImpostorVotesUpdatedPayload {
  return {
    roomCode,
    matchId,
    votesCount: state.votes.length,
    totalCount: state.players.length,
  };
}

function toImpostorResultPayload(
  roomCode: string,
  matchId: string,
  result: Omit<ImpostorResultPayload, "roomCode" | "matchId">
): ImpostorResultPayload {
  return {
    roomCode,
    matchId,
    ...result,
  };
}

function toImpostorReadyPayload(
  roomCode: string,
  matchId: string,
  state: ImpostorMatchState
): ImpostorReadyUpdatedPayload {
  const readyCount = state.players.filter((player) => player.isReady).length;
  const result = state.result
    ? toImpostorResultPayload(roomCode, matchId, state.result)
    : null;

  return {
    roomCode,
    matchId,
    phase: state.phase,
    readyCount,
    totalCount: state.players.length,
    votesCount: state.votes.length,
    players: state.players.map((player) => ({
      userId: player.userId,
      nickname: player.nickname,
      avatar: player.avatar,
      isReady: player.isReady,
      isAlive: player.isAlive,
    })),
    hints: state.hints,
    currentTurnUserId: getCurrentHintTurnUserId(state),
    result,
  };
}

function calculateImpostorResult(
  state: ImpostorMatchState,
  votes: ImpostorMatchState["votes"]
): Omit<ImpostorResultPayload, "roomCode" | "matchId"> {
  const voteCounts = new Map<string, number>();

  for (const vote of votes) {
    voteCounts.set(vote.targetUserId, (voteCounts.get(vote.targetUserId) ?? 0) + 1);
  }

  const orderedCounts = Array.from(voteCounts.entries()).sort(
    ([firstUserId, firstCount], [secondUserId, secondCount]) =>
      secondCount - firstCount ||
      getPlayerOrderIndex(state, firstUserId) - getPlayerOrderIndex(state, secondUserId)
  );
  const [selectedUserId, selectedVoteCount] = orderedCounts[0];
  const tied =
    orderedCounts.filter(([, voteCount]) => voteCount === selectedVoteCount)
      .length > 1;
  const selectedPlayer = findImpostorStatePlayer(state, selectedUserId);
  const impostorPlayer = findImpostorStatePlayer(state, state.impostorUserId);
  const groupWon = !tied && selectedUserId === state.impostorUserId;

  return {
    word: state.word,
    selectedUserId,
    selectedNickname: selectedPlayer.nickname,
    impostorUserId: state.impostorUserId,
    impostorNickname: impostorPlayer.nickname,
    groupWon,
    tied,
    votes: votes.map((vote) => {
      const voter = findImpostorStatePlayer(state, vote.voterUserId);
      const target = findImpostorStatePlayer(state, vote.targetUserId);

      return {
        voterUserId: vote.voterUserId,
        voterNickname: voter.nickname,
        targetUserId: vote.targetUserId,
        targetNickname: target.nickname,
        createdAt: vote.createdAt,
      };
    }),
  };
}

function getPlayerOrderIndex(state: ImpostorMatchState, userId: string) {
  const index = state.players.findIndex((player) => player.userId === userId);

  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

function findImpostorStatePlayer(state: ImpostorMatchState, userId: string) {
  const player = state.players.find((item) => item.userId === userId);

  if (!player) {
    throw new Error("IMPOSTOR_PLAYER_NOT_FOUND");
  }

  return player;
}

function getCurrentHintTurnUserId(state: ImpostorMatchState) {
  if (state.phase !== "hints") {
    return null;
  }

  const playerWithPendingHint = state.players.find(
    (player) => !state.hints.some((hint) => hint.userId === player.userId)
  );

  return playerWithPendingHint?.userId ?? null;
}

async function emitImpostorPrivateRole(
  socket: RoleSocket,
  roomCode: string,
  userId: string,
  matchId?: string
) {
  const match = await prisma.match.findFirst({
    where: {
      ...(matchId ? { id: matchId } : {}),
      status: "playing",
      endedAt: null,
      room: {
        code: roomCode,
      },
      game: {
        is: {
          type: "impostor",
        },
      },
    },
    orderBy: {
      startedAt: "desc",
    },
    select: {
      id: true,
      state: true,
      room: {
        select: {
          hostId: true,
        },
      },
    },
  });

  if (!match || !isImpostorMatchState(match.state)) {
    return;
  }

  const player = match.state.players.find((item) => item.userId === userId);

  if (!player) {
    return;
  }

  const isImpostor = match.state.impostorUserId === userId;

  socket.emit(SOCKET_EVENTS.IMPOSTOR_PRIVATE_ROLE, {
    roomCode,
    matchId: match.id,
    role: isImpostor ? "impostor" : "player",
    category: match.state.category,
    word: isImpostor ? null : match.state.word,
    isHost: match.room.hostId === userId,
  });
}

function isImpostorMatchState(state: unknown): state is ImpostorMatchState {
  if (!state || typeof state !== "object") {
    return false;
  }

  const candidate = state as Partial<ImpostorMatchState>;

  return (
    (candidate.phase === "reveal" ||
      candidate.phase === "hints" ||
      candidate.phase === "voting" ||
      candidate.phase === "result") &&
    typeof candidate.category === "string" &&
    typeof candidate.word === "string" &&
    typeof candidate.impostorUserId === "string" &&
    Array.isArray(candidate.players) &&
    Array.isArray(candidate.hints) &&
    Array.isArray(candidate.votes)
  );
}

function isGuessWhoMatchState(state: unknown): state is GuessWhoMatchState {
  if (!state || typeof state !== "object") {
    return false;
  }

  const candidate = state as Partial<GuessWhoMatchState>;

  return (
    (candidate.phase === "playing" || candidate.phase === "result") &&
    Array.isArray(candidate.players) &&
    candidate.players.every(
      (player) =>
        player &&
        typeof player === "object" &&
        typeof player.userId === "string" &&
        typeof player.nickname === "string" &&
        (typeof player.avatar === "string" || player.avatar === null) &&
        player.card &&
        typeof player.card === "object" &&
        typeof player.card.id === "string" &&
        typeof player.card.category === "string" &&
        typeof player.card.value === "string" &&
        typeof player.card.difficulty === "string"
    )
  );
}

async function emitRoomState(roomCode: string, activeMatchId?: string | null) {
  const room = await prisma.room.findUnique({
    where: { code: roomCode },
    select: {
      code: true,
      hostId: true,
      status: true,
      selectedGame: {
        select: gameSelect,
      },
      matches: {
        where: {
          status: {
            in: ["started", "playing"],
          },
          endedAt: null,
        },
        orderBy: {
          startedAt: "desc",
        },
        take: 1,
        select: {
          id: true,
        },
      },
      players: {
        include: {
          user: true,
        },
        orderBy: {
          joinedAt: "asc",
        },
      },
    },
  });

  if (!room) {
    return;
  }

  const playersUpdatedPayload: PlayersUpdatedPayload = {
    roomCode: room.code,
    players: room.players.map((player) => ({
      id: player.id,
      userId: player.userId,
      nickname: player.user.nickname,
      avatar: player.user.avatar,
      isHost: player.isHost,
      isConnected: player.isConnected,
      joinedAt: player.joinedAt.toISOString(),
    })),
  };

  const hostUpdatedPayload: HostUpdatedPayload = {
    roomCode: room.code,
    hostId: room.hostId,
  };

  const gameUpdatedPayload: GameUpdatedPayload = {
    roomCode: room.code,
    selectedGame: room.selectedGame ? toGamePayload(room.selectedGame) : null,
    status: room.status,
    activeMatchId: activeMatchId ?? room.matches.at(0)?.id ?? null,
  };

  io?.to(room.code).emit(SOCKET_EVENTS.PLAYERS_UPDATED, playersUpdatedPayload);
  io?.to(room.code).emit(SOCKET_EVENTS.HOST_UPDATED, hostUpdatedPayload);
  io?.to(room.code).emit(SOCKET_EVENTS.GAME_UPDATED, gameUpdatedPayload);
}
