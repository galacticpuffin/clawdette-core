"use client";

import { motion } from "framer-motion";
import { BellRing, BrainCircuit, Siren, Sparkle, TimerReset } from "lucide-react";

import { sentenceCase } from "@/lib/utils";
import type { NotificationEvent, TaskThread } from "@/types/core";

export function SystemActivityPanel({
  tasks,
  notifications,
  activeTaskId,
  onSelectTask,
}: {
  tasks: TaskThread[];
  notifications: NotificationEvent[];
  activeTaskId?: string;
  onSelectTask: (taskId: string) => void;
}) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass pointer-events-auto absolute left-6 top-28 z-30 h-[calc(100vh-12rem)] w-[340px] overflow-hidden rounded-[2.2rem]"
    >
      <div className="scrollbar-thin h-full overflow-y-auto px-5 py-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.4em] text-pink-200/70">
          <BrainCircuit size={14} />
          Active Threads
        </div>
        <div className="mt-4 space-y-3">
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onSelectTask(task.id)}
              className={`w-full rounded-[1.6rem] border p-4 text-left transition ${
                activeTaskId === task.id
                  ? "border-pink-300/24 bg-pink-300/12"
                  : "border-pink-100/10 bg-pink-100/4 hover:bg-pink-100/8"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-pink-50">{task.title}</div>
                <span className="rounded-full bg-pink-100/8 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-pink-100/70">
                  {task.urgency}
                </span>
              </div>
              <div className="mt-2 text-xs leading-5 text-pink-100/68">{task.summary}</div>
              <div className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-pink-100/48">
                <TimerReset size={12} />
                {sentenceCase(task.status)}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-2 text-[11px] uppercase tracking-[0.4em] text-pink-200/70">
          <BellRing size={14} />
          Notification Intelligence
        </div>
        <div className="mt-4 space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className="rounded-[1.6rem] border border-pink-100/10 bg-black/14 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-pink-50">{notification.title}</div>
                {notification.urgency === "urgent" ? <Siren size={14} className="text-pink-300" /> : <Sparkle size={14} className="text-pink-200/65" />}
              </div>
              <div className="mt-2 text-xs leading-5 text-pink-100/68">{notification.body}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.aside>
  );
}
