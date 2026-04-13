import { NextResponse } from "next/server";

import { initialCoreState } from "@/lib/memory/bootstrap";
import { loadCoreState, saveCoreState } from "@/lib/persistence/core-store";
import type { SavePayload } from "@/types/core";

export async function GET() {
  const state = await loadCoreState();
  return NextResponse.json(state ?? initialCoreState());
}

export async function POST(request: Request) {
  const payload = (await request.json()) as SavePayload;
  const state = await saveCoreState(payload);
  return NextResponse.json(state);
}
