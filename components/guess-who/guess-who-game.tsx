"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  Gamepad2,
  HelpCircle,
  Loader2,
  LogOut,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { GameScreen } from "@/components/ui/game-screen";
import { ConnectionError } from "@/components/ui/connection-error";
import { createSocketClient, type LobbySocketClient } from "@/lib/socket/client";
import { SOCKET_EVENTS } from "@/lib/socket/events";
import type { GuessWhoStatePayload } from "@/lib/socket/types";
import { useConnectionGuard } from "@/lib/use-connection-guard";

const userIdKey = "partyroom:user-id";

type GuessWhoGameProps = {
  code: string;
};

export function GuessWhoGame({ code }: GuessWhoGameProps) {
  const router = useRouter();
  const socketRef = useRef<LobbySocketClient | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [state, setState] = useState<GuessWhoStatePayload | null>(null);
  const [showOwnResult, setShowOwnResult] = useState(false);
  const [error, setError] = useState("");
  const [hasConnectionFailed, setHasConnectionFailed] = useConnectionGuard(
    state !== null
  );

  const ownPlayer = useMemo(
    () => state?.players.find((player) => player.isCurrentUser) ?? null,
    [state]
  );
  const isResult = state?.phase === "result";
  const canEndRound = Boolean(state?.isHost && state.phase === "playing");

  useEffect(() => {
    const storedUserId = localStorage.getItem(userIdKey);

    if (!storedUserId) {
      window.setTimeout(
        () => setError("Entre na sala pela tela inicial para ver suas cartas."),
        0
      );
      return;
    }

    window.setTimeout(() => setCurrentUserId(storedUserId), 0);

    const socket = createSocketClient();
    socketRef.current = socket;

    socket.on("connect", () => {
      setHasConnectionFailed(false);
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, {
        roomCode: code,
        userId: storedUserId,
      });
    });

    // reconnect_failed vive no manager, nao no socket.
    socket.io.on("reconnect_failed", () => setHasConnectionFailed(true));

    socket.on(SOCKET_EVENTS.GUESS_WHO_STARTED, (payload) => {
      if (payload.roomCode !== code) {
        return;
      }

      setState(null);
      setShowOwnResult(false);
      router.push(payload.path);
    });

    socket.on(SOCKET_EVENTS.GUESS_WHO_STATE_UPDATED, (payload) => {
      if (payload.roomCode !== code) {
        return;
      }

      setState(payload);
      setError("");

      if (payload.phase !== "result") {
        setShowOwnResult(false);
      }
    });

    socket.on(SOCKET_EVENTS.ERROR, (payload) => {
      setError(payload.message);
    });

    socket.connect();

    return () => {
      socket.off();
      socket.io.off("reconnect_failed");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, router, setHasConnectionFailed]);

  function retryConnection() {
    setHasConnectionFailed(false);
    socketRef.current?.connect();
  }

  function endRound() {
    if (!currentUserId || !canEndRound) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.GUESS_WHO_END_ROUND, {
      roomCode: code,
      userId: currentUserId,
    });
  }

  function leaveGame() {
    socketRef.current?.disconnect();
    router.push("/");
  }

  return (
    <GameScreen
      maxWidth="md"
      actions={
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="h-12 gap-2"
          onClick={leaveGame}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Sala {code}
            </p>
            <h1 className="font-heading text-3xl font-black">Quem Sou Eu?</h1>
          </div>
          <div className="flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HelpCircle className="size-6" />
          </div>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {!state && hasConnectionFailed ? (
          <ConnectionError
            onRetry={retryConnection}
            onBackToLobby={() => router.push(`/room/${code}`)}
          />
        ) : (
        <section className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
              {isResult ? (
                <Trophy className="size-5" />
              ) : (
                <Gamepad2 className="size-5" />
              )}
            </div>
            <div>
              <h2 className="font-semibold">
                {isResult ? "Cartas reveladas" : "Rodada em andamento"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isResult
                  ? "Todas as cartas estao visiveis."
                  : "Descubra sua carta fazendo perguntas ao grupo."}
              </p>
            </div>
          </div>

          {state ? (
            <div className="space-y-3">
              {state.players.map((player) => (
                <div
                  key={player.userId}
                  className="rounded-md border border-border bg-background px-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-xl">
                      {player.avatar ?? "?"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">
                          {player.nickname}
                        </p>
                        {player.isCurrentUser ? (
                          <span className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                            Voce
                          </span>
                        ) : null}
                      </div>
                      {player.card ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {player.card.category}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Sua carta esta oculta
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 rounded-md border border-border bg-card px-3 py-3">
                    {player.card ? (
                      <>
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          Carta
                        </p>
                        <p className="mt-1 break-words text-2xl font-black">
                          {player.card.value}
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ShieldCheck className="size-4" />
                        Sua carta esta oculta
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              <div>
                <h2 className="font-semibold">Carregando cartas...</h2>
                <p className="text-sm text-muted-foreground">
                  Aguardando estado da rodada.
                </p>
              </div>
            </div>
          )}
        </section>
        )}

        {isResult && ownPlayer?.card ? (
          <section className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Eye className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">Minha carta</h2>
                <p className="text-sm text-muted-foreground">
                  Disponivel apenas no final da rodada.
                </p>
              </div>
            </div>

            {showOwnResult ? (
              <div className="rounded-md border border-primary/40 bg-primary/10 px-4 py-4">
                <p className="text-sm text-muted-foreground">
                  {ownPlayer.card.category}
                </p>
                <p className="mt-1 break-words text-3xl font-black">
                  {ownPlayer.card.value}
                </p>
              </div>
            ) : (
              <Button
                type="button"
                size="lg"
                className="h-12 w-full gap-2"
                onClick={() => setShowOwnResult(true)}
              >
                <Eye className="size-4" />
                Revelar minha carta
              </Button>
            )}
          </section>
        ) : null}

        {canEndRound ? (
          <Button
            type="button"
            size="lg"
            className="h-12 w-full gap-2"
            onClick={endRound}
          >
            <Trophy className="size-4" />
            Encerrar rodada
          </Button>
        ) : null}

        {!state?.isHost && state?.phase === "playing" ? (
          <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-foreground">
            O host pode encerrar a rodada quando todos terminarem.
          </p>
        ) : null}
      </div>
    </GameScreen>
  );
}
