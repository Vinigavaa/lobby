"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Flag,
  Home,
  ListChecks,
  LogOut,
  RotateCcw,
  ThumbsDown,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSocketClient, type LobbySocketClient } from "@/lib/socket/client";
import { SOCKET_EVENTS } from "@/lib/socket/events";
import type {
  StopReviewAnswerPayload,
  StopReviewCategoryPayload,
  StopStatePayload,
} from "@/lib/socket/types";
import { cn } from "@/lib/utils";

const userIdKey = "partyroom:user-id";
const durationOptions = [30, 60, 120] as const;
const roundOptions = [3, 5, 10] as const;

type DurationOption = (typeof durationOptions)[number];
type RoundOption = (typeof roundOptions)[number];

type StopGameProps = {
  code: string;
};

export function StopGame({ code }: StopGameProps) {
  const router = useRouter();
  const socketRef = useRef<LobbySocketClient | null>(null);
  const autoSubmittedRef = useRef(false);
  const categoriesInitRef = useRef(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [state, setState] = useState<StopStatePayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [duration, setDuration] = useState<DurationOption>(60);
  const [totalRounds, setTotalRounds] = useState<RoundOption>(5);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set()
  );
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");

  const phase = state?.phase ?? "setup";
  const isHost = Boolean(state?.isHost);
  const hasSubmitted = Boolean(state?.hasSubmitted);

  const remaining =
    phase === "playing" && state?.roundEndsAt
      ? Math.max(
          0,
          Math.ceil((new Date(state.roundEndsAt).getTime() - now) / 1000)
        )
      : (state?.durationSeconds ?? 0);

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
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, {
        roomCode: code,
        userId: storedUserId,
      });
    });

    socket.on(SOCKET_EVENTS.STOP_STARTED, (payload) => {
      if (payload.roomCode === code) {
        router.push(payload.path);
      }
    });

    socket.on(SOCKET_EVENTS.STOP_STATE_UPDATED, (payload) => {
      if (payload.roomCode === code) {
        setState(payload);
        setError("");
      }
    });

    socket.on(SOCKET_EVENTS.STOP_BACK_TO_LOBBY_NAV, (payload) => {
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

  // Inicializa as categorias selecionadas pelo host uma unica vez.
  useEffect(() => {
    if (
      !categoriesInitRef.current &&
      state &&
      state.phase === "setup" &&
      state.categories.length > 0
    ) {
      categoriesInitRef.current = true;
      const initial = new Set(state.categories.map((category) => category.key));
      window.setTimeout(() => setSelectedCategories(initial), 0);
    }
  }, [state]);

  // Limpa as respostas locais ao comecar uma nova rodada.
  useEffect(() => {
    if (phase === "playing") {
      autoSubmittedRef.current = false;
      window.setTimeout(() => setAnswers({}), 0);
    }
  }, [phase, state?.roundNumber]);

  // Cronometro regressivo.
  useEffect(() => {
    if (phase !== "playing") {
      return;
    }

    const sync = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 250);

    return () => {
      window.clearTimeout(sync);
      window.clearInterval(interval);
    };
  }, [phase, state?.roundEndsAt]);

  // Envio automatico quando o tempo esgota.
  useEffect(() => {
    if (phase !== "playing" || hasSubmitted || remaining > 0) {
      return;
    }

    if (autoSubmittedRef.current || !currentUserId) {
      return;
    }

    autoSubmittedRef.current = true;
    const timeout = window.setTimeout(() => {
      socketRef.current?.emit(SOCKET_EVENTS.STOP_SUBMIT, {
        roomCode: code,
        userId: currentUserId,
        answers,
      });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [phase, hasSubmitted, remaining, answers, currentUserId, code]);

  function toggleCategory(key: string) {
    setSelectedCategories((previous) => {
      const next = new Set(previous);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  function beginGame() {
    if (!currentUserId || !isHost || selectedCategories.size < 2) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.STOP_BEGIN, {
      roomCode: code,
      userId: currentUserId,
      durationSeconds: duration,
      totalRounds,
      categories: Array.from(selectedCategories),
    });
  }

  function submitAnswers() {
    if (!currentUserId || phase !== "playing" || hasSubmitted) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.STOP_SUBMIT, {
      roomCode: code,
      userId: currentUserId,
      answers,
    });
  }

  function vote(targetUserId: string, category: string, reject: boolean) {
    if (!currentUserId) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.STOP_VOTE, {
      roomCode: code,
      userId: currentUserId,
      targetUserId,
      category,
      reject,
    });
  }

  function revealResult() {
    if (!currentUserId || !isHost) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.STOP_REVEAL_RESULT, {
      roomCode: code,
      userId: currentUserId,
    });
  }

  function nextRound() {
    if (!currentUserId || !isHost) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.STOP_NEXT_ROUND, {
      roomCode: code,
      userId: currentUserId,
    });
  }

  function backToLobby() {
    if (!currentUserId || !isHost) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.STOP_BACK_TO_LOBBY, {
      roomCode: code,
      userId: currentUserId,
    });
  }

  function leaveGame() {
    socketRef.current?.disconnect();
    router.push("/");
  }

  const isLastRound = state ? state.roundNumber >= state.totalRounds : false;

  return (
    <main className="min-h-screen bg-background px-5 py-6 text-foreground">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col justify-between gap-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Sala {code}
                {state && state.roundNumber > 0
                  ? ` · Rodada ${state.roundNumber}/${state.totalRounds}`
                  : ""}
              </p>
              <h1 className="font-heading text-3xl font-black">Stop</h1>
            </div>
            <div className="flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Flag className="size-6" />
            </div>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {!state ? (
            <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
              <h2 className="font-semibold">Carregando partida...</h2>
              <p className="text-sm text-muted-foreground">
                Aguardando estado da sala.
              </p>
            </div>
          ) : null}

          {state && phase === "setup" ? (
            <SetupPhase
              isHost={isHost}
              categories={state.categories}
              duration={duration}
              totalRounds={totalRounds}
              selectedCategories={selectedCategories}
              onToggleCategory={toggleCategory}
              onDurationChange={setDuration}
              onRoundsChange={setTotalRounds}
              onBegin={beginGame}
            />
          ) : null}

          {state && phase === "playing" ? (
            <PlayingPhase
              letter={state.letter}
              remaining={remaining}
              duration={state.durationSeconds}
              categories={state.categories}
              answers={answers}
              hasSubmitted={hasSubmitted}
              players={state.players}
              onAnswerChange={(key, value) =>
                setAnswers((previous) => ({ ...previous, [key]: value }))
              }
              onSubmit={submitAnswers}
            />
          ) : null}

          {state && phase === "review" && state.review ? (
            <ReviewPhase
              review={state.review}
              currentUserId={currentUserId}
              letter={state.letter}
              isHost={isHost}
              onVote={vote}
              onReveal={revealResult}
            />
          ) : null}

          {state && phase === "roundResult" && state.ranking ? (
            <ResultPhase
              ranking={state.ranking}
              review={state.review}
              isFinal={false}
              isHost={isHost}
              isLastRound={isLastRound}
              onNext={nextRound}
              onBackToLobby={backToLobby}
            />
          ) : null}

          {state && phase === "finished" && state.ranking ? (
            <ResultPhase
              ranking={state.ranking}
              review={null}
              isFinal
              isHost={isHost}
              isLastRound
              onNext={nextRound}
              onBackToLobby={backToLobby}
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

type SetupPhaseProps = {
  isHost: boolean;
  categories: StopStatePayload["categories"];
  duration: DurationOption;
  totalRounds: RoundOption;
  selectedCategories: Set<string>;
  onToggleCategory: (key: string) => void;
  onDurationChange: (value: DurationOption) => void;
  onRoundsChange: (value: RoundOption) => void;
  onBegin: () => void;
};

function SetupPhase({
  isHost,
  categories,
  duration,
  totalRounds,
  selectedCategories,
  onToggleCategory,
  onDurationChange,
  onRoundsChange,
  onBegin,
}: SetupPhaseProps) {
  if (!isHost) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
        <h2 className="font-semibold">Aguardando o host</h2>
        <p className="text-sm text-muted-foreground">
          O host esta escolhendo o tempo, as rodadas e as categorias.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
      <div>
        <h2 className="font-semibold">Configurar partida</h2>
        <p className="text-sm text-muted-foreground">
          Defina o tempo, o numero de rodadas e as categorias.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Tempo da rodada</Label>
        <div className="grid grid-cols-3 gap-2">
          {durationOptions.map((option) => (
            <SegmentButton
              key={option}
              active={duration === option}
              onClick={() => onDurationChange(option)}
            >
              {option === 30 ? "30s" : option === 60 ? "1 min" : "2 min"}
            </SegmentButton>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Rodadas</Label>
        <div className="grid grid-cols-3 gap-2">
          {roundOptions.map((option) => (
            <SegmentButton
              key={option}
              active={totalRounds === option}
              onClick={() => onRoundsChange(option)}
            >
              {option} rodadas
            </SegmentButton>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Categorias ({selectedCategories.size})</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.map((category) => {
            const checked = selectedCategories.has(category.key);

            return (
              <button
                key={category.key}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => onToggleCategory(category.key)}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
                  checked
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/60"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded border",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input"
                  )}
                >
                  {checked ? <CheckCircle2 className="size-4" /> : null}
                </span>
                <span className="font-medium">{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Button
        size="lg"
        className="h-12 w-full gap-2"
        disabled={selectedCategories.size < 2}
        onClick={onBegin}
      >
        <Flag className="size-4" />
        Iniciar rodada
      </Button>
      {selectedCategories.size < 2 ? (
        <p className="text-center text-sm text-muted-foreground">
          Selecione ao menos 2 categorias.
        </p>
      ) : null}
    </div>
  );
}

type PlayingPhaseProps = {
  letter: string | null;
  remaining: number;
  duration: number;
  categories: StopStatePayload["categories"];
  answers: Record<string, string>;
  hasSubmitted: boolean;
  players: StopStatePayload["players"];
  onAnswerChange: (key: string, value: string) => void;
  onSubmit: () => void;
};

function PlayingPhase({
  letter,
  remaining,
  duration,
  categories,
  answers,
  hasSubmitted,
  players,
  onAnswerChange,
  onSubmit,
}: PlayingPhaseProps) {
  const isUrgent = remaining <= 10;
  const percent = duration > 0 ? (remaining / duration) * 100 : 0;
  const submittedCount = players.filter((player) => player.submitted).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Letra
          </p>
          <p className="text-6xl font-black leading-none">{letter ?? "?"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Tempo
          </p>
          <p
            className={cn(
              "font-mono text-4xl font-black tabular-nums",
              isUrgent ? "text-destructive" : "text-foreground"
            )}
          >
            {formatTime(remaining)}
          </p>
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-linear"
          style={{ width: `${percent}%` }}
        />
      </div>

      {hasSubmitted ? (
        <div className="rounded-lg border border-accent/30 bg-accent/10 p-5 text-center text-sm text-accent-foreground">
          <p className="font-semibold">Respostas enviadas!</p>
          <p className="mt-1">
            Aguardando os demais ({submittedCount}/{players.length}).
          </p>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
          {categories.map((category) => (
            <div key={category.key} className="space-y-1.5">
              <Label htmlFor={`stop-${category.key}`}>{category.label}</Label>
              <Input
                id={`stop-${category.key}`}
                value={answers[category.key] ?? ""}
                maxLength={40}
                autoComplete="off"
                placeholder={
                  letter ? `Algo com ${letter}...` : "Digite sua resposta"
                }
                onChange={(event) =>
                  onAnswerChange(category.key, event.target.value)
                }
                className="h-11 bg-background text-base"
              />
            </div>
          ))}

          <Button
            type="button"
            size="lg"
            className="mt-2 h-12 w-full gap-2"
            onClick={onSubmit}
          >
            <Flag className="size-4" />
            Finalizar
          </Button>
        </div>
      )}
    </div>
  );
}

type ReviewPhaseProps = {
  review: StopReviewCategoryPayload[];
  currentUserId: string | null;
  letter: string | null;
  isHost: boolean;
  onVote: (targetUserId: string, category: string, reject: boolean) => void;
  onReveal: () => void;
};

function ReviewPhase({
  review,
  currentUserId,
  letter,
  isHost,
  onVote,
  onReveal,
}: ReviewPhaseProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <ListChecks className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">Revisao das respostas</h2>
            <p className="text-sm text-muted-foreground">
              Letra {letter}. Rejeite respostas que considerar invalidas.
            </p>
          </div>
        </div>
      </div>

      {review.map((category) => (
        <div
          key={category.key}
          className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20"
        >
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {category.label}
          </h3>
          <div className="space-y-2">
            {category.answers.map((answer) => (
              <ReviewAnswerRow
                key={`${category.key}-${answer.userId}`}
                answer={answer}
                votable={answer.userId !== currentUserId}
                onVote={(reject) => onVote(answer.userId, category.key, reject)}
              />
            ))}
          </div>
        </div>
      ))}

      {isHost ? (
        <Button type="button" size="lg" className="h-12 w-full gap-2" onClick={onReveal}>
          <Trophy className="size-4" />
          Calcular pontuacao
        </Button>
      ) : (
        <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-foreground">
          Aguardando o host calcular a pontuacao...
        </p>
      )}
    </div>
  );
}

type ReviewAnswerRowProps = {
  answer: StopReviewAnswerPayload;
  votable: boolean;
  onVote: (reject: boolean) => void;
};

function ReviewAnswerRow({ answer, votable, onVote }: ReviewAnswerRowProps) {
  const blank = answer.answer.length === 0;

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{answer.nickname}</p>
        <p
          className={cn(
            "truncate text-sm",
            blank ? "italic text-muted-foreground" : "text-foreground"
          )}
        >
          {blank ? "(em branco)" : answer.answer}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {answer.rejectCount > 0 ? (
          <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
            {answer.rejectCount} ✕
          </span>
        ) : null}
        {votable && !blank ? (
          <Button
            type="button"
            size="sm"
            variant={answer.rejectedByMe ? "default" : "secondary"}
            className="h-8 gap-1"
            onClick={() => onVote(!answer.rejectedByMe)}
          >
            <ThumbsDown className="size-3.5" />
            {answer.rejectedByMe ? "Rejeitado" : "Rejeitar"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

type ResultPhaseProps = {
  ranking: NonNullable<StopStatePayload["ranking"]>;
  review: StopReviewCategoryPayload[] | null;
  isFinal: boolean;
  isHost: boolean;
  isLastRound: boolean;
  onNext: () => void;
  onBackToLobby: () => void;
};

function ResultPhase({
  ranking,
  review,
  isFinal,
  isHost,
  isLastRound,
  onNext,
  onBackToLobby,
}: ResultPhaseProps) {
  const champion = ranking[0];

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Trophy className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">
              {isFinal ? "Ranking final" : "Resultado da rodada"}
            </h2>
            {isFinal && champion ? (
              <p className="text-sm text-muted-foreground">
                🏆 {champion.nickname} venceu com {champion.totalScore} pontos!
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Pontuacao da rodada e total acumulado.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {ranking.map((entry) => (
            <div
              key={entry.userId}
              className={cn(
                "flex items-center justify-between rounded-md border px-3 py-3",
                entry.position === 1
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background"
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-sm font-bold">
                  {entry.position}
                </span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-lg">
                  {entry.avatar ?? "🎯"}
                </span>
                <p className="truncate font-medium">{entry.nickname}</p>
              </div>
              <div className="text-right">
                <p className="font-bold tabular-nums">{entry.totalScore}</p>
                {!isFinal ? (
                  <p className="text-xs text-muted-foreground">
                    +{entry.roundScore} nesta rodada
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {review ? (
        <div className="space-y-3">
          {review.map((category) => (
            <div
              key={category.key}
              className="rounded-lg border border-border bg-card p-4 shadow-2xl shadow-black/20"
            >
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {category.label}
              </h3>
              <div className="space-y-1.5">
                {category.answers.map((answer) => (
                  <div
                    key={`${category.key}-${answer.userId}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{answer.nickname}: </span>
                      {answer.answer.length > 0 ? (
                        answer.answer
                      ) : (
                        <span className="italic text-muted-foreground">
                          (em branco)
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2 py-0.5 text-xs font-bold",
                        answer.points === 10
                          ? "bg-primary/15 text-primary"
                          : answer.points === 5
                            ? "bg-accent/20 text-accent-foreground"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {answer.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {isHost ? (
        <div className="grid gap-2">
          {isFinal ? null : (
            <Button type="button" size="lg" className="h-12 gap-2" onClick={onNext}>
              {isLastRound ? (
                <>
                  <Trophy className="size-4" />
                  Ver ranking final
                </>
              ) : (
                <>
                  <RotateCcw className="size-4" />
                  Proxima rodada
                </>
              )}
            </Button>
          )}
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="h-12 gap-2"
            onClick={onBackToLobby}
          >
            <Home className="size-4" />
            Voltar ao lobby
          </Button>
        </div>
      ) : (
        <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-foreground">
          {isFinal
            ? "Aguardando o host voltar ao lobby..."
            : "Aguardando o host iniciar a proxima rodada..."}
        </p>
      )}
    </div>
  );
}

type SegmentButtonProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function SegmentButton({ active, onClick, children }: SegmentButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-11 items-center justify-center gap-2 rounded-md border text-sm font-semibold transition",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/60"
      )}
    >
      {children}
    </button>
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
