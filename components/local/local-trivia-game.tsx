"use client";

import Link from "next/link";
import { ArrowLeft, Play, Smartphone, Sparkles, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { TriviaConfetti } from "@/components/trivia/trivia-confetti";
import { TriviaWheel } from "@/components/trivia/trivia-wheel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  applyTriviaRoundResult,
  buildTriviaFinalStats,
  buildTriviaRanking,
  createTriviaPlayerStats,
  drawNextTheme,
  scoreTriviaAnswer,
  updateFastestCorrect,
  type TriviaFinalStats,
  type TriviaPlayerStats,
  type TriviaRankingEntry,
} from "@/lib/trivia-engine";
import { triviaQuestionsData, type TriviaQuestionData } from "@/lib/trivia-questions-data";
import {
  getTriviaTheme,
  triviaMinimumPlayers,
  triviaQuestionSeconds,
  triviaRankingMs,
  triviaRevealAnswerMs,
  triviaTotalRounds,
  type TriviaThemeId,
} from "@/lib/trivia-themes";
import { cn } from "@/lib/utils";

const maximumPlayers = 8;
const optionLabels = ["A", "B", "C", "D"];

type Phase =
  | "setup"
  | "wheel"
  | "turn-intro"
  | "turn-handoff"
  | "question"
  | "reveal-answer"
  | "ranking"
  | "finished";

type LocalQuestion = TriviaQuestionData & { id: string; theme: TriviaThemeId };
type LocalAnswer = { optionIndex: number; elapsedMs: number };

function pickLocalQuestion(
  theme: TriviaThemeId,
  usedIds: string[]
): LocalQuestion {
  const pool = triviaQuestionsData[theme];
  const available = pool.filter(
    (_, index) => !usedIds.includes(`${theme}-${index}`)
  );
  const source = available.length > 0 ? available : pool;
  const picked = source[Math.floor(Math.random() * source.length)];
  const originalIndex = pool.indexOf(picked);

  return { ...picked, id: `${theme}-${originalIndex}`, theme };
}

