import { buildAdaptiveSignals, getAgentPosition } from "@/lib/neuroplasticity/engine";
import type { CoreState } from "@/types/core";

export function buildSignals(state: CoreState) {
  return buildAdaptiveSignals(state);
}

export { getAgentPosition };
