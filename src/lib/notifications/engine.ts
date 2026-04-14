import { nowIso, uid } from "@/lib/utils";
import type { NotificationChannel, NotificationEvent, SystemMode, TaskThread, UrgencyLevel } from "@/types/core";

export function buildNotificationsForTask(task: TaskThread): NotificationEvent[] {
  const urgency = task.urgency;
  const channels = channelsForUrgency(urgency);
  const primary: NotificationEvent = {
    id: uid("notice"),
    title: notificationTitle(task),
    body: notificationBody(task),
    urgency,
    channels,
    status: urgency === "passive" ? "stored" : "pending",
    taskId: task.id,
    createdAt: nowIso(),
  };

  if (urgency === "summary") {
    return [
      primary,
      {
        id: uid("notice"),
        title: `Digest queued: ${task.title}`,
        body: "This thread has been added to a later summary instead of interrupting you now.",
        urgency,
        channels: ["in_app"],
        status: "stored",
        taskId: task.id,
        createdAt: nowIso(),
      },
    ];
  }

  return [primary];
}

export function channelsForUrgency(urgency: UrgencyLevel) {
  switch (urgency) {
    case "urgent":
      return ["in_app", "sms", "call"] as NotificationChannel[];
    case "active":
      return ["in_app", "sms"] as NotificationChannel[];
    case "summary":
      return ["in_app", "email"] as NotificationChannel[];
    default:
      return ["in_app"] as NotificationChannel[];
  }
}

export function deriveSystemModeFromTasks(tasks: TaskThread[]): SystemMode {
  if (tasks.some((task) => task.urgency === "urgent")) return "EMERGENCY";
  if (tasks.some((task) => task.urgency === "active")) return "ALERT";
  if (tasks.some((task) => task.status === "active")) return "FOCUS";
  if (tasks.length > 0) return "ACTIVE";
  return "CALM";
}

function notificationTitle(task: TaskThread) {
  switch (task.urgency) {
    case "urgent":
      return `Urgent escalation: ${task.title}`;
    case "active":
      return `Active update: ${task.title}`;
    case "summary":
      return `Summary queued: ${task.title}`;
    default:
      return `Stored quietly: ${task.title}`;
  }
}

function notificationBody(task: TaskThread) {
  return `${task.summary} Assigned: ${task.assignedAgentIds.join(", ")}. Next: ${task.nextStep}`;
}