export function LocalTriviaGame() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [playerCount, setPlayerCount] = useState(3);
  const [playerNames, setPlayerNames] = useState(() =>
    Array.from({ length: 3 }, (_, index) => `Jogador ${index + 1}`)
  );
  const [setupError, setSetupError] = useState("");

  const [players, setPlayers] = useState<TriviaPlayerStats[]>([]);
  const [roundNumber, setRoundNumber] = useState(1);
  const [themeBag, setThemeBag] = useState<TriviaThemeId[]>([]);
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([]);
  const [currentTheme, setCurrentTheme] = useState<TriviaThemeId | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<LocalQuestion | null>(
    null
  );
  const [turnIndex, setTurnIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, LocalAnswer | undefined>>(
    {}
  );
  const [previousRanking, setPreviousRanking] = useState<string[] | null>(null);
  const [ranking, setRanking] = useState<TriviaRankingEntry[]>([]);
  const [finalStats, setFinalStats] = useState<TriviaFinalStats[]>([]);
  const [lastRoundPoints, setLastRoundPoints] = useState<
    Record<string, number>
  >({});
  const [lastRoundCorrectCount, setLastRoundCorrectCount] = useState(0);
  const [remaining, setRemaining] = useState(triviaQuestionSeconds);

  const questionStartRef = useRef(0);

  function updatePlayerCount(value: number) {
    const nextCount = Math.min(
      maximumPlayers,
      Math.max(triviaMinimumPlayers, Number.isFinite(value) ? value : triviaMinimumPlayers)
    );

    setPlayerCount(nextCount);
    setPlayerNames((currentNames) =>
      Array.from(
        { length: nextCount },
        (_, index) => currentNames[index] ?? `Jogador ${index + 1}`
      )
    );
    setSetupError("");
  }

  function updatePlayerName(index: number, value: string) {
    setPlayerNames((currentNames) =>
      currentNames.map((name, currentIndex) =>
        currentIndex === index ? value : name
      )
    );
    setSetupError("");
  }

  function startMatch() {
    const names = playerNames.slice(0, playerCount).map((name) => name.trim());

    if (playerCount < triviaMinimumPlayers || playerCount > maximumPlayers) {
      setSetupError(`Escolha entre ${triviaMinimumPlayers} e ${maximumPlayers} jogadores.`);
      return;
    }

    if (names.some((name) => name.length === 0)) {
      setSetupError("Preencha o nome de todos os jogadores.");
      return;
    }

    const initialPlayers = names.map((name, index) =>
      createTriviaPlayerStats({ userId: `p${index}`, nickname: name, avatar: null })
    );
    const { theme, remainingBag } = drawNextTheme([]);
    const question = pickLocalQuestion(theme, []);

    setPlayers(initialPlayers);
    setRoundNumber(1);
    setThemeBag(remainingBag);
    setUsedQuestionIds([question.id]);
    setCurrentTheme(theme);
    setCurrentQuestion(question);
    setTurnIndex(0);
    setAnswers({});
    setPreviousRanking(null);
    setSetupError("");
    setPhase("wheel");
  }

  function beginTurns() {
    setTurnIndex(0);
    setPhase("turn-intro");
  }

  useEffect(() => {
    if (phase !== "turn-intro") {
      return;
    }

    const timeout = window.setTimeout(() => setPhase("turn-handoff"), 1400);

    return () => window.clearTimeout(timeout);
  }, [phase, turnIndex]);

  function startTurnQuestion() {
    questionStartRef.current = Date.now();
    setRemaining(triviaQuestionSeconds);
    setPhase("question");
  }

  useEffect(() => {
    if (phase !== "question") {
      return;
    }

    const interval = window.setInterval(() => {
      setRemaining((value) => (value <= 0 ? 0 : value - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "question" || remaining > 0) {
      return;
    }

    const timeout = window.setTimeout(() => recordAnswer(-1), 0);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, remaining]);

  function recordAnswer(optionIndex: number) {
    const currentPlayer = players[turnIndex];

    if (!currentPlayer) {
      return;
    }

    const elapsedMs = Math.min(
      triviaQuestionSeconds * 1000,
      Date.now() - questionStartRef.current
    );
    const nextAnswers = {
      ...answers,
      [currentPlayer.userId]: { optionIndex, elapsedMs },
    };

    setAnswers(nextAnswers);

    const nextTurnIndex = turnIndex + 1;

    if (nextTurnIndex < players.length) {
      setTurnIndex(nextTurnIndex);
      setPhase("turn-intro");
      return;
    }

    finishRound(nextAnswers);
  }

  function finishRound(finalAnswers: Record<string, LocalAnswer | undefined>) {
    const theme = currentTheme;
    const question = currentQuestion;
    const priorRanking = buildTriviaRanking(players).map((entry) => entry.userId);
    const pointsByUserId: Record<string, number> = {};
    let correctCount = 0;

    const nextPlayers = players.map((playerStats) => {
      const answer = finalAnswers[playerStats.userId];
      const isCorrect = Boolean(
        question && answer && answer.optionIndex === question.correctIndex
      );
      const elapsedMs = answer ? answer.elapsedMs : triviaQuestionSeconds * 1000;
      const points = theme ? scoreTriviaAnswer(isCorrect, elapsedMs) : 0;

      pointsByUserId[playerStats.userId] = points;

      if (isCorrect) {
        correctCount += 1;
      }

      let nextStats = applyTriviaRoundResult(playerStats, {
        theme: theme ?? "variedades",
        isCorrect,
        answered: Boolean(answer),
        points,
      });

      if (isCorrect) {
        nextStats = updateFastestCorrect(nextStats, elapsedMs);
      }

      return nextStats;
    });

    setPlayers(nextPlayers);
    setPreviousRanking(priorRanking);
    setLastRoundPoints(pointsByUserId);
    setLastRoundCorrectCount(correctCount);
    setRanking(buildTriviaRanking(nextPlayers));
    setPhase("reveal-answer");
  }

  useEffect(() => {
    if (phase !== "reveal-answer") {
      return;
    }

    const timeout = window.setTimeout(() => setPhase("ranking"), triviaRevealAnswerMs);

    return () => window.clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "ranking") {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (roundNumber >= triviaTotalRounds) {
        setFinalStats(buildTriviaFinalStats(players, triviaTotalRounds));
        setPhase("finished");
        return;
      }

      const { theme: nextTheme, remainingBag } = drawNextTheme(themeBag);
      const question = pickLocalQuestion(nextTheme, usedQuestionIds);

      setThemeBag(remainingBag);
      setUsedQuestionIds((current) => [...current, question.id]);
      setCurrentTheme(nextTheme);
      setCurrentQuestion(question);
      setRoundNumber((value) => value + 1);
      setAnswers({});
      setRemaining(triviaQuestionSeconds);
      setPhase("wheel");
    }, triviaRankingMs);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function resetToSetup() {
    setPhase("setup");
    setPlayers([]);
    setRoundNumber(1);
    setSetupError("");
  }

  const hideChrome = phase === "question" || phase === "turn-handoff";
  const currentPlayer = players[turnIndex] ?? null;
  const theme = currentTheme ? getTriviaTheme(currentTheme) : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6 sm:max-w-2xl sm:px-8">
        {hideChrome ? null : (
          <header className="flex items-center justify-between">
            <Button asChild variant="ghost" size="icon" aria-label="Voltar">
              <Link href="/local">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Smartphone className="size-3.5" />
              Um celular
            </div>
          </header>
        )}

        <div
          className={cn(
            "flex flex-1 flex-col justify-center",
            hideChrome ? "py-0" : "py-8"
          )}
        >
          {phase === "setup" ? (
            <SetupView
              playerCount={playerCount}
              playerNames={playerNames}
              error={setupError}
              onPlayerCountChange={updatePlayerCount}
              onPlayerNameChange={updatePlayerName}
              onStart={startMatch}
            />
          ) : null}

          {phase === "wheel" && currentTheme ? (
            <div className="space-y-4">
              <p className="text-center text-sm font-medium text-muted-foreground">
                Rodada {roundNumber}/{triviaTotalRounds}
              </p>
              <TriviaWheel
                spinKey={roundNumber}
                themeId={currentTheme}
                themeLabel={theme?.label ?? ""}
                themeEmoji={theme?.emoji ?? ""}
                onRevealComplete={beginTurns}
              />
            </div>
          ) : null}

          {phase === "turn-intro" && currentPlayer ? (
            <TurnCard
              eyebrow={`Rodada ${roundNumber}/${triviaTotalRounds}`}
              title={`Vez de ${currentPlayer.nickname}`}
              description="Prepare-se, a pergunta esta chegando."
            />
          ) : null}

          {phase === "turn-handoff" && currentPlayer ? (
            <TurnCard
              eyebrow={`Rodada ${roundNumber}/${triviaTotalRounds}`}
              title={`Passe o celular para ${currentPlayer.nickname}`}
              description="Ninguem mais pode ver a proxima tela."
            >
              <Button size="lg" className="h-12 w-full gap-2" onClick={startTurnQuestion}>
                <Play className="size-4" />
                Estou pronto, revelar
              </Button>
            </TurnCard>
          ) : null}

          {phase === "question" && currentQuestion && currentPlayer ? (
            <QuestionView
              nickname={currentPlayer.nickname}
              question={currentQuestion}
              remaining={remaining}
              onAnswer={recordAnswer}
            />
          ) : null}

          {phase === "reveal-answer" && currentQuestion ? (
            <RevealView
              question={currentQuestion}
              players={players}
              pointsByUserId={lastRoundPoints}
              correctCount={lastRoundCorrectCount}
            />
          ) : null}

          {phase === "ranking" ? (
            <RankingView ranking={ranking} previousRanking={previousRanking} />
          ) : null}

          {phase === "finished" ? (
            <FinalView finalStats={finalStats} onPlayAgain={startMatch} onReset={resetToSetup} />
          ) : null}
        </div>
      </section>
    </main>
  );
}

type SetupViewProps = {
  playerCount: number;
  playerNames: string[];
  error: string;
  onPlayerCountChange: (value: number) => void;
  onPlayerNameChange: (index: number, value: string) => void;
  onStart: () => void;
};

function SetupView({
  playerCount,
  playerNames,
  error,
  onPlayerCountChange,
  onPlayerNameChange,
  onStart,
}: SetupViewProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Sparkles className="size-6" />
        </div>
        <div className="space-y-3">
          <h1 className="font-heading text-4xl font-black leading-none tracking-normal">
            Trivia local
          </h1>
          <p className="max-w-sm text-base leading-7 text-muted-foreground">
            Configure os jogadores e passe o celular a cada pergunta.
          </p>
        </div>
      </div>

      <section className="space-y-5 rounded-[20px] border border-border bg-card p-5 shadow-2xl shadow-black/25">
        <div className="space-y-2">
          <Label htmlFor="trivia-player-count" className="flex items-center gap-2">
            <Users className="size-4" />
            Jogadores
          </Label>
          <Input
            id="trivia-player-count"
            type="number"
            min={triviaMinimumPlayers}
            max={maximumPlayers}
            value={playerCount}
            onChange={(event) => onPlayerCountChange(Number(event.target.value))}
            className="h-11 bg-background text-base"
          />
        </div>

        <div className="space-y-3">
          <Label>Nomes dos jogadores</Label>
          <div className="grid gap-2">
            {playerNames.slice(0, playerCount).map((name, index) => (
              <Input
                key={index}
                value={name}
                onChange={(event) => onPlayerNameChange(index, event.target.value)}
                maxLength={24}
                autoComplete="off"
                aria-label={`Nome do jogador ${index + 1}`}
                className="h-11 bg-background text-base"
              />
            ))}
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button size="lg" className="h-12 w-full gap-2" onClick={onStart}>
          <Play className="size-4" />
          Iniciar
        </Button>
      </section>
    </div>
  );
}

type TurnCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
};

