"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import {
  playTriviaWheelSpinSound,
  playTriviaWheelStopSound,
} from "@/lib/trivia-sound";
import { triviaThemes, triviaThemeRevealMs, triviaWheelSpinMs } from "@/lib/trivia-themes";

import { TriviaConfetti } from "./trivia-confetti";

const wheelColors = [
  "#9146FF",
  "#00F593",
  "#F5C542",
  "#8B7CF6",
  "#3B82F6",
  "#F97316",
];

type TriviaWheelProps = {
  themeId: string;
  themeLabel: string;
  themeEmoji: string;
  /** Chave que forca o replay da animacao (ex: numero da rodada). */
  spinKey: number;
  onRevealComplete?: () => void;
};

export function TriviaWheel({
  themeId,
  themeLabel,
  themeEmoji,
  spinKey,
  onRevealComplete,
}: TriviaWheelProps) {
  const [subPhase, setSubPhase] = useState<"spinning" | "revealed">("spinning");
  const [rotation, setRotation] = useState(0);
  const themeIndex = triviaThemes.findIndex((theme) => theme.id === themeId);
  const safeIndex = themeIndex === -1 ? 0 : themeIndex;
  const wedgeAngle = 360 / triviaThemes.length;
  const wedgeCenter = safeIndex * wedgeAngle + wedgeAngle / 2;
  const baseSpins = 5 * 360;
  const spinSeconds = triviaWheelSpinMs / 1000;

  useEffect(() => {
    const jitter = (Math.random() - 0.5) * (wedgeAngle * 0.5);
    const nextRotation = baseSpins - wedgeCenter + jitter;

    window.setTimeout(() => {
      setSubPhase("spinning");
      setRotation(nextRotation);
    }, 0);

    playTriviaWheelSpinSound(spinSeconds);

    const stopTimeout = window.setTimeout(() => {
      playTriviaWheelStopSound();
      setSubPhase("revealed");
    }, triviaWheelSpinMs);

    const doneTimeout = window.setTimeout(() => {
      onRevealComplete?.();
    }, triviaWheelSpinMs + triviaThemeRevealMs);

    return () => {
      window.clearTimeout(stopTimeout);
      window.clearTimeout(doneTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);

  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center gap-8">
      <AnimatePresence mode="wait">
        {subPhase === "spinning" ? (
          <motion.div
            key="wheel"
            className="relative flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="absolute -top-2 z-10 size-0 border-x-[14px] border-t-[22px] border-x-transparent border-t-primary drop-shadow-lg" />

            <motion.div
              className="relative size-72 overflow-hidden rounded-full border-4 border-card shadow-2xl shadow-black/40 sm:size-80"
              style={{
                background: `conic-gradient(${triviaThemes
                  .map(
                    (_, index) =>
                      `${wheelColors[index % wheelColors.length]} ${index * wedgeAngle}deg ${(index + 1) * wedgeAngle}deg`
                  )
                  .join(", ")})`,
              }}
              animate={{
                rotate: [
                  0,
                  rotation * 0.55,
                  rotation * 0.85,
                  rotation - 8,
                  rotation + 4,
                  rotation,
                ],
              }}
              transition={{
                duration: spinSeconds,
                times: [0, 0.55, 0.8, 0.92, 0.97, 1],
                ease: ["circOut", "circOut", "easeOut", "easeOut", "easeOut"],
              }}
            >
              {triviaThemes.map((theme, index) => {
                const angle = index * wedgeAngle + wedgeAngle / 2;
                const radius = 36;
                const x = 50 + radius * Math.sin((angle * Math.PI) / 180);
                const y = 50 - radius * Math.cos((angle * Math.PI) / 180);

                return (
                  <span
                    key={theme.id}
                    className="absolute w-20 -translate-x-1/2 -translate-y-1/2 text-center text-[10px] font-bold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] sm:text-xs"
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    {theme.label}
                  </span>
                );
              })}

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-10 rounded-full border-4 border-card bg-background" />
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="reveal"
            className="relative flex flex-col items-center gap-4 text-center"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
          >
            <TriviaConfetti />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Tema da rodada
            </p>
            <div className="flex flex-col items-center gap-3 rounded-[28px] border-2 border-primary bg-card px-10 py-8 shadow-2xl shadow-primary/20">
              <span className="text-6xl">{themeEmoji}</span>
              <h2 className="font-heading text-3xl font-black">{themeLabel}</h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
