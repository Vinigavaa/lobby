"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Home,
  LogOut,
  Minus,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createSocketClient, type LobbySocketClient } from "@/lib/socket/client";
import { SOCKET_EVENTS } from "@/lib/socket/events";
import type { TriviaStatePayload } from "@/lib/socket/types";
import { cn } from "@/lib/utils";

import { TriviaWheel } from "./trivia-wheel";

const userIdKey = "partyroom:user-id";
const optionLabels = ["A", "B", "C", "D"];

type TriviaGameProps = {
  code: string;
};

export function TriviaGame({ code }: TriviaGameProps) {
  const router = useRouter();
  const socketRef = useRef<LobbySocketClient | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [state, setState] = useState<TriviaStatePayload | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");

  const phase = state?.phase ?? "wheel";
  const isHost = Boolean(state?.isHost);

  const remainingSeconds =
    phase === "question" && state?.phaseEndsAt
      ? Math.max(0, Math.ceil((new Date(state.phaseEndsAt).getTime() - now) / 1000))
      : 0;

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
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomCode: code, userId: storedUserId });
    });

    socket.on(SOCKET_EVENTS.TRIVIA_STATE_UPDATED, (payload) => {
      if (payload.roomCode === code) {
        setState(payload);
        setError("");
      }
    });

    socket.on(SOCKET_EVENTS.TRIVIA_BACK_TO_LOBBY_NAV, (payload) => {
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
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, router]);

  useEffect(() => {
    if (phase !== "question") {
      return;
    }

    const sync = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 200);

    return () => {
      window.clearTimeout(sync);
      window.clearInterval(interval);
    };
  }, [phase, state?.phaseEndsAt]);

  function submitAnswer(optionIndex: number) {
    if (!currentUserId || phase !== "question" || state?.hasAnswered) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.TRIVIA_SUBMIT_ANSWER, {
      roomCode: code,
      userId: currentUserId,
      optionIndex,
    });
  }

  function playAgain() {
    if (!currentUserId || !isHost) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.TRIVIA_NEXT_MATCH, {
      roomCode: code,
      userId: currentUserId,
    });
  }

  function backToLobby() {
    if (!currentUserId || !isHost) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.TRIVIA_BACK_TO_LOBBY, {
      roomCode: code,
      userId: currentUserId,
    });
  }

  function leaveGame() {
    socketRef.current?.disconnect();
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-background px-5 py-6 text-foreground">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col justify-between gap-6">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Sala {code}
              {state ? ` · Rodada ${state.roundNumber}/${state.totalRounds}` : ""}
            </p>
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </div>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {!state ? (
            <div className="rounded-[20px] border border-border bg-card p-5 shadow-2xl shadow-black/20">
              <h2 className="font-semibold">Carregando partida...</h2>
              <p className="text-sm text-muted-foreground">
                Aguardando estado da sala.
              </p>
            </div>
          ) : null}

          {state && phase === "wheel" && state.theme ? (
            <TriviaWheel
              spinKey={state.roundNumber}
              themeId={state.theme.id}
              themeLabel={state.theme.label}
              themeEmoji={state.theme.emoji}
            />
          ) : null}

          {state && phase === "question" && state.question ? (
            <QuestionPhase
              question={state.question}
              remainingSeconds={remainingSeconds}
              hasAnswered={state.hasAnswered}
              selectedOptionIndex={state.selectedOptionIndex}
              players={state.players}
              onAnswer={submitAnswer}
            />
          ) : null}

          {state && phase === "reveal-answer" && state.question && state.reveal ? (
            <RevealPhase
              options={state.question.options}
              reveal={state.reveal}
              players={state.players}
              currentUserId={currentUserId}
            />
          ) : null}

          {state && phase === "ranking" && state.ranking ? (
            <RankingPhase
              ranking={state.ranking}
              isLastRound={state.roundNumber >= state.totalRounds}
            />
          ) : null}

          {state && phase === "finished" && state.finalStats ? (
            <FinalPhase
              finalStats={state.finalStats}
              isHost={isHost}
              onPlayAgain={playAgain}
              onBackToLobby={backToLobby}
            />
          ) : null}
        </div>

        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="h-12 gap-2 rounded-[14px] border border-border"
          onClick={leaveGame}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </section>
    </main>
  );
}

