"use client";

import { useEffect, useState } from "react";

import { requestTimeoutMs } from "@/lib/fetch-with-timeout";

/**
 * Garante que uma tela de jogo nao fique presa em "Carregando...".
 *
 * Vigia duas coisas ao mesmo tempo:
 * - falha definitiva de conexao, reportada pelo componente a partir dos eventos
 *   do socket (`connect_error` / `reconnect_failed`);
 * - estado que nunca chega, mesmo com o socket conectado (partida inexistente,
 *   jogador fora da sala), pego pelo prazo.
 *
 * Recebe `hasState` para saber quando parar de vigiar, e devolve o setter do
 * proprio estado (estavel, vindo do `useState`) para o componente reportar
 * falha de dentro dos callbacks do socket sem quebrar dependencias de efeito.
 */
export function useConnectionGuard(hasState: boolean) {
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    if (hasState) {
      return;
    }

    const timer = window.setTimeout(() => setHasFailed(true), requestTimeoutMs);

    return () => window.clearTimeout(timer);
  }, [hasState]);

  return [hasFailed, setHasFailed] as const;
}
