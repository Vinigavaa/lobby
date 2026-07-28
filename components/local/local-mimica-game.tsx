"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Drama,
  Eye,
  RotateCcw,
  Smartphone,
  TimerReset,
  Trophy,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { mimicaWordsData } from "@/lib/mimica-words-data";
import { cn } from "@/lib/utils";

const randomCategory = "Aleatória";
const durationOptions = [30, 60] as const;
const defaultDuration = 60;

type DurationOption = (typeof durationOptions)[number];
type Category = keyof typeof mimicaWordsData;
type CategoryOption = Category | typeof randomCategory;
type Phase = "setup" | "reveal" | "playing" | "result";

const categoryOptions: CategoryOption[] = [
  randomCategory,
  ...(Object.keys(mimicaWordsData) as Category[]),
];

type RoundResult = {
  category: Category;
  word: string;
  success: boolean;
};

export function LocalMimicaGame() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [category, setCategory] = useState<CategoryOption>(randomCategory);
  const [duration, setDuration] = useState<DurationOption>(defaultDuration);
  const [currentCategory, setCurrentCategory] = useState<Category>("Animais");
  const [currentWord, setCurrentWord] = useState("");
  const [remaining, setRemaining] = useState(defaultDuration);
  const [score, setScore] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);

  function drawRound(previousWord?: string) {
    const selectedCategory = pickCategory(category);
    const word = pickWord(selectedCategory, previousWord);

    setCurrentCategory(selectedCategory);
    setCurrentWord(word);
  }

  function startGame() {
    setScore(0);
    setRounds(0);
    setLastResult(null);
    drawRound();
    setPhase("reveal");
  }

  function beginMime() {
    setRemaining(duration);
    setPhase("playing");
  }

  const finishRound = useCallback(
    (success: boolean) => {
      setLastResult({
        category: currentCategory,
        word: currentWord,
        success,
      });
      setRounds((value) => value + 1);

      if (success) {
        setScore((value) => value + 1);
      }

      setPhase("result");
    },
    [currentCategory, currentWord]
  );

  function nextRound() {
    drawRound(lastResult?.word);
    setPhase("reveal");
  }

  function backToSetup() {
    setPhase("setup");
    setLastResult(null);
    setScore(0);
    setRounds(0);
  }

  useEffect(() => {
    if (phase !== "playing") {
      return;
    }

    const interval = window.setInterval(() => {
      setRemaining((value) => (value <= 0 ? 0 : value - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing" || remaining > 0) {
      return;
    }

    const timeout = window.setTimeout(() => finishRound(false), 0);

    return () => window.clearTimeout(timeout);
  }, [phase, remaining, finishRound]);

  const hideChrome = phase === "playing";

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
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
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
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {phase === "setup" ? (
                <SetupView
                  category={category}
                  duration={duration}
                  onCategoryChange={setCategory}
                  onDurationChange={setDuration}
                  onStart={startGame}
                />
              ) : null}

              {phase === "reveal" ? (
                <RevealView
                  category={currentCategory}
                  word={currentWord}
                  round={rounds + 1}
                  onBegin={beginMime}
                />
              ) : null}

              {phase === "playing" ? (
                <PlayingView
                  remaining={remaining}
                  duration={duration}
                  onCorrect={() => finishRound(true)}
                />
              ) : null}

              {phase === "result" && lastResult ? (
                <ResultView
                  result={lastResult}
                  score={score}
                  rounds={rounds}
                  onNext={nextRound}
                  onBackToSetup={backToSetup}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}

type SetupViewProps = {
  category: CategoryOption;
  duration: DurationOption;
  onCategoryChange: (value: CategoryOption) => void;
  onDurationChange: (value: DurationOption) => void;
  onStart: () => void;
};

function SetupView({
  category,
  duration,
  onCategoryChange,
  onDurationChange,
  onStart,
}: SetupViewProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Drama className="size-6" />
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-black leading-none tracking-normal">
            Mimica local
          </h1>
          <p className="max-w-sm text-base leading-7 text-muted-foreground">
            Escolha a categoria e o tempo. Passe o celular para quem vai
            representar e o grupo adivinha.
          </p>
        </div>
      </div>

      <section className="space-y-5 rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/25">
        <div className="space-y-2">
          <Label htmlFor="mimica-category">Categoria</Label>
          <select
            id="mimica-category"
            value={category}
            onChange={(event) =>
              onCategoryChange(event.target.value as CategoryOption)
            }
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Tempo da rodada</Label>
          <div className="grid grid-cols-2 gap-2">
            {durationOptions.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={duration === option}
                onClick={() => onDurationChange(option)}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-md border text-sm font-semibold transition",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
                  duration === option
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/60"
                )}
              >
                <Clock3 className="size-4" />
                {option === 60 ? "1 minuto" : "30 segundos"}
              </button>
            ))}
          </div>
        </div>

        <Button size="lg" className="h-12 w-full gap-2" onClick={onStart}>
          <Drama className="size-4" />
          Iniciar
        </Button>
      </section>
    </div>
  );
}