type QuestionPhaseProps = {
  question: NonNullable<TriviaStatePayload["question"]>;
  remainingSeconds: number;
  hasAnswered: boolean;
  selectedOptionIndex: number | null;
  players: TriviaStatePayload["players"];
  onAnswer: (optionIndex: number) => void;
};

function QuestionPhase({
  question,
  remainingSeconds,
  hasAnswered,
  selectedOptionIndex,
  players,
  onAnswer,
}: QuestionPhaseProps) {
  const isUrgent = remainingSeconds <= 5;
  const answeredCount = players.filter((player) => player.hasAnswered).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-[20px] border border-border bg-card p-5">
        <h2 className="max-w-xs text-lg font-bold leading-snug">
          {question.question}
        </h2>
        <div
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-full border-2 font-heading text-xl font-black",
            isUrgent
              ? "border-destructive text-destructive"
              : "border-primary text-primary"
          )}
        >
          {remainingSeconds}
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${(remainingSeconds / 20) * 100}%` }}
          transition={{ duration: 0.2, ease: "linear" }}
        />
      </div>

      {hasAnswered ? (
        <div className="rounded-[20px] border border-accent/30 bg-accent/10 p-5 text-center">
          <p className="font-semibold text-accent">Resposta enviada!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Aguardando os demais ({answeredCount}/{players.length}).
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5">
          {question.options.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() => onAnswer(index)}
              className={cn(
                "flex items-center gap-3 rounded-[14px] border border-border bg-card p-4 text-left transition",
                "hover:border-primary/70 hover:bg-primary/5",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
                selectedOptionIndex === index && "border-primary bg-primary/10"
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                {optionLabels[index]}
              </span>
              <span className="font-medium">{option}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type RevealPhaseProps = {
  options: string[];
  reveal: NonNullable<TriviaStatePayload["reveal"]>;
  players: TriviaStatePayload["players"];
  currentUserId: string | null;
};

function RevealPhase({ options, reveal, players, currentUserId }: RevealPhaseProps) {
  const myPoints = currentUserId ? (reveal.pointsByUserId[currentUserId] ?? 0) : 0;

  return (
    <div className="space-y-5">
      <div className="space-y-2.5 rounded-[20px] border border-border bg-card p-5">
        {options.map((option, index) => {
          const isCorrect = index === reveal.correctIndex;

          return (
            <div
              key={option}
              className={cn(
                "flex items-center gap-3 rounded-[14px] border p-4",
                isCorrect
                  ? "border-accent bg-accent/10"
                  : "border-border bg-background"
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                {optionLabels[index]}
              </span>
              <span className="flex-1 font-medium">{option}</span>
              {isCorrect ? (
                <CheckCircle2 className="size-5 shrink-0 text-accent" />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-[20px] border border-border bg-card p-5">
        <div>
          <p className="text-sm text-muted-foreground">Acertaram esta rodada</p>
          <p className="font-heading text-3xl font-black">
            {reveal.correctCount}/{players.length}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Voce fez</p>
          <p
            className={cn(
              "font-heading text-3xl font-black",
              myPoints > 0 ? "text-accent" : "text-muted-foreground"
            )}
          >
            +{myPoints}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.userId}
            className="flex items-center justify-between rounded-[14px] border border-border bg-card px-4 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{player.avatar ?? "🎲"}</span>
              <span className="font-medium">{player.nickname}</span>
            </div>
            <span
              className={cn(
                "font-bold",
                (reveal.pointsByUserId[player.userId] ?? 0) > 0
                  ? "text-accent"
                  : "text-muted-foreground"
              )}
            >
              +{reveal.pointsByUserId[player.userId] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type RankingPhaseProps = {
  ranking: NonNullable<TriviaStatePayload["ranking"]>;
  isLastRound: boolean;
};

const medalByPosition: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function RankingPhase({ ranking, isLastRound }: RankingPhaseProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-[20px] border border-border bg-card p-5">
        <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Trophy className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold">Classificacao geral</h2>
          <p className="text-sm text-muted-foreground">
            {isLastRound ? "Ultima rodada!" : "Pontuacao acumulada ate agora."}
          </p>
        </div>
      </div>

      <motion.div layout className="space-y-2">
        {ranking.map((entry) => {
          const delta =
            entry.previousPosition === null
              ? 0
              : entry.previousPosition - entry.position;

          return (
            <motion.div
              layout
              key={entry.userId}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className={cn(
                "flex items-center justify-between rounded-[14px] border px-4 py-3",
                entry.position === 1
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-bold">
                  {medalByPosition[entry.position] ?? entry.position}
                </span>
                <span className="font-medium">{entry.nickname}</span>
              </div>
              <div className="flex items-center gap-2">
                {delta > 0 ? (
                  <span className="flex items-center text-xs font-bold text-accent">
                    <ArrowUp className="size-3.5" />
                    {delta}
                  </span>
                ) : delta < 0 ? (
                  <span className="flex items-center text-xs font-bold text-destructive">
                    <ArrowDown className="size-3.5" />
                    {Math.abs(delta)}
                  </span>
                ) : (
                  <Minus className="size-3.5 text-muted-foreground" />
                )}
                <span className="font-heading text-lg font-black tabular-nums">
                  {entry.totalScore}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

type FinalPhaseProps = {
  finalStats: NonNullable<TriviaStatePayload["finalStats"]>;
  isHost: boolean;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
};

function FinalPhase({
  finalStats,
  isHost,
  onPlayAgain,
  onBackToLobby,
}: FinalPhaseProps) {
  const podium = [...finalStats]
    .sort((a, b) => b.totalScore - a.totalScore || b.correctCount - a.correctCount)
    .slice(0, 3);
  const podiumIcons = ["🏆", "🥈", "🥉"];

  return (
    <div className="space-y-5">
      <div className="space-y-3 text-center">
        <h1 className="font-heading text-3xl font-black">Fim de jogo!</h1>
        <p className="text-sm text-muted-foreground">Trivia · 12 rodadas</p>
      </div>

      <div className="grid gap-2.5">
        {podium.map((player, index) => (
          <div
            key={player.userId}
            className="flex items-center justify-between rounded-[14px] border border-border bg-card px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{podiumIcons[index]}</span>
              <span className="text-xl">{player.avatar ?? "🎲"}</span>
              <span className="font-semibold">{player.nickname}</span>
            </div>
            <span className="font-heading text-xl font-black tabular-nums">
              {player.totalScore}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        {finalStats.map((player) => (
          <div
            key={player.userId}
            className="rounded-[14px] border border-border bg-card p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg">{player.avatar ?? "🎲"}</span>
              <span className="font-semibold">{player.nickname}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <StatItem label="Acertos" value={`${player.correctCount}/12`} />
              <StatItem label="Aproveitamento" value={`${player.accuracyPercent}%`} />
              <StatItem
                label="Mais rapida"
                value={
                  player.fastestCorrectMs !== null
                    ? `${(player.fastestCorrectMs / 1000).toFixed(1)}s`
                    : "—"
                }
              />
              <StatItem label="Sequencia" value={`${player.bestStreak}`} />
              <StatItem label="Melhor rodada" value={`${player.bestRoundScore} pts`} />
              <StatItem
                label="Melhor tema"
                value={
                  player.bestTheme
                    ? `${player.bestTheme.emoji} ${player.bestTheme.label}`
                    : "—"
                }
              />
            </div>
          </div>
        ))}
      </div>

      {isHost ? (
        <div className="grid gap-2.5">
          <Button
            type="button"
            size="lg"
            className="h-14 gap-2 rounded-[14px]"
            onClick={onPlayAgain}
          >
            <RotateCcw className="size-4" />
            Jogar novamente
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="h-14 gap-2 rounded-[14px] border border-border"
            onClick={onBackToLobby}
          >
            <Home className="size-4" />
            Voltar ao lobby
          </Button>
        </div>
      ) : (
        <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-center text-sm text-accent">
          Aguardando o host escolher o proximo passo...
        </p>
      )}
    </div>
  );
}

type StatItemProps = {
  label: string;
  value: string;
};

function StatItem({ label, value }: StatItemProps) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}
