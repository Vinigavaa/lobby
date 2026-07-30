"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  EyeOff,
  Gamepad2,
  Home,
  LogOut,
  RotateCcw,
  Send,
  ShieldQuestion,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSocketClient, type LobbySocketClient } from "@/lib/socket/client";
import { SOCKET_EVENTS } from "@/lib/socket/events";
import type {
  ImpostorPrivateRolePayload,
  ImpostorReadyUpdatedPayload,
} from "@/lib/socket/types";

const userIdKey = "partyroom:user-id";
const impostorRoleKey = "partyroom:impostor-role";

type ImpostorGameProps = {
  code: string;
};

export function ImpostorGame({ code }: ImpostorGameProps) {
  const router = useRouter();
  const socketRef = useRef<LobbySocketClient | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [role, setRole] = useState<ImpostorPrivateRolePayload | null>(null);
  const [readyState, setReadyState] =
    useState<ImpostorReadyUpdatedPayload | null>(null);
  const [hintText, setHintText] = useState("");
  const [voteConfirmed, setVoteConfirmed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cachedRole = readCachedRole(code);

    if (cachedRole) {
      window.setTimeout(() => setRole(cachedRole), 0);
    }

    const storedUserId = localStorage.getItem(userIdKey);

    if (!storedUserId) {
      window.setTimeout(
        () => setError("Entre na sala pela tela inicial para receber sua funcao."),
        0
      );
      return;
    }

    window.setTimeout(() => setCurrentUserId(storedUserId), 0);

    const socket = createSocketClient();
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, {
        roomCode: code,
        userId: storedUserId,
      });
    });

    socket.on(SOCKET_EVENTS.IMPOSTOR_STARTED, (payload) => {
      if (payload.roomCode !== code) {
        return;
      }

      setHintText("");
      setVoteConfirmed(false);
      setReadyState(null);
      router.push(payload.path);
    });

    socket.on(SOCKET_EVENTS.IMPOSTOR_PRIVATE_ROLE, (payload) => {
      if (payload.roomCode !== code) {
        return;
      }

      sessionStorage.setItem(impostorRoleKey, JSON.stringify(payload));
      setRole(payload);
      setError("");
    });

    socket.on(SOCKET_EVENTS.IMPOSTOR_BACK_TO_LOBBY, (payload) => {
      if (payload.roomCode === code) {
        router.push(payload.path);
      }
    });

    socket.on(SOCKET_EVENTS.IMPOSTOR_READY_UPDATED, (payload) => {
      if (payload.roomCode === code) {
        setReadyState(payload);
      }
    });

    socket.on(SOCKET_EVENTS.IMPOSTOR_HINTS_UPDATED, (payload) => {
      if (payload.roomCode !== code) {
        return;
      }

      setReadyState((currentState) =>
        currentState ? { ...currentState, hints: payload.hints } : currentState
      );
    });

    socket.on(SOCKET_EVENTS.IMPOSTOR_TURN_CHANGED, (payload) => {
      if (payload.roomCode !== code) {
        return;
      }

      setReadyState((currentState) =>
        currentState
          ? { ...currentState, currentTurnUserId: payload.currentTurnUserId }
          : currentState
      );
    });

    socket.on(SOCKET_EVENTS.IMPOSTOR_VOTES_UPDATED, (payload) => {
      if (payload.roomCode !== code) {
        return;
      }

      setReadyState((currentState) =>
        currentState
          ? { ...currentState, votesCount: payload.votesCount }
          : currentState
      );
    });

    socket.on(SOCKET_EVENTS.IMPOSTOR_RESULT, (payload) => {
      if (payload.roomCode !== code) {
        return;
      }

      setReadyState((currentState) =>
        currentState
          ? {
              ...currentState,
              phase: "result",
              result: payload,
              votesCount: currentState.totalCount,
            }
          : currentState
      );
    });

    socket.on(SOCKET_EVENTS.IMPOSTOR_PHASE_CHANGED, (payload) => {
      if (payload.roomCode !== code) {
        return;
      }

      setReadyState((currentState) =>
        currentState ? { ...currentState, phase: payload.phase } : currentState
      );
    });

    socket.on(SOCKET_EVENTS.ERROR, (payload) => {
      setError(payload.message);
    });

    socket.connect();

    return () => {
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, router]);

  function leaveGame() {
    socketRef.current?.disconnect();
    router.push("/");
  }

  function markReady() {
    if (!currentUserId || !role || currentPlayerReady || phase !== "reveal") {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.IMPOSTOR_READY, {
      roomCode: code,
      userId: currentUserId,
    });
  }

  function submitHint() {
    if (!currentUserId || !isCurrentTurn || phase !== "hints") {
      return;
    }

    const normalizedHint = hintText.trim();

    if (!normalizedHint || normalizedHint.length > 30) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.IMPOSTOR_SUBMIT_HINT, {
      roomCode: code,
      userId: currentUserId,
      text: normalizedHint,
    });
    setHintText("");
  }

  function voteFor(targetUserId: string) {
    if (!currentUserId || voteConfirmed || phase !== "voting") {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.IMPOSTOR_VOTE, {
      roomCode: code,
      userId: currentUserId,
      targetUserId,
    });
    setVoteConfirmed(true);
  }

  function playAgain() {
    if (!currentUserId || !role?.isHost) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.IMPOSTOR_PLAY_AGAIN, {
      roomCode: code,
      userId: currentUserId,
    });
  }

  function backToLobby() {
    if (!currentUserId || !role?.isHost) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.IMPOSTOR_BACK_TO_LOBBY, {
      roomCode: code,
      userId: currentUserId,
    });
  }

  const isImpostor = role?.role === "impostor";
  const phase = readyState?.phase ?? "reveal";
  const readyCount = readyState?.readyCount ?? 0;
  const totalCount = readyState?.totalCount ?? 0;
  const players = readyState?.players ?? [];
  const hints = readyState?.hints ?? [];
  const votesCount = readyState?.votesCount ?? 0;
  const result = readyState?.result ?? null;
  const currentTurnUserId = readyState?.currentTurnUserId ?? null;
  const currentPlayerReady = Boolean(
    players.find((player) => player.userId === currentUserId)?.isReady
  );
  const isCurrentTurn = currentTurnUserId === currentUserId;
  const currentTurnPlayer = players.find(
    (player) => player.userId === currentTurnUserId
  );
  const waitingForPlayers =
    phase === "reveal" && totalCount > 0 && readyCount < totalCount;

  return (
    <main className="min-h-screen bg-background px-5 py-6 text-foreground">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-between gap-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Sala {code}
              </p>
              <h1 className="font-heading text-3xl font-black">Impostor</h1>
            </div>
            <div className="flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Gamepad2 className="size-6" />
            </div>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
            {role ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    {isImpostor ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <ShieldQuestion className="size-5" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold">
                      {isImpostor ? "Voce e o impostor" : "Palavra secreta"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Categoria: {role.category}
                    </p>
                  </div>
                </div>

                <div className="rounded-md border border-border bg-background px-4 py-5">
                  <p className="text-sm font-medium text-muted-foreground">
                    {isImpostor ? "Sua funcao" : "Sua palavra"}
                  </p>
                  {isImpostor ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-3xl font-black">Impostor</p>
                      <p className="text-sm text-muted-foreground">
                        Tente descobrir a palavra sem ser descoberto
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-3xl font-black">{role.word}</p>
                  )}
                </div>

                {phase === "reveal" ? (
                  <Button
                    type="button"
                    size="lg"
                    className="h-12 w-full gap-2"
                    disabled={currentPlayerReady}
                    onClick={markReady}
                  >
                    <CheckCircle2 className="size-4" />
                    {currentPlayerReady ? "Pronto" : "Estou pronto"}
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="font-semibold">Carregando sua funcao...</h2>
                <p className="text-sm text-muted-foreground">
                  Aguardando informacao privada do servidor.
                </p>
              </div>
            )}
          </div>

          {phase === "reveal" ? (
            <RevealStatus
              readyCount={readyCount}
              totalCount={totalCount}
              waitingForPlayers={waitingForPlayers}
            />
          ) : null}

          {phase === "hints" ? (
            <HintsPhase
              currentTurnUserId={currentTurnUserId}
              currentTurnNickname={currentTurnPlayer?.nickname ?? null}
              hintText={hintText}
              hints={hints}
              isCurrentTurn={isCurrentTurn}
              players={players}
              setHintText={setHintText}
              submitHint={submitHint}
            />
          ) : null}

          {phase === "voting" ? (
            <VotingPhase
              players={players}
              result={result}
              totalCount={totalCount}
              voteConfirmed={voteConfirmed}
              votesCount={votesCount}
              voteFor={voteFor}
            />
          ) : null}

          {phase === "result" && result ? (
            <ResultPhase
              backToLobby={backToLobby}
              hints={hints}
              isHost={Boolean(role?.isHost)}
              playAgain={playAgain}
              result={result}
            />
          ) : null}
        </div>

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
      </section>
    </main>
  );
}

type RevealStatusProps = {
  readyCount: number;
  totalCount: number;
  waitingForPlayers: boolean;
};

function RevealStatus({
  readyCount,
  totalCount,
  waitingForPlayers,
}: RevealStatusProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <UsersRound className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold">Revelacao</h2>
          <p className="text-sm text-muted-foreground">
            {readyCount}/{totalCount} jogador{totalCount === 1 ? "" : "es"}{" "}
            pronto{readyCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {waitingForPlayers ? (
        <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-foreground">
          Aguardando outros jogadores.
        </p>
      ) : null}
    </div>
  );
}

type HintsPhaseProps = {
  currentTurnUserId: string | null;
  currentTurnNickname: string | null;
  hintText: string;
  hints: NonNullable<ImpostorReadyUpdatedPayload["hints"]>;
  isCurrentTurn: boolean;
  players: NonNullable<ImpostorReadyUpdatedPayload["players"]>;
  setHintText: (value: string) => void;
  submitHint: () => void;
};

function HintsPhase({
  currentTurnUserId,
  currentTurnNickname,
  hintText,
  hints,
  isCurrentTurn,
  players,
  setHintText,
  submitHint,
}: HintsPhaseProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
      <div className="mb-5">
        <h2 className="font-semibold">Rodada de dicas</h2>
        <p className="text-sm text-muted-foreground">
          {currentTurnNickname
            ? `Vez de ${currentTurnNickname}`
            : "Aguardando proxima vez"}
        </p>
      </div>

      <div className="space-y-2">
        {players.map((player, index) => (
          <div
            key={player.userId}
            className={
              player.userId === currentTurnUserId
                ? "flex items-center justify-between rounded-md border border-primary bg-primary/10 px-3 py-3"
                : "flex items-center justify-between rounded-md border border-border bg-background px-3 py-3"
            }
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-lg">
                {player.avatar ?? String(index + 1)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {index + 1}. {player.nickname}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hints.some((hint) => hint.userId === player.userId)
                    ? "Dica enviada"
                    : "Aguardando dica"}
                </p>
              </div>
            </div>
            {player.userId === currentTurnUserId ? (
              <span className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                Vez
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        <h3 className="text-sm font-semibold">Dicas enviadas</h3>
        {hints.length > 0 ? (
          hints.map((hint) => (
            <div
              key={`${hint.userId}-${hint.createdAt}`}
              className="rounded-md border border-border bg-background px-3 py-2"
            >
              <p className="text-sm font-medium">{hint.nickname}</p>
              <p className="text-sm text-muted-foreground">{hint.text}</p>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            Nenhuma dica enviada ainda.
          </p>
        )}
      </div>

      {isCurrentTurn ? (
        <div className="mt-5 grid gap-2">
          <Input
            value={hintText}
            maxLength={30}
            placeholder="Digite sua dica"
            onChange={(event) => setHintText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submitHint();
              }
            }}
          />
          <Button
            type="button"
            className="h-11 gap-2"
            disabled={!hintText.trim() || hintText.trim().length > 30}
            onClick={submitHint}
          >
            <Send className="size-4" />
            Enviar dica
          </Button>
        </div>
      ) : null}

      {!isCurrentTurn ? (
        <p className="mt-5 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-foreground">
          Aguarde sua vez para enviar a dica.
        </p>
      ) : null}
    </div>
  );
}

type VotingPhaseProps = {
  players: NonNullable<ImpostorReadyUpdatedPayload["players"]>;
  result: ImpostorReadyUpdatedPayload["result"];
  totalCount: number;
  voteConfirmed: boolean;
  votesCount: number;
  voteFor: (targetUserId: string) => void;
};

function VotingPhase({
  players,
  result,
  totalCount,
  voteConfirmed,
  votesCount,
  voteFor,
}: VotingPhaseProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
      <div className="mb-5">
        <h2 className="font-semibold">Quem e o impostor?</h2>
        <p className="text-sm text-muted-foreground">
          {votesCount}/{totalCount} voto{votesCount === 1 ? "" : "s"} recebido
          {votesCount === 1 ? "" : "s"}
        </p>
      </div>

      {result ? (
        <div className="mb-5 rounded-md border border-accent/30 bg-accent/10 px-3 py-3 text-sm text-accent-foreground">
          <p className="font-semibold">
            {result.groupWon ? "O grupo venceu" : "O impostor venceu"}
          </p>
          <p>
            Mais votado: {result.selectedNickname}. Impostor:{" "}
            {result.impostorNickname}.
          </p>
          {result.tied ? <p>Empate na votacao favoreceu o impostor.</p> : null}
        </div>
      ) : null}

      {voteConfirmed && !result ? (
        <p className="mb-5 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-foreground">
          Voto confirmado.
        </p>
      ) : null}

      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.userId}
            className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-lg">
                {player.avatar ?? "?"}
              </span>
              <p className="truncate font-medium">{player.nickname}</p>
            </div>
            {result ? null : (
              <Button
                type="button"
                size="sm"
                disabled={voteConfirmed}
                onClick={() => voteFor(player.userId)}
              >
                Votar
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

type ResultPhaseProps = {
  backToLobby: () => void;
  hints: NonNullable<ImpostorReadyUpdatedPayload["hints"]>;
  isHost: boolean;
  playAgain: () => void;
  result: NonNullable<ImpostorReadyUpdatedPayload["result"]>;
};

function ResultPhase({
  backToLobby,
  hints,
  isHost,
  playAgain,
  result,
}: ResultPhaseProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Trophy className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold">
            {result.groupWon ? "O grupo venceu!" : "O impostor venceu!"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Palavra secreta: {result.word}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-md border border-border bg-background px-3 py-3">
          <p className="text-sm text-muted-foreground">Impostor</p>
          <p className="font-semibold">{result.impostorNickname}</p>
        </div>
        <div className="rounded-md border border-border bg-background px-3 py-3">
          <p className="text-sm text-muted-foreground">Mais votado</p>
          <p className="font-semibold">{result.selectedNickname}</p>
          {result.tied ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Empate na votacao favoreceu o impostor.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <h3 className="text-sm font-semibold">Votos</h3>
        {result.votes.map((vote) => (
          <div
            key={`${vote.voterUserId}-${vote.createdAt}`}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <span className="font-medium">{vote.voterNickname}</span>
            <span className="text-muted-foreground"> votou em </span>
            <span className="font-medium">{vote.targetNickname}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        <h3 className="text-sm font-semibold">Dicas</h3>
        {hints.map((hint) => (
          <div
            key={`${hint.userId}-${hint.createdAt}`}
            className="rounded-md border border-border bg-background px-3 py-2"
          >
            <p className="text-sm font-medium">{hint.nickname}</p>
            <p className="text-sm text-muted-foreground">{hint.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-2">
        {isHost ? (
          <>
            <Button
              type="button"
              className="h-11 gap-2"
              onClick={playAgain}
            >
              <RotateCcw className="size-4" />
              Jogar novamente
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11 gap-2"
              onClick={backToLobby}
            >
              <Home className="size-4" />
              Voltar ao lobby
            </Button>
          </>
        ) : (
          <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-foreground">
            Aguardando host...
          </p>
        )}
      </div>
    </div>
  );
}

function readCachedRole(roomCode: string) {
  try {
    const storedRole = sessionStorage.getItem(impostorRoleKey);

    if (!storedRole) {
      return null;
    }

    const parsedRole = JSON.parse(storedRole) as ImpostorPrivateRolePayload;

    return parsedRole.roomCode === roomCode ? parsedRole : null;
  } catch {
    return null;
  }
}
