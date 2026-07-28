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

export function createSocketClient(): LobbySocketClient {
  return io({
    autoConnect: false,
    path: SOCKET_PATH,
    transports: ["websocket", "polling"],
  });
}
