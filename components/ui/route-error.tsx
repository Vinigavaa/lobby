"use client";

import { useEffect } from "react";
import { Home, RefreshCw, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
};

/**
 * Tela de erro das rotas.
 *
 * Mostra mensagem generica ao usuario e registra o detalhe no console: expor
 * `error.message` na interface vazaria informacao interna do servidor.
 */
export function RouteError({
  error,
  reset,
  title = "Nao foi possivel carregar esta tela",
}: RouteErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error("Falha ao renderizar rota:", error);
  }, [error]);

  return (
    <main className="min-h-dvh bg-background px-5 py-6 text-foreground">
      <section className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md flex-col justify-center gap-6">
        <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-destructive/15 text-destructive">
              <TriangleAlert className="size-5" />
            </div>
            <div>
              <h1 className="font-semibold">{title}</h1>
              <p className="text-sm text-muted-foreground">
                Pode ser uma falha temporaria de conexao.
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <Button
              type="button"
              size="lg"
              className="h-12 gap-2"
              onClick={reset}
            >
              <RefreshCw className="size-4" />
              Tentar novamente
            </Button>
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="h-12 gap-2"
              onClick={() => router.push("/")}
            >
              <Home className="size-4" />
              Voltar ao inicio
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
