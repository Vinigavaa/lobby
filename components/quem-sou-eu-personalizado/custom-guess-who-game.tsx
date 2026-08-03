"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  Check,
  Eye,
  HelpCircle,
  Hourglass,
  Loader2,
  LogOut,
  PencilLine,
  RotateCcw,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { GameScreen } from "@/components/ui/game-screen";
import { ConnectionError } from "@/components/ui/connection-error";
import { Input } from "@/components/ui/input";
import { createSocketClient, type LobbySocketClient } from "@/lib/socket/client";
import { SOCKET_EVENTS } from "@/lib/socket/events";
import type { CustomGuessWhoStatePayload } from "@/lib/socket/types";
import { useConnectionGuard } from "@/lib/use-connection-guard";
import { cn } from "@/lib/utils";

const userIdKey = "partyroom:user-id";

type CustomGuessWhoGameProps = {
  code: string;
};

type StatePlayer = CustomGuessWhoStatePayload["players"][number];

export function CustomGuessWhoGame({ code }: CustomGuessWhoGameProps) {
  const router = useRouter();
  const socketRef = useRef<LobbySocketClient | null>(null);
  const hadPendingGuessRef = useRef(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [state, setState] = useState<CustomGuessWhoStatePayload | null>(null);
  const [characterText, setCharacterText] = useState("");
  const [guessText, setGuessText] = useState("");
  const [isGuessOpen, setIsGuessOpen] = useState(false);
  const [wasGuessRejected, setWasGuessRejected] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [hasConnectionFailed, setHasConnectionFailed] = useConnectionGuard(
    state !== null
  );

  const ownPlayer = useMemo(
    () => state?.players.find((player) => player.isCurrentUser) ?? null,
    [state]
  );
  const otherPlayers = useMemo(
    () => state?.players.filter((player) => !player.isCurrentUser) ?? [],
    [state]
  );
  const guessesToVote = useMemo(
    () =>
      otherPlayers.filter(
        (player) => player.pendingGuess && player.pendingGuess.myVote === null
      ),
    [otherPlayers]
  );

  useEffect(() => {
    const storedUserId = localStorage.getItem(userIdKey);

    if (!storedUserId) {
      window.setTimeout(
        () => setError("Entre na sala pela tela inicial para jogar."),
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

    socket.on(SOCKET_EVENTS.CUSTOM_GUESS_WHO_STARTED, (payload) => {
      if (payload.roomCode !== code) {
        return;
      }

      // Nova partida (jogar novamente): limpa o que era da partida anterior.
      setState(null);
      setCharacterText("");
      setGuessText("");
      setIsGuessOpen(false);
      setWasGuessRejected(false);
      hadPendingGuessRef.current = false;
      router.push(payload.path);
    });

    socket.on(SOCKET_EVENTS.CUSTOM_GUESS_WHO_STATE_UPDATED, (payload) => {
      if (payload.roomCode !== code) {
        return;
      }

      // A rejeicao nao fica guardada no servidor: detectamos pela transicao de
      // "tinha resposta em votacao" para "nao tem mais, e ainda nao acertou".
      const own = payload.players.find((player) => player.isCurrentUser);
      const hasPendingGuess = Boolean(own?.pendingGuess);

      if (hasPendingGuess) {
        setWasGuessRejected(false);
      } else if (hadPendingGuessRef.current && own && !own.hasSolved) {
        setWasGuessRejected(true);
      }

      hadPendingGuessRef.current = hasPendingGuess;
      setState(payload);
      setError("");
    });

    socket.on(SOCKET_EVENTS.CUSTOM_GUESS_WHO_BACK_TO_LOBBY_NAV, (payload) => {
      if (payload.roomCode !== code) {
        return;
      }

      router.push(payload.path);
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

  function submitCharacter() {
    const character = characterText.trim();

    if (!currentUserId || !character) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.CUSTOM_GUESS_WHO_SUBMIT_CHARACTER, {
      roomCode: code,
      userId: currentUserId,
      character,
    });
  }

  function submitGuess() {
    const guess = guessText.trim();

    if (!currentUserId || !guess) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.CUSTOM_GUESS_WHO_GUESS, {
      roomCode: code,
      userId: currentUserId,
      guess,
    });
    setGuessText("");
    setIsGuessOpen(false);
  }

  function vote(targetUserId: string, correct: boolean) {
    if (!currentUserId) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.CUSTOM_GUESS_WHO_VOTE, {
      roomCode: code,
      userId: currentUserId,
      targetUserId,
      correct,
    });
  }

  function playAgain() {
    if (!currentUserId) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.CUSTOM_GUESS_WHO_PLAY_AGAIN, {
      roomCode: code,
      userId: currentUserId,
    });
  }

  function backToLobby() {
    if (!currentUserId) {
      return;
    }

    setIsCancelConfirmOpen(false);
    socketRef.current?.emit(SOCKET_EVENTS.CUSTOM_GUESS_WHO_CANCEL, {
      roomCode: code,
      userId: currentUserId,
    });
  }

  function leaveGame() {
    socketRef.current?.disconnect();
    router.push("/");
  }

  const isWriting = state?.phase === "writing";
  const isPlaying = state?.phase === "playing";
  const isFinished = state?.phase === "finished";

  return (
    <GameScreen
      actions={
        <>
          {state?.isHost && !isFinished ? (
            isCancelConfirmOpen ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">
                  Cancelar a partida e voltar todos ao lobby?
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={backToLobby}
                  >
                    Cancelar partida
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsCancelConfirmOpen(false)}
                  >
                    Continuar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                size="lg"
                variant="secondary"
                className="h-12 gap-2"
                onClick={() => setIsCancelConfirmOpen(true)}
              >
                <Ban className="size-4" />
                Cancelar partida
              </Button>
            )
          ) : null}

          {state?.isHost && isFinished ? (
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="h-12 gap-2"
              onClick={backToLobby}
            >
              <LogOut className="size-4" />
              Voltar ao lobby
            </Button>
          ) : null}

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
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Sala {code}
            </p>
            <h1 className="font-heading text-3xl font-black">
              Quem Sou Eu? Personalizado
            </h1>
          </div>
          <div className="flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            {isFinished ? (
              <Trophy className="size-6" />
            ) : (
              <HelpCircle className="size-6" />
            )}
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
        ) : null}

        {!state && !hasConnectionFailed ? (
          <section className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              <div>
                <h2 className="font-semibold">Carregando partida...</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Aguardando estado da partida.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {state && isWriting ? (
          <WritingPhase
            characterText={characterText}
            onChangeCharacter={setCharacterText}
            onSubmitCharacter={submitCharacter}
            state={state}
          />
        ) : null}

        {state && isPlaying ? (
          <PlayingPhase
            guessText={guessText}
            guessesToVote={guessesToVote}
            isGuessOpen={isGuessOpen}
            onChangeGuess={setGuessText}
            onOpenGuess={setIsGuessOpen}
            onSubmitGuess={submitGuess}
            onVote={vote}
            ownPlayer={ownPlayer}
            otherPlayers={otherPlayers}
            state={state}
            wasGuessRejected={wasGuessRejected}
          />
        ) : null}

        {state && isFinished ? (
          <FinishedPhase
            isHost={state.isHost}
            onPlayAgain={playAgain}
            players={state.players}
          />
        ) : null}
      </div>
    </GameScreen>
  );
}

