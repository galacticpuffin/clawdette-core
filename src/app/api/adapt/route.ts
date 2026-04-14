import { NextResponse } from "next/server";

import { applyAdaptationEvent } from "@/lib/neuroplasticity/engine";
import { buildSignals } from "@/lib/neural/signals";
import { loadCoreState, saveCoreState } from "@/lib/persistence/core-store";
import type { AdaptationRequest } from "@/types/core";

export async function POST(request: Request) {
  const payload = (await request.json()) as AdaptationRequest;
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
