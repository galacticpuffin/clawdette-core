import { inferThemeTags } from "@/lib/neuroplasticity/engine";
import { nowIso, uid } from "@/lib/utils";
import type { CaptureRequest, CoreState, SystemMode, TaskThread, UrgencyLevel } from "@/types/core";

import { buildReasoningTrace } from "./reasoning";

const researchTerms = ["idea", "research", "look into", "saas", "market", "explore", "later"];
const financeTerms = ["budget", "revenue", "money", "pricing", "finance"];
const securityTerms = ["security", "breach", "urgent", "attack", "password"];
const shippingTerms = ["build", "launch", "ship", "prototype", "product"];

export function routeCapture(request: CaptureRequest, state: CoreState): {
  task: TaskThread;
  systemMode: SystemMode;
} {
  const text = request.content.toLowerCase();
  const assignedAgentIds = deduceAgentIds(text);
  const urgency = deduceUrgency(text);
  const title = buildTitle(request.content);
  const createdAt = nowIso();
  const themeTags = inferThemeTags(request.content);
  const emotionalWeight = deduceEmotionalWeight(text, urgency);

  const task: TaskThread = {
    id: uid("task"),
    title,
    description: request.content,
    origin: request.origin,
    status: urgency === "urgent" ? "escalated" : urgency === "active" ? "active" : "researching",
    urgency,
    assignedAgentIds,
    escalationChannels: urgency === "urgent" ? ["in_app", "sms", "call"] : urgency === "active" ? ["in_app", "sms"] : ["in_app"],
    summary:
      urgency === "summary"
        ? "Captured for background continuation and later recap."
        : urgency === "passive"
          ? "Stored quietly with agent ownership and resumable context."
          : "Agent workstream opened with follow-up expected.",
    nextStep: buildNextStep(text, assignedAgentIds),
    createdAt,
    updatedAt: createdAt,
    salience: buildInitialSalience(urgency, themeTags, state),
    revisitCount: 0,
    completionScore: 0,
    decay: 0.16,
    emotionalWeight,
    themeTags,
    lastTouchedAt: createdAt,
    reasoningTrace: buildReasoningTrace(request.content, assignedAgentIds, state),
  };

  return {
    task,
    systemMode: deduceMode(urgency),
  };
}

function deduceAgentIds(text: string) {
  const agents = new Set<string>(["assistant-dispatch"]);

  if (matchesAny(text, researchTerms)) {
    agents.add("research");
    agents.add("strategy");
  }

  if (matchesAny(text, financeTerms)) {
    agents.add("cfo");
  }

  if (matchesAny(text, securityTerms)) {
    agents.add("ciso");
    agents.add("security");
  }

  if (matchesAny(text, shippingTerms)) {
    agents.add("product");
    agents.add("engineering");
  }

  if (agents.size === 1) {
    agents.add("chief-of-staff");
  }

  return Array.from(agents);
}

function deduceUrgency(text: string): UrgencyLevel {
  if (/(call me|immediately|emergency|asap|now)/.test(text)) return "urgent";
  if (/(today|important|deadline|urgent|follow up)/.test(text)) return "active";
  if (/(later|sometime|idea|note|remember)/.test(text)) return "summary";
  return "passive";
}

function deduceMode(urgency: UrgencyLevel): SystemMode {
  switch (urgency) {
    case "urgent":
      return "EMERGENCY";
    case "active":
      return "ALERT";
    case "summary":
      return "ACTIVE";
    default:
      return "CALM";
  }
}

function buildTitle(content: string) {
  const trimmed = content.trim();
  if (trimmed.length <= 48) return trimmed;
  return `${trimmed.slice(0, 45).trimEnd()}...`;
}

function buildNextStep(text: string, assignedAgentIds: string[]) {
  if (assignedAgentIds.includes("research")) {
    return "Research and Strategy should gather evidence, compare options, and produce a short continuation brief.";
  }

  if (assignedAgentIds.includes("engineering")) {
    return "Product and Engineering should convert this thought into a scoped execution thread and identify the first shippable slice.";
  }

  if (text.includes("remember")) {
    return "Store this cleanly, then surface it in a later digest when context makes it actionable.";
  }

  return "Assistant / Dispatch should classify, assign, and keep the thread alive without needing another prompt.";
}

function matchesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function buildInitialSalience(urgency: UrgencyLevel, themeTags: string[], state: CoreState) {
  const repeatedThemes = state.neuroplasticity.behavioralPatterns.filter((pattern) => themeTags.includes(pattern.theme));
  const learnedBoost = repeatedThemes.reduce((sum, pattern) => sum + pattern.momentum * 0.08, 0);
  const urgencyBase = urgency === "urgent" ? 0.92 : urgency === "active" ? 0.76 : urgency === "summary" ? 0.62 : 0.44;
  return Math.min(1, urgencyBase + learnedBoost);
}

function deduceEmotionalWeight(text: string, urgency: UrgencyLevel) {
  let weight = urgency === "urgent" ? 0.88 : urgency === "active" ? 0.7 : 0.48;
  if (/(excited|love|obsessed|stress|panic|important|opportunity|regret)/.test(text)) {
    weight += 0.12;
  }
  return Math.min(1, weight);
}
