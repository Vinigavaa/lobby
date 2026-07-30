"use client";

import { io, type Socket } from "socket.io-client";

import { SOCKET_PATH } from "@/lib/socket/config";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/lib/socket/types";

export type LobbySocketClient = Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;

/**
 * Limite de tentativas de reconexao.
 *
 * O padrao do socket.io e infinito, o que torna `reconnect_failed` inalcancavel
 * e faz uma falha de conexao ficar tentando em silencio para sempre. Com limite
 * finito a falha se torna detectavel e a tela pode oferecer acao ao usuario.
 */
export const socketReconnectionAttempts = 4;

export function createSocketClient(): LobbySocketClient {
  return io({
    autoConnect: false,
    path: SOCKET_PATH,
    transports: ["websocket", "polling"],
    reconnectionAttempts: socketReconnectionAttempts,
  });
}
