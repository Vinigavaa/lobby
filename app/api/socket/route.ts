import { NextResponse } from "next/server";

import { SOCKET_PATH } from "@/lib/socket/config";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ready",
    transport: "socket.io",
    path: SOCKET_PATH,
  });
}
