"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Gamepad2,
  Hourglass,
  Lock,
  LogOut,
  Play,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { GameScreen } from "@/components/ui/game-screen";
import { createSocketClient, type LobbySocketClient } from "@/lib/socket/client";
import { SOCKET_EVENTS } from "@/lib/socket/events";
import type { GamePayload, RoomPlayerPayload } from "@/lib/socket/types";
import {
  customGuessWhoGameType,
  customGuessWhoMinimumPlayers,
} from "@/lib/custom-guess-who-engine";
import {
  palpiteCertoGameType,
  palpiteCertoMinimumPlayers,
} from "@/lib/palpite-certo-engine";
import { stopMinimumPlayers } from "@/lib/stop-engine";
import { triviaMinimumPlayers } from "@/lib/trivia-themes";
import { cn } from "@/lib/utils";

const userIdKey = "partyroom:user-id";
const impostorRoleKey = "partyroom:impostor-role";
const defaultMinimumPlayers = 3;
const minimumPlayersByGameType: Record<string, number> = {
  trivia: triviaMinimumPlayers,
  [palpiteCertoGameType]: palpiteCertoMinimumPlayers,
  [customGuessWhoGameType]: customGuessWhoMinimumPlayers,
  stop: stopMinimumPlayers,
};

type RoomLobbyProps = {
  code: string;
  status: string;
  games: GamePayload[];
  initialSelectedGame: GamePayload | null;
  initialPlayers: RoomPlayerPayload[];
};