type WritingPhaseProps = {
  characterText: string;
  onChangeCharacter: (value: string) => void;
  onSubmitCharacter: () => void;
  state: CustomGuessWhoStatePayload;
};

function WritingPhase({
  characterText,
  onChangeCharacter,
  onSubmitCharacter,
  state,
}: WritingPhaseProps) {
  const trimmedLength = characterText.trim().length;
  const canSubmit =
    trimmedLength > 0 && characterText.length <= state.characterMaxLength;

  if (state.hasSubmittedCharacter) {
    return (
      <section className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Hourglass className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">Aguardando os outros jogadores...</h2>
            <p className="text-sm text-muted-foreground">
              {state.submittedCount}/{state.totalCount} jogadores enviaram
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {state.players.map((player) => (
            <div
              key={player.userId}
              className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-xl">
                  {player.avatar ?? "🎲"}
                </span>
                <p className="truncate font-medium">
                  {player.nickname}
                  {player.isCurrentUser ? " (voce)" : ""}
                </p>
              </div>
              {player.hasSubmittedCharacter ? (
                <span className="flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">
                  <Check className="size-3" />
                  Pronto
                </span>
              ) : (
                <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                  Escrevendo
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <PencilLine className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold">
            Escreva quem sera o personagem do proximo jogador.
          </h2>
          <p className="text-sm text-muted-foreground">
            Voce escreve para{" "}
            <span className="font-semibold text-foreground">
              {state.writesForNickname ?? "o proximo jogador"}
            </span>
            .
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <Input
          value={characterText}
          maxLength={state.characterMaxLength}
          placeholder="Ex: Batman, Neymar, Pikachu"
          onChange={(event) => onChangeCharacter(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && canSubmit) {
              onSubmitCharacter();
            }
          }}
        />
        <p className="text-right text-xs text-muted-foreground">
          {characterText.length}/{state.characterMaxLength}
        </p>
        <Button
          type="button"
          size="lg"
          className="h-12 gap-2"
          disabled={!canSubmit}
          onClick={onSubmitCharacter}
        >
          <Send className="size-4" />
          Pronto!
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Depois de confirmar nao e possivel alterar.
        </p>
      </div>
    </section>
  );
}

type PlayingPhaseProps = {
  guessText: string;
  guessesToVote: StatePlayer[];
  isGuessOpen: boolean;
  onChangeGuess: (value: string) => void;
  onOpenGuess: (value: boolean) => void;
  onSubmitGuess: () => void;
  onVote: (targetUserId: string, correct: boolean) => void;
  ownPlayer: StatePlayer | null;
  otherPlayers: StatePlayer[];
  state: CustomGuessWhoStatePayload;
  wasGuessRejected: boolean;
};

function PlayingPhase({
  guessText,
  guessesToVote,
  isGuessOpen,
  onChangeGuess,
  onOpenGuess,
  onSubmitGuess,
  onVote,
  ownPlayer,
  otherPlayers,
  state,
  wasGuessRejected,
}: PlayingPhaseProps) {
  const canSubmitGuess =
    guessText.trim().length > 0 &&
    guessText.length <= state.characterMaxLength;

  return (
    <>
      <section className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
        <div className="mb-5">
          <h2 className="font-semibold">Meu card</h2>
          <p className="text-sm text-muted-foreground">
            {ownPlayer?.hasSolved
              ? "Voce ja descobriu seu personagem."
              : "Faca perguntas ao grupo para descobrir quem voce e."}
          </p>
        </div>

        <div
          className={cn(
            "rounded-md border px-4 py-6 text-center",
            ownPlayer?.hasSolved
              ? "border-primary/40 bg-primary/10"
              : "border-border bg-background"
          )}
        >
          {ownPlayer?.hasSolved && ownPlayer.character ? (
            <>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Seu personagem
              </p>
              <p className="mt-1 break-words text-3xl font-black">
                {ownPlayer.character}
              </p>
            </>
          ) : (
            <p className="text-2xl font-black">❓ Quem sou eu?</p>
          )}
        </div>

        {wasGuessRejected && !ownPlayer?.hasSolved ? (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            O grupo nao confirmou sua resposta. Voce pode tentar novamente.
          </p>
        ) : null}

        {ownPlayer?.pendingGuess ? (
          <div className="mt-4 rounded-md border border-accent/30 bg-accent/10 px-3 py-3 text-sm text-accent">
            <p className="font-semibold">Aguardando confirmacao</p>
            <p className="mt-1">
              Sua resposta: {ownPlayer.pendingGuess.guess}
            </p>
            <p className="mt-1">
              {ownPlayer.pendingGuess.yesCount + ownPlayer.pendingGuess.noCount}
              /{ownPlayer.pendingGuess.totalVoters} voto
              {ownPlayer.pendingGuess.totalVoters === 1 ? "" : "s"} recebido
              {ownPlayer.pendingGuess.yesCount +
                ownPlayer.pendingGuess.noCount ===
              1
                ? ""
                : "s"}
            </p>
          </div>
        ) : null}

        {ownPlayer && !ownPlayer.hasSolved && !ownPlayer.pendingGuess ? (
          isGuessOpen ? (
            <div className="mt-4 grid gap-2">
              <Input
                value={guessText}
                maxLength={state.characterMaxLength}
                placeholder="Quem voce acha que e?"
                onChange={(event) => onChangeGuess(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canSubmitGuess) {
                    onSubmitGuess();
                  }
                }}
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  disabled={!canSubmitGuess}
                  onClick={onSubmitGuess}
                >
                  <Send className="size-4" />
                  Enviar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onOpenGuess(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              size="lg"
              className="mt-4 h-12 w-full gap-2"
              onClick={() => onOpenGuess(true)}
            >
              <Sparkles className="size-4" />
              Ja sei quem eu sou!
            </Button>
          )
        ) : null}

        {ownPlayer?.hasSolved ? (
          <p className="mt-4 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
            Voce acertou em {ownPlayer.solvedOrder}o lugar. Agora so acompanha a
            partida e vota nas respostas dos outros.
          </p>
        ) : null}
      </section>

      {guessesToVote.length > 0 ? (
        <section className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
          <div className="mb-5">
            <h2 className="font-semibold">Votacao</h2>
            <p className="text-sm text-muted-foreground">
              Confirme se o jogador realmente acertou.
            </p>
          </div>

          <div className="space-y-3">
            {guessesToVote.map((player) => (
              <div
                key={player.userId}
                className="rounded-md border border-border bg-background px-3 py-3"
              >
                <p className="font-medium">
                  O jogador {player.nickname} realmente acertou quem ele e?
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Respondeu: {player.pendingGuess?.guess}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Personagem real: {player.character ?? "oculto"}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={() => onVote(player.userId, true)}
                  >
                    <ThumbsUp className="size-4" />
                    Sim
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => onVote(player.userId, false)}
                  >
                    <ThumbsDown className="size-4" />
                    Nao
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
        <div className="mb-5">
          <h2 className="font-semibold">Cards dos outros jogadores</h2>
          <p className="text-sm text-muted-foreground">
            Todos veem esses personagens, menos os proprios donos.
          </p>
        </div>

        <div className="space-y-3">
          {otherPlayers.map((player) => (
            <div
              key={player.userId}
              className="rounded-md border border-border bg-background px-3 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-xl">
                    {player.avatar ?? "🎲"}
                  </span>
                  <p className="truncate font-medium">{player.nickname}</p>
                </div>
                {player.hasSolved ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">
                    <Eye className="size-3" />
                    Assistindo
                  </span>
                ) : null}
              </div>

              <p className="mt-3 break-words text-xl font-black">
                {player.character ?? "?"}
              </p>

              {player.pendingGuess ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Respondeu &quot;{player.pendingGuess.guess}&quot; e aguarda
                  confirmacao ({player.pendingGuess.yesCount} sim /{" "}
                  {player.pendingGuess.noCount} nao)
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

type FinishedPhaseProps = {
  isHost: boolean;
  onPlayAgain: () => void;
  players: StatePlayer[];
};

function FinishedPhase({ isHost, onPlayAgain, players }: FinishedPhaseProps) {
  const ranking = [...players].sort((first, second) => {
    if (first.solvedOrder === null && second.solvedOrder === null) {
      return first.nickname.localeCompare(second.nickname);
    }

    if (first.solvedOrder === null) {
      return 1;
    }

    if (second.solvedOrder === null) {
      return -1;
    }

    return first.solvedOrder - second.solvedOrder;
  });

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Trophy className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold">Fim da partida</h2>
          <p className="text-sm text-muted-foreground">
            Ordem em que cada jogador descobriu seu personagem.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {ranking.map((player) => (
          <div
            key={player.userId}
            className="rounded-md border border-border bg-background px-3 py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-sm font-black">
                  {player.solvedOrder ? `${player.solvedOrder}o` : "—"}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {player.nickname}
                    {player.isCurrentUser ? " (voce)" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {player.solvedSeconds === null
                      ? "Nao descobriu"
                      : formatSolvedTime(player.solvedSeconds)}
                  </p>
                </div>
              </div>
              {player.solvedOrder === 1 ? (
                <span className="shrink-0 text-xl">🥇</span>
              ) : null}
            </div>

            <p className="mt-3 break-words text-lg font-black">
              {player.character ?? "?"}
            </p>
          </div>
        ))}
      </div>

      {isHost ? (
        <Button
          type="button"
          size="lg"
          className="mt-5 h-12 w-full gap-2"
          onClick={onPlayAgain}
        >
          <RotateCcw className="size-4" />
          Jogar novamente
        </Button>
      ) : (
        <p className="mt-5 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          O host pode iniciar uma nova partida com os mesmos jogadores.
        </p>
      )}
    </section>
  );
}

function formatSolvedTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `Acertou em ${seconds}s`;
  }

  return `Acertou em ${minutes}min ${seconds}s`;
}
