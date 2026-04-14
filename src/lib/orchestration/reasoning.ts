import { clamp, nowIso, uid } from "@/lib/utils";
import type { CoreState, ReasoningTrace, TaskThread } from "@/types/core";

export function buildReasoningTrace(input: string, assignedAgentIds: string[], state: CoreState): ReasoningTrace {
  const recentMemory = state.memoryArtifacts.slice(0, 2).map((artifact) => artifact.title).join(", ");
  const userArchetype = state.activeUser.archetype.replace(/_/g, " ");
  const consensusScore = clamp(0.58 + assignedAgentIds.length * 0.08 + input.length / 400, 0.61, 0.96);

  return {
    id: uid("reason"),
    leadAgentId: assignedAgentIds[0] ?? "assistant-dispatch",
    supportingAgentIds: assignedAgentIds.slice(1),
    verdict:
      consensusScore > 0.85
        ? "High-confidence execution path. Proceed with background work and lightweight updates."
        : "Promising path, but keep outputs framed as ongoing research until more evidence accumulates.",
    consensusScore,
    createdAt: nowIso(),
    sources: [
      {
        type: "global_knowledge",
        confidence: clamp(consensusScore - 0.05, 0.5, 0.95),
        summary: `The request resembles an ongoing product or research track that can be decomposed into agent workstreams.`,
      },
      {
        type: "local_memory",
        confidence: clamp(consensusScore - 0.02, 0.5, 0.95),
        summary: recentMemory
          ? `Recent local memory artifacts reinforce continuity with ${recentMemory}.`
          : "Local memory is sparse, so continuity should be refreshed through new artifacts and summaries.",
      },
      {
        type: "behavioral_intent",
        confidence: clamp(consensusScore + 0.01, 0.5, 0.98),
        summary: `The active user profile suggests ${userArchetype} behavior, so the system should reduce friction and keep momentum without demanding constant follow-up.`,
      },
    ],
  };
}

export function summarizeReasoning(task: TaskThread) {
  if (!task.reasoningTrace) return "No reasoning trace yet.";

  const sources = task.reasoningTrace.sources
    .map((source) => `${source.type.replace(/_/g, " ")} ${Math.round(source.confidence * 100)}%`)
    .join(" | ");

  return `${task.reasoningTrace.verdict} ${sources}`;
}
