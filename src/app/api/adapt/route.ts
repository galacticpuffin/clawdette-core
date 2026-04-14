import { NextResponse } from "next/server";

import { applyAdaptationEvent } from "@/lib/neuroplasticity/engine";
import { buildSignals } from "@/lib/neural/signals";
import { loadCoreState, saveCoreState } from "@/lib/persistence/core-store";
import type { AdaptationRequest } from "@/types/core";

const VALID_TYPES = new Set(["capture", "revisit_task", "select_agent", "message", "complete_task", "ignore_task", "checkpoint"]);

export async function POST(request: Request) {
  let payload: AdaptationRequest;
  try {
    payload = (await request.json()) as AdaptationRequest;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!payload?.type || !VALID_TYPES.has(payload.type)) {
    return NextResponse.json({ error: "invalid payload.type" }, { status: 400 });
  }

  const state = await loadCoreState();
  const nextState = applyAdaptationEvent(state, payload);
  const finalState = {
    ...nextState,
    signals: buildSignals(nextState),
  };

  await saveCoreState({
    state: finalState,
    reason: "interaction",
  });

  return NextResponse.json(finalState);
}
