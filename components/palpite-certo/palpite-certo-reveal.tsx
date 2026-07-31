"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { PalpiteCertoStatePayload } from "@/lib/socket/types";
import { cn } from "@/lib/utils";

/** Duracao da contagem regressiva que antecede a resposta correta. */
const countdownSteps = [3, 2, 1];
const countdownStepMs = 700;
const medalByPosition: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

type PalpiteCertoRevealProps = {
  question: NonNullable<PalpiteCertoStatePayload["question"]>;
  correctValue: number | null;
  roundResults: PalpiteCertoStatePayload["roundResults"];
  currentUserId: string | null;
};

export function PalpiteCertoReveal({
  question,
  correctValue,
  roundResults,
  currentUserId,
}: PalpiteCertoRevealProps) {
  const [step, setStep] = useState(0);
  const isCountingDown = step < countdownSteps.length;
  const showResults = step > countdownSteps.length;

  // Avanca contador -> resposta -> ranking sem exigir clique do host: sao
  // etapas da mesma animacao de revelacao.
  useEffect(() => {
    if (step > countdownSteps.length) {
      return;
    }

    const timeout = window.setTimeout(
      () => setStep((current) => current + 1),
      countdownStepMs
    );

    return () => window.clearTimeout(timeout);
  }, [step]);

  return (
    <div className="space-y-5">
      <AnimatePresence mode="wait">
        {isCountingDown ? (
          <motion.div
            key={`countdown-${step}`}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex h-56 items-center justify-center rounded-[20px] border border-border bg-card"
          >
            <span className="font-heading text-8xl font-black text-primary tabular-nums">
              {countdownSteps[step]}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="answer"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="rounded-[20px] border border-primary bg-primary/10 p-6 text-center shadow-2xl shadow-black/20"
          >
            <p className="text-sm font-medium text-muted-foreground">
              {question.emoji ? `${question.emoji} ` : ""}Resposta correta
            </p>
            <p className="mt-2 font-heading text-5xl font-black leading-none text-primary tabular-nums sm:text-6xl">
              {correctValue !== null
                ? correctValue.toLocaleString("pt-BR")
                : "—"}
            </p>
            {question.unit ? (
              <p className="mt-2 text-lg font-semibold">{question.unit}</p>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {showResults && roundResults ? (
        <RoundResults
          roundResults={roundResults}
          currentUserId={currentUserId}
        />
      ) : null}
    </div>
  );
}

type RoundResultsProps = {
  roundResults: NonNullable<PalpiteCertoStatePayload["roundResults"]>;
  currentUserId: string | null;
};

function RoundResults({ roundResults, currentUserId }: RoundResultsProps) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-sm font-medium text-muted-foreground">
        Ranking da rodada
      </h3>

      {roundResults.map((result, index) => (
        <motion.div
          key={result.userId}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.12, duration: 0.3, ease: "easeOut" }}
          className={cn(
            "flex items-center justify-between rounded-[14px] border px-4 py-3",
            result.position === 1
              ? "border-primary bg-primary/10"
              : "border-border bg-card",
            result.userId === currentUserId && "ring-1 ring-accent"
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-bold">
              {medalByPosition[result.position] ?? result.position}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">
                {result.avatar ? `${result.avatar} ` : ""}
                {result.nickname}
              </p>
              <p className="text-xs text-muted-foreground">
                {result.guess === null
                  ? "Sem palpite"
                  : `Palpite ${result.guess.toLocaleString("pt-BR")} · diferença ${formatDifference(result.difference)}`}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "font-heading text-lg font-black tabular-nums",
              result.points > 0 ? "text-accent" : "text-muted-foreground"
            )}
          >
            +{result.points}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function formatDifference(difference: number | null) {
  if (difference === null) {
    return "—";
  }

  // Diferencas fracionarias vem de respostas decimais (ex: 4,5 bilhoes de
  // anos); inteiras nao devem ganhar casas decimais artificiais.
  return Number.isInteger(difference)
    ? difference.toLocaleString("pt-BR")
    : difference.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
