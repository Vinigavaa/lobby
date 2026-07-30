"use client";

import { LogOut, RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

type ConnectionErrorProps = {
  onRetry: () => void;
  onBackToLobby: () => void;
};

/**
 * Substitui o carregamento das telas de jogo quando a conexao de tempo real
 * falha ou o estado da partida nao chega no prazo.
 */
export function ConnectionError({
  onRetry,
  onBackToLobby,
}: ConnectionErrorProps) {
  return (
    <section className="rounded-lg border border-destructive/30 bg-card p-5 shadow-2xl shadow-black/20">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-destructive/15 text-destructive">
          <WifiOff className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold">Sem conexao com a partida</h2>
          <p className="text-sm text-muted-foreground">
            Nao recebemos o estado do jogo. Verifique sua internet e tente de
            novo.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <Button type="button" size="lg" className="h-12 gap-2" onClick={onRetry}>
          <RefreshCw className="size-4" />
          Tentar novamente
        </Button>
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="h-12 gap-2"
          onClick={onBackToLobby}
        >
          <LogOut className="size-4" />
          Voltar ao lobby
        </Button>
      </div>
    </section>
  );
}
