"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

import type { PalpiteCertoStatePayload } from "@/lib/socket/types";
import { cn } from "@/lib/utils";

const medalByPosition: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

type PalpiteCertoRankingProps = {
  ranking: PalpiteCertoStatePayload["ranking"];
};

/** Ranking geral acumulado, visivel em todas as fases da partida. */
export function PalpiteCertoRanking({ ranking }: PalpiteCertoRankingProps) {
  if (ranking.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Trophy className="size-4" />
        Classificação geral
      </div>

      <motion.div layout className="space-y-2">
        {ranking.map((entry) => (
          <motion.div
            layout
            key={entry.userId}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className={cn(
              "flex items-center justify-between rounded-[14px] border px-4 py-2.5",
              entry.position === 1
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                {medalByPosition[entry.position] ?? entry.position}
              </span>
              <span className="truncate font-medium">
                {entry.avatar ? `${entry.avatar} ` : ""}
                {entry.nickname}
              </span>
            </div>
            <span className="font-heading text-lg font-black tabular-nums">
              {entry.totalScore}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
