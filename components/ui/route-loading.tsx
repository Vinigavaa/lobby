"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requestTimeoutMs } from "@/lib/fetch-with-timeout";

type RouteLoadingProps = {
  title?: string;
};

/**
 * Fallback de carregamento das rotas dinamicas.
 *
 * Alem do esqueleto animado, carrega a propria saida: o timeout do `fetch` nao
 * cobre a fase de renderizacao no servidor, entao sem isso um render travado
 * deixaria o usuario preso nesta tela. Passado o prazo, revela a acao de
 * recarregar.
 */
export function RouteLoading({ title = "Carregando..." }: RouteLoadingProps) {
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsStuck(true), requestTimeoutMs);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-dvh bg-background px-5 py-6 text-foreground">
      <section className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-8 w-44 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex size-12 items-center justify-center rounded-md bg-primary/20">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {title}
          </p>

          <div className="mt-5 space-y-3">
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-3"
              >
                <div className="size-9 shrink-0 animate-pulse rounded-md bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {isStuck ? (
          <div className="rounded-md border border-accent/30 bg-accent/10 p-4">
            <p className="text-sm text-accent-foreground">
              Esta demorando mais que o esperado. O servidor pode estar
              iniciando.
            </p>
            <Button
              type="button"
              size="lg"
              className="mt-3 h-12 w-full gap-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="size-4" />
              Recarregar
            </Button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
