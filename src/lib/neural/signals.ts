import { agentRegistry } from "@/lib/agents/registry";
import { uid } from "@/lib/utils";
import type { NeuralSignal } from "@/types/core";

const signalPairs: Array<[string, string, string, number]> = [
  ["ceo", "chief-of-staff", "directive", 0.94],
  ["chief-of-staff", "assistant-dispatch", "routing", 0.91],
  ["assistant-dispatch", "automation", "workflow", 0.86],
  ["automation", "engineering", "execution", 0.88],
  ["memory", "ceo", "continuity", 0.74],
  ["voice-comms", "assistant-dispatch", "transcript", 0.81],
  ["cto", "system-monitor", "telemetry", 0.77],
  ["security", "ciso", "policy", 0.71],
  ["research", "strategy", "evidence", 0.7],
  ["product", "engineering", "build lane", 0.76],
  ["marketing", "sales", "campaign pressure", 0.62],
  ["coo", "operations", "execution pull", 0.84],
];

export function buildSignals(): NeuralSignal[] {
  return signalPairs.map(([from, to, label, intensity]) => ({
    id: uid("signal"),
    from,
    to,
    label,
    intensity,
  }));
}

export function getAgentPosition(agentId: string) {
  return agentRegistry.find((agent) => agent.id === agentId)?.position ?? [0, 0, 0];
}