function TurnCard({ eyebrow, title, description, children }: TurnCardProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-card px-3 py-2 text-center text-xs font-medium text-muted-foreground">
        {eyebrow}
      </div>
      <section className="space-y-6 rounded-[20px] border border-border bg-card p-5 text-center shadow-2xl shadow-black/25">
        <div className="space-y-3">
          <h1 className="font-heading text-3xl font-black leading-tight tracking-normal">
            {title}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {children}
      </section>
    </div>
  );
}

type QuestionViewProps = {
  nickname: string;
  question: LocalQuestion;
  remaining: number;
  onAnswer: (optionIndex: number) => void;
};

function QuestionView({ nickname, question, remaining, onAnswer }: QuestionViewProps) {
  const isUrgent = remaining <= 5;

  return (
    <div className="space-y-5">
      <p className="text-center text-sm font-medium text-muted-foreground">
        Vez de {nickname}
      </p>

      <div className="flex items-center justify-between rounded-[20px] border border-border bg-card p-5">
        <h2 className="max-w-xs text-lg font-bold leading-snug">{question.question}</h2>
        <div
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-full border-2 font-heading text-xl font-black",
            isUrgent ? "border-destructive text-destructive" : "border-primary text-primary"
          )}
        >
          {remaining}
        </div>
      </div>

      <div className="grid gap-2.5">
        {question.options.map((option, index) => (
          <button
            key={option}
            type="button"
            onClick={() => onAnswer(index)}
            className={cn(
              "flex items-center gap-3 rounded-[14px] border border-border bg-card p-4 text-left transition",
              "hover:border-primary/70 hover:bg-primary/5",
              "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
              {optionLabels[index]}
            </span>
            <span className="font-medium">{option}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

type RevealViewProps = {
  question: LocalQuestion;
  players: TriviaPlayerStats[];
  pointsByUserId: Record<string, number>;
  correctCount: number;
};

function RevealView({ question, players, pointsByUserId, correctCount }: RevealViewProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2.5 rounded-[20px] border border-border bg-card p-5">
        {question.options.map((option, index) => {
          const isCorrect = index === question.correctIndex;

          return (
            <div
              key={option}
              className={cn(
                "flex items-center gap-3 rounded-[14px] border p-4",
                isCorrect ? "border-accent bg-accent/10" : "border-border bg-background"
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                {optionLabels[index]}
              </span>
              <span className="font-medium">{option}</span>
            </div>
          );
        })}
      </div>

      <div className="rounded-[20px] border border-border bg-card p-5 text-center">
        <p className="text-sm text-muted-foreground">Acertaram esta rodada</p>
        <p className="font-heading text-3xl font-black">
          {correctCount}/{players.length}
        </p>
      </div>

      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.userId}
            className="flex items-center justify-between rounded-[14px] border border-border bg-card px-4 py-2.5"
          >
            <span className="font-medium">{player.nickname}</span>
            <span
              className={cn(
                "font-bold",
                (pointsByUserId[player.userId] ?? 0) > 0 ? "text-accent" : "text-muted-foreground"
              )}
            >
              +{pointsByUserId[player.userId] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const medalByPosition: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

type RankingViewProps = {
  ranking: TriviaRankingEntry[];
  previousRanking: string[] | null;
};

function RankingView({ ranking, previousRanking }: RankingViewProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-center font-heading text-2xl font-black">Classificacao</h2>
      <div className="space-y-2">
        {ranking.map((entry) => {
          const previousIndex = previousRanking ? previousRanking.indexOf(entry.userId) : -1;
          const delta = previousIndex === -1 ? 0 : previousIndex + 1 - entry.position;

          return (
            <div
              key={entry.userId}
              className={cn(
                "flex items-center justify-between rounded-[14px] border px-4 py-3",
                entry.position === 1 ? "border-primary bg-primary/10" : "border-border bg-card"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-bold">
                  {medalByPosition[entry.position] ?? entry.position}
                </span>
                <span className="font-medium">{entry.nickname}</span>
                {delta !== 0 ? (
                  <span
                    className={cn(
                      "text-xs font-bold",
                      delta > 0 ? "text-accent" : "text-destructive"
                    )}
                  >
                    {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
                  </span>
                ) : null}
              </div>
              <span className="font-heading text-lg font-black tabular-nums">
                {entry.totalScore}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type FinalViewProps = {
  finalStats: TriviaFinalStats[];
  onPlayAgain: () => void;
  onReset: () => void;
};

function FinalView({ finalStats, onPlayAgain, onReset }: FinalViewProps) {
  const podium = [...finalStats]
    .sort((a, b) => b.totalScore - a.totalScore || b.correctCount - a.correctCount)
    .slice(0, 3);
  const podiumIcons = ["🏆", "🥈", "🥉"];

  return (
    <div className="relative space-y-5">
      <TriviaConfetti />
      <div className="space-y-3 text-center">
        <h1 className="font-heading text-3xl font-black">Fim de jogo!</h1>
        <p className="text-sm text-muted-foreground">Trivia · {triviaTotalRounds} rodadas</p>
      </div>

      <div className="grid gap-2.5">
        {podium.map((player, index) => (
          <div
            key={player.userId}
            className="flex items-center justify-between rounded-[14px] border border-border bg-card px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{podiumIcons[index]}</span>
              <span className="font-semibold">{player.nickname}</span>
            </div>
            <span className="font-heading text-xl font-black tabular-nums">
              {player.totalScore}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        {finalStats.map((player) => {
          const bestTheme = player.bestTheme ? getTriviaTheme(player.bestTheme) : null;

          return (
            <div key={player.userId} className="rounded-[14px] border border-border bg-card p-4">
              <p className="mb-2 font-semibold">{player.nickname}</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                <StatItem label="Acertos" value={`${player.correctCount}/${triviaTotalRounds}`} />
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
                  value={bestTheme ? `${bestTheme.emoji} ${bestTheme.label}` : "—"}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-2 pt-1">
        <Button size="lg" className="h-12 w-full gap-2" onClick={onPlayAgain}>
          <Play className="size-4" />
          Jogar novamente
        </Button>
        <Button size="lg" variant="secondary" className="h-12 w-full" onClick={onReset}>
          Alterar jogadores
        </Button>
      </div>
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
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}
