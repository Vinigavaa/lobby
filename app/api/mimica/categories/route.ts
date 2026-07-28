import { NextResponse } from "next/server";

import { getMimicaWordCategories } from "@/lib/mimica-words";

export const runtime = "nodejs";

export async function GET() {
  try {
    const categories = await getMimicaWordCategories();

    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel listar as categorias" },
      { status: 500 }
    );
  }
}
