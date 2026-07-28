"use client";

import { motion } from "framer-motion";

const players = ["A", "B", "C", "D"];

export function LandingMotion() {
  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-border bg-card p-6 shadow-2xl shadow-black/20">
      <motion.div
        aria-hidden
        className="absolute inset-x-8 top-8 h-28 rounded-lg bg-primary/20"
        animate={{ y: [0, 10, 0], opacity: [0.65, 1, 0.65] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex h-full min-h-[360px] flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Sala</p>
            <p className="font-mono text-4xl font-semibold tracking-[0.18em] text-foreground">
              482913
            </p>
          </div>
          <div className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground">
            Ao vivo
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {players.map((player, index) => (
            <motion.div
              key={player}
              className="flex h-24 items-center justify-center rounded-lg border border-border bg-background text-3xl font-semibold"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.12 }}
            >
              {player}
            </motion.div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>Rodada preparada</span>
            <span>4 jogadores</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: ["18%", "72%", "18%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
