"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

type PageTransitionProps = {
  children: ReactNode;
};

/**
 * Animacao de entrada do conteudo de uma tela.
 *
 * Respeita `prefers-reduced-motion`: quando o sistema pede menos movimento,
 * mantem apenas a variacao de opacidade e descarta o deslocamento.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
