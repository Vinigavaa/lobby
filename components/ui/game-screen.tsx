"use client";

import type { ReactNode } from "react";

import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { cn } from "@/lib/utils";

const maxWidthClass = {
  md: "max-w-md",
  "2xl": "max-w-2xl",
  "5xl": "max-w-5xl",
} as const;

type GameScreenProps = {
  children: ReactNode;
  /** Botoes da barra fixa. Cada filho ocupa a largura toda, empilhado. */
  actions: ReactNode;
  maxWidth?: keyof typeof maxWidthClass;
};

/**
 * Estrutura das telas de sala e de partida.
 *
 * Duas decisoes existem por causa do celular:
 *
 * - `dvh` em vez de `vh`: a barra do navegador entra na conta de `100vh`, o
 *   que empurra a base da pagina para fora da area visivel.
 * - barra de acoes fixa na base: no fluxo normal os botoes ficavam no fim de
 *   uma pagina mais alta que a tela, so alcancaveis com a rolagem no fim.
 *
 * A barra respeita a safe area do sistema (notch e barra de gestos) e sobe
 * junto com o teclado virtual, para nao ficar atras dele enquanto o jogador
 * digita.
 */
export function GameScreen({
  children,
  actions,
  maxWidth = "md",
}: GameScreenProps) {
  const keyboardInset = useKeyboardInset();

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <section
        className={cn(
          "mx-auto flex min-h-dvh w-full flex-col gap-6 px-5 py-6",
          maxWidthClass[maxWidth]
        )}
      >
        <div className="flex-1">{children}</div>

        <div
          className={cn(
            "sticky -mx-5 grid gap-2.5 border-t border-border bg-background px-5 pt-3",
            "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          )}
          style={{ bottom: keyboardInset }}
        >
          {actions}
        </div>
      </section>
    </main>
  );
}
