/** Prazo maximo de uma requisicao antes de desistir e liberar a interface. */
export const requestTimeoutMs = 15_000;
/** A partir daqui avisamos que o servidor pode estar iniciando (cold start). */
export const slowRequestWarningMs = 5_000;

/**
 * `fetch` com prazo.
 *
 * Sem prazo, uma rede travada nunca resolve nem rejeita: o estado de
 * carregamento da tela fica ativo para sempre e o usuario nao tem como tentar
 * de novo sem recarregar a pagina.
 */
export function fetchWithTimeout(input: string, init?: RequestInit) {
  return fetch(input, {
    ...init,
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
}

/** Distingue "o servidor nao respondeu" de uma falha generica de rede. */
export function isTimeoutError(error: unknown) {
  return error instanceof Error && error.name === "TimeoutError";
}
