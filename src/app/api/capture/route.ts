import { NextResponse } from "next/server";

import { dispatchTwilioNotification } from "@/lib/integrations/twilio";
import { applyAdaptationEvent } from "@/lib/neuroplasticity/engine";
import { buildSignals } from "@/lib/neural/signals";
import { appendThreadMessage, loadCoreState, saveCoreState } from "@/lib/persistence/core-store";
import { buildNotificationsForTask, deriveSystemModeFromTasks } from "@/lib/notifications/engine";
import { routeCapture } from "@/lib/orchestration/task-router";
import { nowIso, uid } from "@/lib/utils";
import type { CaptureRequest, CaptureResponse, CoreState, ThreadMessage } from "@/types/core";

export async function POST(request: Request) {
  const payload = (await request.json()) as CaptureRequest;
  const state = await loadCoreState();
  const routed = routeCapture(payload, state);
  const notifications = buildNotificationsForTask(routed.task);

  const threadMessages: ThreadMessage[] = [
    {
      id: uid("msg"),
      threadId: "thread_assistant-dispatch",
      author: "user",
      agentId: "assistant-dispatch",
      content: payload.content,
      createdAt: nowIso(),
      state: "captured",
      linkedAgents: routed.task.assignedAgentIds,
    },
    {
      id: uid("msg"),
      threadId: "thread_assistant-dispatch",
      author: "system",
      agentId: "assistant-dispatch",
      content: `Thought captured and routed into "${routed.task.title}".`,
      createdAt: nowIso(),
      state: routed.task.status,
      linkedAgents: routed.task.assignedAgentIds,
      output: routed.task.nextStep,
    },
  ];

  let nextState: CoreState = {
    ...state,
    systemMode: deriveSystemModeFromTasks([routed.task, ...state.taskThreads]),
    activeTaskId: routed.task.id,
    activeAgentId: routed.task.assignedAgentIds[0] ?? state.activeAgentId,
    taskThreads: [routed.task, ...state.taskThreads],
    notifications: [...notifications, ...state.notifications].slice(0, 12),
    memoryArtifacts: [
      {
        id: uid("memory"),
        layer: "task" as const,
        title: routed.task.title,
        summary: routed.task.summary,
        tags: ["capture", payload.origin, ...routed.task.assignedAgentIds],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      ...state.memoryArtifacts,
    ].slice(0, 12),
  };
  nextState = applyAdaptationEvent(nextState, {
    type: "capture",
    taskId: routed.task.id,
    agentId: routed.task.assignedAgentIds[0],
    content: payload.content,
    emotionalWeight: routed.task.emotionalWeight,
    outcomeWeight: 0.82,
  });
  nextState = {
    ...nextState,
    signals: buildSignals(nextState),
  };

  for (const agentId of new Set(["assistant-dispatch", ...routed.task.assignedAgentIds])) {
    for (const message of threadMessages) {
      await appendThreadMessage(agentId, {
        ...message,
        id: uid("msg"),
        threadId: `thread_${agentId}`,
        agentId,
      });
    }
  }

  await saveCoreState({
    state: nextState,
    reason: "interaction",
  });

  for (const notification of notifications.filter((item) => item.channels.includes("sms"))) {
    await dispatchTwilioNotification(notification);
  }

  const response: CaptureResponse = {
    task: routed.task,
    notifications,
    threadMessages,
    systemMode: nextState.systemMode,
  };

  return NextResponse.json(response);
}
