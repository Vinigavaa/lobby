"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Crown,
  Flag,
  Hourglass,
  Loader2,
  LogOut,
  Home,
  SkipForward,
  Sparkles,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConnectionError } from "@/components/ui/connection-error";
import { createSocketClient, type LobbySocketClient } from "@/lib/socket/client";
import { SOCKET_EVENTS } from "@/lib/socket/events";
import type { PalpiteCertoStatePayload } from "@/lib/socket/types";
import { useConnectionGuard } from "@/lib/use-connection-guard";
import { cn } from "@/lib/utils";

import { PalpiteCertoReveal } from "./palpite-certo-reveal";
import { PalpiteCertoRanking } from "./palpite-certo-ranking";

const userIdKey = "partyroom:user-id";
/** Limite de digitos do campo, para o palpite caber na tela e no `Number`. */
const maxGuessLength = 15;

type PalpiteCertoGameProps = {
  code: string;
};

export function PalpiteCertoGame({ code }: PalpiteCertoGameProps) {
  const router = useRouter();
  const socketRef = useRef<LobbySocketClient | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [state, setState] = useState<PalpiteCertoStatePayload | null>(null);
  const [error, setError] = useState("");
  const [hasConnectionFailed, setHasConnectionFailed] = useConnectionGuard(
    state !== null
  );

  const phase = state?.phase ?? "question";
  const isHost = Boolean(state?.isHost);
  const roundNumber = state?.roundNumber ?? 1;

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

    socket.on(SOCKET_EVENTS.PALPITE_CERTO_STATE_UPDATED, (payload) => {
      if (payload.roomCode === code) {
        setState(payload);
        setError("");
      }
    });

    socket.on(SOCKET_EVENTS.PALPITE_CERTO_BACK_TO_LOBBY_NAV, (payload) => {
      if (payload.roomCode === code) {
        router.push(payload.path);
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

  function submitGuess(rawGuess: string) {
    const value = Number(rawGuess);

    if (!currentUserId || rawGuess === "" || !Number.isInteger(value)) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.PALPITE_CERTO_SUBMIT_GUESS, {
      roomCode: code,
      userId: currentUserId,
      value,
    });
  }

  function emitHostAction(
    event:
      | typeof SOCKET_EVENTS.PALPITE_CERTO_NEXT_QUESTION
      | typeof SOCKET_EVENTS.PALPITE_CERTO_END_MATCH
      | typeof SOCKET_EVENTS.PALPITE_CERTO_BACK_TO_LOBBY
  ) {
    if (!currentUserId || !isHost) {
      return;
    }

    socketRef.current?.emit(event, { roomCode: code, userId: currentUserId });
  }

  function leaveGame() {
    socketRef.current?.disconnect();
    router.push("/");
  }

  return (
    // `dvh` em vez de `vh`: no celular a barra do navegador entra na conta de
    // `100vh` e a base da tela fica fora da area visivel.
    <main className="min-h-dvh bg-background text-foreground">
      <section className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-5 py-6">
        <div className="flex-1 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Sala {code}
              {state ? ` · Rodada ${state.roundNumber}` : ""}
            </p>
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Target className="size-5" />
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
            <div className="rounded-[20px] border border-border bg-card p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center gap-3">
                <Loader2 className="size-5 animate-spin text-primary" />
                <div>
                  <h2 className="font-semibold">Carregando partida...</h2>
                  <p className="text-sm text-muted-foreground">
                    Aguardando estado da sala.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {state && phase === "question" && state.question ? (
            <QuestionPhase
              // Remontar a cada rodada zera o campo sem efeito colateral.
              key={roundNumber}
              question={state.question}
              hasGuessed={state.hasGuessed}
              ownGuess={state.ownGuess}
              answeredCount={state.answeredCount}
              totalPlayers={state.totalPlayers}
              onSubmit={submitGuess}
            />
          ) : null}

          {state && phase === "reveal" && state.question ? (
            <PalpiteCertoReveal
              key={state.roundNumber}
              question={state.question}
              correctValue={state.correctValue}
              roundResults={state.roundResults}
              currentUserId={currentUserId}
            />
          ) : null}

          {state && phase === "finished" ? (
            <FinalPhase ranking={state.ranking} />
          ) : null}

          {state && phase !== "finished" ? (
            <PalpiteCertoRanking ranking={state.ranking} />
          ) : null}

          {state && !isHost && phase !== "question" ? (
            <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-center text-sm text-accent">
              Aguardando o host escolher o proximo passo...
            </p>
          ) : null}
        </div>

        {/*
          Barra fixa na base: no celular a pagina fica mais alta que a tela e,
          no fluxo normal, os botoes do host so ficavam alcancaveis com a
          pagina rolada ate o fim.
        */}
        <div
          className={cn(
            "sticky bottom-0 -mx-5 space-y-2.5 border-t border-border bg-background px-5 pt-3",
            "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          )}
        >
          {state ? (
            <HostControls
              phase={phase}
              isHost={isHost}
              onNextQuestion={() =>
                emitHostAction(SOCKET_EVENTS.PALPITE_CERTO_NEXT_QUESTION)
              }
              onEndMatch={() =>
                emitHostAction(SOCKET_EVENTS.PALPITE_CERTO_END_MATCH)
              }
              onBackToLobby={() =>
                emitHostAction(SOCKET_EVENTS.PALPITE_CERTO_BACK_TO_LOBBY)
              }
            />
          ) : null}

          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="h-12 w-full gap-2 rounded-[14px] border border-border"
            onClick={leaveGame}
          >
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </section>
    </main>
  );
}

type QuestionPhaseProps = {
  question: NonNullable<PalpiteCertoStatePayload["question"]>;
  hasGuessed: boolean;
  ownGuess: number | null;
  answeredCount: number;
  totalPlayers: number;
  onSubmit: (guess: string) => void;
};

function QuestionPhase({
  question,
  hasGuessed,
  ownGuess,
  answeredCount,
  totalPlayers,
  onSubmit,
}: QuestionPhaseProps) {
  const [guess, setGuess] = useState("");

  return (
    <div className="space-y-5">
      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="rounded-[20px] border border-border bg-card p-6 text-center shadow-2xl shadow-black/20"
      >
        {question.emoji ? (
          <p className="mb-3 text-4xl">{question.emoji}</p>
        ) : null}
        <h2 className="font-heading text-2xl font-black leading-tight sm:text-3xl">
          {question.text}
        </h2>
      </motion.div>

      <AnimatePresence mode="wait">
        {hasGuessed ? (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="rounded-[20px] border border-accent/30 bg-accent/10 p-6 text-center"
          >
            <Hourglass className="mx-auto mb-3 size-6 animate-pulse text-accent" />
            <p className="font-semibold text-accent">
              Aguardando os outros jogadores...
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {answeredCount} de {totalPlayers}{" "}
              {totalPlayers === 1 ? "jogador respondeu" : "jogadores responderam"}
            </p>
            {ownGuess !== null ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Seu palpite:{" "}
                <span className="font-heading text-lg font-black text-foreground tabular-nums">
                  {ownGuess.toLocaleString("pt-BR")}
                </span>
              </p>
            ) : null}
          </motion.div>
        ) : (
          <motion.form
            key="guess"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit(guess);
            }}
          >
            <input
              // inputMode numeric abre o teclado numerico no celular; o filtro
              // no onChange e o que impede letras e caracteres especiais.
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={guess}
              onChange={(event) =>
                setGuess(
                  event.target.value.replace(/\D/g, "").slice(0, maxGuessLength)
                )
              }
              placeholder="Seu palpite"
              className={cn(
                "h-20 w-full rounded-[20px] border border-border bg-card text-center",
                "font-heading text-4xl font-black tabular-nums",
                "placeholder:font-sans placeholder:text-base placeholder:font-medium placeholder:text-muted-foreground",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
              )}
            />
            <Button
              type="submit"
              size="lg"
              disabled={guess === ""}
              className="h-14 w-full gap-2 rounded-[14px]"
            >
              <Sparkles className="size-4" />
              Confirmar Palpite
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {answeredCount} de {totalPlayers}{" "}
              {totalPlayers === 1 ? "jogador respondeu" : "jogadores responderam"}
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

type HostControlsProps = {
  phase: PalpiteCertoStatePayload["phase"];
  isHost: boolean;
  onNextQuestion: () => void;
  onEndMatch: () => void;
  onBackToLobby: () => void;
};

/**
 * Controles do host. A revelacao e automatica (o servidor muda de fase quando
 * o ultimo palpite entra), entao aqui so restam avancar e encerrar.
 */
function HostControls({
  phase,
  isHost,
  onNextQuestion,
  onEndMatch,
  onBackToLobby,
}: HostControlsProps) {
  if (!isHost) {
    return null;
  }

  if (phase === "finished") {
    return (
      <Button
        type="button"
        size="lg"
        className="h-14 w-full gap-2 rounded-[14px]"
        onClick={onBackToLobby}
      >
        <Home className="size-4" />
        Voltar ao lobby
      </Button>
    );
  }

  return (
    <div className="grid gap-2.5">
      {phase === "reveal" ? (
        <Button
          type="button"
          size="lg"
          className="h-14 gap-2 rounded-[14px]"
          onClick={onNextQuestion}
        >
          <SkipForward className="size-4" />
          Proxima Pergunta
        </Button>
      ) : null}
      <Button
        type="button"
        size="lg"
        variant="secondary"
        className="h-12 gap-2 rounded-[14px] border border-border"
        onClick={onEndMatch}
      >
        <Flag className="size-4" />
        Encerrar partida
      </Button>
    </div>
  );
}

type FinalPhaseProps = {
  ranking: PalpiteCertoStatePayload["ranking"];
};

function FinalPhase({ ranking }: FinalPhaseProps) {
  const champion = ranking.at(0);

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
        className="rounded-[20px] border border-primary bg-primary/10 p-6 text-center"
      >
        <Crown className="mx-auto mb-3 size-8 text-primary" />
        <h1 className="font-heading text-3xl font-black">Fim de jogo!</h1>
        {champion ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {champion.nickname} venceu com{" "}
            <span className="font-bold text-foreground">
              {champion.totalScore}
            </span>{" "}
            pontos.
          </p>
        ) : null}
      </motion.div>

      <PalpiteCertoRanking ranking={ranking} />
    </div>
  );
}