export function RoomLobby({
  code,
  status,
  games,
  initialSelectedGame,
  initialPlayers,
}: RoomLobbyProps) {
  const router = useRouter();
  const socketRef = useRef<LobbySocketClient | null>(null);
  const [players, setPlayers] = useState(initialPlayers);
  const [selectedGame, setSelectedGame] = useState<GamePayload | null>(
    initialSelectedGame
  );
  const [roomStatus, setRoomStatus] = useState(status);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const connectedCount = useMemo(
    () => players.filter((player) => player.isConnected).length,
    [players]
  );

  const currentPlayer = useMemo(
    () => players.find((player) => player.userId === currentUserId) ?? null,
    [currentUserId, players]
  );
  const isHost = Boolean(currentPlayer?.isHost);
  const minimumPlayersForGame = selectedGame
    ? minimumPlayersByGameType[selectedGame.type] ?? defaultMinimumPlayers
    : defaultMinimumPlayers;
  const canStartGame =
    isHost &&
    roomStatus === "waiting" &&
    Boolean(selectedGame) &&
    connectedCount >= minimumPlayersForGame;
  const startDisabledReason = !selectedGame
    ? "Escolha um jogo para iniciar."
    : connectedCount < minimumPlayersForGame
      ? `A partida precisa de pelo menos ${minimumPlayersForGame} jogadores.`
      : roomStatus !== "waiting"
        ? "A partida ja foi iniciada."
        : "";

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const storedUserId = localStorage.getItem(userIdKey);

      if (!storedUserId) {
        setError(
          "Entre na sala pela tela inicial para sincronizar em tempo real."
        );
        return;
      }

      setCurrentUserId(storedUserId);

      const socket = createSocketClient();
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit(SOCKET_EVENTS.JOIN_ROOM, {
          roomCode: code,
          userId: storedUserId,
        });
      });

      socket.on(SOCKET_EVENTS.PLAYERS_UPDATED, (payload) => {
        if (payload.roomCode === code) {
          setPlayers(payload.players);
        }
      });

      socket.on(SOCKET_EVENTS.HOST_UPDATED, () => {
        setError("");
      });

      socket.on(SOCKET_EVENTS.GAME_UPDATED, (payload) => {
        if (payload.roomCode === code) {
          setSelectedGame(payload.selectedGame);
          setRoomStatus(payload.status);
          setError("");
        }
      });

      socket.on(SOCKET_EVENTS.IMPOSTOR_PRIVATE_ROLE, (payload) => {
        if (payload.roomCode === code) {
          sessionStorage.setItem(impostorRoleKey, JSON.stringify(payload));
        }
      });

      socket.on(SOCKET_EVENTS.IMPOSTOR_STARTED, (payload) => {
        if (payload.roomCode === code) {
          router.push(payload.path);
        }
      });

      socket.on(SOCKET_EVENTS.GUESS_WHO_STARTED, (payload) => {
        if (payload.roomCode === code) {
          router.push(payload.path);
        }
      });

      socket.on(SOCKET_EVENTS.CUSTOM_GUESS_WHO_STARTED, (payload) => {
        if (payload.roomCode === code) {
          router.push(payload.path);
        }
      });

      socket.on(SOCKET_EVENTS.MIMICA_STARTED, (payload) => {
        if (payload.roomCode === code) {
          router.push(payload.path);
        }
      });

      socket.on(SOCKET_EVENTS.STOP_STARTED, (payload) => {
        if (payload.roomCode === code) {
          router.push(payload.path);
        }
      });

      socket.on(SOCKET_EVENTS.TRIVIA_STARTED, (payload) => {
        if (payload.roomCode === code) {
          router.push(payload.path);
        }
      });

      socket.on(SOCKET_EVENTS.PALPITE_CERTO_STARTED, (payload) => {
        if (payload.roomCode === code) {
          router.push(payload.path);
        }
      });

      socket.on(SOCKET_EVENTS.ERROR, (payload) => {
        setError(payload.message);
      });

      socket.connect();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
      socketRef.current?.off();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [code, router]);

  function selectGame(game: GamePayload) {
    if (!isHost || !currentUserId || !game.isActive || roomStatus !== "waiting") {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.GAME_SELECTED, {
      roomCode: code,
      userId: currentUserId,
      gameId: game.id,
    });
  }

  function startGame() {
    if (!canStartGame || !currentUserId) {
      return;
    }

    if (selectedGame?.type === "impostor") {
      socketRef.current?.emit(SOCKET_EVENTS.IMPOSTOR_START, {
        roomCode: code,
        userId: currentUserId,
      });
      return;
    }

    if (selectedGame?.type === customGuessWhoGameType) {
      socketRef.current?.emit(SOCKET_EVENTS.CUSTOM_GUESS_WHO_START, {
        roomCode: code,
        userId: currentUserId,
      });
      return;
    }

    if (selectedGame?.type === "mimica") {
      socketRef.current?.emit(SOCKET_EVENTS.MIMICA_START, {
        roomCode: code,
        userId: currentUserId,
      });
      return;
    }

    if (selectedGame?.type === "stop") {
      socketRef.current?.emit(SOCKET_EVENTS.STOP_START, {
        roomCode: code,
        userId: currentUserId,
      });
      return;
    }

    if (selectedGame?.type === "trivia") {
      socketRef.current?.emit(SOCKET_EVENTS.TRIVIA_START, {
        roomCode: code,
        userId: currentUserId,
      });
      return;
    }

    if (selectedGame?.type === palpiteCertoGameType) {
      socketRef.current?.emit(SOCKET_EVENTS.PALPITE_CERTO_START, {
        roomCode: code,
        userId: currentUserId,
      });
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.START_GAME, {
      roomCode: code,
      userId: currentUserId,
    });
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function leaveRoom() {
    if (socketRef.current?.connected && currentUserId) {
      socketRef.current.emit(SOCKET_EVENTS.LEAVE_ROOM, {
        roomCode: code,
        userId: currentUserId,
      });
      socketRef.current.disconnect();
    }

    router.push("/");
  }

  return (
    <GameScreen
      maxWidth="5xl"
      actions={
        <>
          {isHost ? (
            <div className="grid gap-2">
              <Button
                type="button"
                size="lg"
                className="h-12 gap-2"
                disabled={!canStartGame}
                onClick={startGame}
              >
                <Play className="size-4" />
                Iniciar partida
              </Button>
              {startDisabledReason ? (
                <p className="text-center text-sm text-muted-foreground">
                  {startDisabledReason}
                </p>
              ) : null}
            </div>
          ) : null}
          <Button
            type="button"
            size="lg"
            className="h-12 gap-2"
            onClick={copyCode}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Codigo copiado" : "Copiar codigo"}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="h-12 gap-2"
            onClick={leaveRoom}
          >
            <LogOut className="size-4" />
            Sair da sala
          </Button>
        </>
      }
    >
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Sala PartyRoom
            </p>
            <h1 className="font-heading text-5xl font-black tracking-[0.06em]">
              {code}
            </h1>
          </div>
          <div className="flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <UsersRound className="size-6" />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Gamepad2 className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">
                  {isHost ? "Escolha o jogo" : "Jogo escolhido"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedGame
                    ? selectedGame.name
                    : isHost
                      ? "Selecione um jogo para a sala."
                      : "Aguardando o host escolher."}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {games.map((game) => {
                const isSelected = selectedGame?.id === game.id;
                const isSelectable =
                  isHost && game.isActive && roomStatus === "waiting";

                return (
                  <button
                    key={game.id}
                    type="button"
                    disabled={!isSelectable}
                    aria-pressed={isSelected}
                    onClick={() => selectGame(game)}
                    className={cn(
                      "min-h-32 rounded-md border bg-background p-4 text-left transition-all",
                      "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
                      isSelected
                        ? "border-primary shadow-sm shadow-primary/20"
                        : "border-border",
                      isSelectable
                        ? "cursor-pointer hover:border-primary/70 hover:bg-primary/5"
                        : "cursor-default",
                      !game.isActive && "opacity-75"
                    )}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">
                          {game.name}
                        </h3>
                        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                          {game.description}
                        </p>
                      </div>
                      {isSelected ? (
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                          <Check className="size-4" />
                        </span>
                      ) : !game.isActive ? (
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <Lock className="size-4" />
                        </span>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-1 text-xs font-semibold",
                        game.isActive
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {game.isActive ? "Disponivel" : "Em breve"}
                    </span>
                  </button>
                );
              })}
            </div>

            {roomStatus !== "waiting" ? (
              <p className="mt-4 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-foreground">
                Partida iniciada com {selectedGame?.name ?? "jogo selecionado"}.
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Hourglass className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">Aguardando jogadores...</h2>
              <p className="text-sm text-muted-foreground">
                {connectedCount} conectado{connectedCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {error ? (
            <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="space-y-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-xl">
                    {player.avatar ?? "🎲"}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {player.nickname}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className={
                          player.isConnected
                            ? "size-2 rounded-full bg-accent"
                            : "size-2 rounded-full bg-muted-foreground/50"
                        }
                      />
                      {player.isConnected ? "Conectado" : "Desconectado"}
                    </div>
                  </div>
                </div>

                {player.isHost ? (
                  <span className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">
                    Host
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>
    </GameScreen>
  );
}