type RevealViewProps = {
  category: Category;
  word: string;
  round: number;
  onBegin: () => void;
};

function RevealView({ category, word, round, onBegin }: RevealViewProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-card px-3 py-2 text-center text-xs font-medium text-muted-foreground">
        Rodada {round} · Apenas quem vai fazer a mimica deve olhar
      </div>

      <section className="space-y-6 rounded-lg border border-border bg-card p-5 text-center shadow-2xl shadow-black/25">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Categoria: {category}
          </p>
          <p className="break-words text-4xl font-black leading-tight">
            {word}
          </p>
        </div>

        <Button size="lg" className="h-12 w-full gap-2" onClick={onBegin}>
          <Eye className="size-4" />
          Entendi, começar
        </Button>
      </section>
    </div>
  );
}

type PlayingViewProps = {
  remaining: number;
  duration: number;
  onCorrect: () => void;
};

function PlayingView({ remaining, duration, onCorrect }: PlayingViewProps) {
  const isUrgent = remaining <= 10;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-12">
      <div className="flex flex-col items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Tempo restante
        </span>
        <motion.p
          key={remaining}
          initial={{ scale: 0.9, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "font-mono text-7xl font-black tabular-nums sm:text-8xl",
            isUrgent ? "text-destructive" : "text-foreground"
          )}
        >
          {formatTime(remaining)}
        </motion.p>
        <Progress remaining={remaining} duration={duration} />
      </div>

      <Button
        size="lg"
        className="h-16 w-full max-w-xs gap-2 text-lg"
        onClick={onCorrect}
      >
        <CheckCircle2 className="size-6" />
        Acertou
      </Button>
    </div>
  );
}

type ProgressProps = {
  remaining: number;
  duration: number;
};

function Progress({ remaining, duration }: ProgressProps) {
  const percent = duration > 0 ? (remaining / duration) * 100 : 0;

  return (
    <div className="h-2 w-48 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

type ResultViewProps = {
  result: RoundResult;
  score: number;
  rounds: number;
  onNext: () => void;
  onBackToSetup: () => void;
};

function ResultView({
  result,
  score,
  rounds,
  onNext,
  onBackToSetup,
}: ResultViewProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-md shadow-lg",
            result.success
              ? "bg-primary text-primary-foreground shadow-primary/20"
              : "bg-destructive text-destructive-foreground shadow-destructive/20"
          )}
        >
          {result.success ? (
            <Trophy className="size-6" />
          ) : (
            <TimerReset className="size-6" />
          )}
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-black leading-none tracking-normal">
            {result.success ? "Acertou!" : "Tempo esgotado!"}
          </h1>
          <p className="max-w-sm text-base leading-7 text-muted-foreground">
            {result.success
              ? "Boa! Sorteie a proxima palavra para continuar."
              : "Ninguem acertou a tempo. A palavra era:"}
          </p>
        </div>
      </div>

      <section className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/25">
        <div className="rounded-md border border-border bg-background px-4 py-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Palavra
          </p>
          <p className="mt-1 break-words text-2xl font-bold">{result.word}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Categoria: {result.category}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-border bg-background px-4 py-3 text-center">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Acertos
            </p>
            <p className="mt-1 text-2xl font-black">{score}</p>
          </div>
          <div className="rounded-md border border-border bg-background px-4 py-3 text-center">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Rodadas
            </p>
            <p className="mt-1 text-2xl font-black">{rounds}</p>
          </div>
        </div>

        <div className="grid gap-2 pt-1">
          <Button size="lg" className="h-12 w-full gap-2" onClick={onNext}>
            <RotateCcw className="size-4" />
            Proxima rodada
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="h-12 w-full"
            onClick={onBackToSetup}
          >
            Alterar configuracao
          </Button>
        </div>
      </section>
    </div>
  );
}

function pickCategory(option: CategoryOption): Category {
  if (option !== randomCategory) {
    return option;
  }

  const categories = Object.keys(mimicaWordsData) as Category[];

  return categories[Math.floor(Math.random() * categories.length)];
}

function pickWord(category: Category, previousWord?: string) {
  const words = mimicaWordsData[category];
  const pool =
    previousWord && words.length > 1
      ? words.filter((word) => word !== previousWord)
      : words;

  return pool[Math.floor(Math.random() * pool.length)];
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
