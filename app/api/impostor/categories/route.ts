import { NextResponse } from "next/server";

import { getImpostorWordCategories } from "@/lib/impostor-words";

export const runtime = "nodejs";

export async function GET() {
  try {
    const categories = await getImpostorWordCategories();

    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel listar as categorias" },
      { status: 500 }
    );
  }
}
