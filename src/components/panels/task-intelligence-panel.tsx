"use client";

import { motion } from "framer-motion";
import { Brain, Route, Sparkles } from "lucide-react";

import type { TaskThread } from "@/types/core";

export function TaskIntelligencePanel({ task }: { task?: TaskThread }) {
  return (
    <div className="pointer-events-auto absolute right-6 bottom-28 z-30 w-[380px]">
      <motion.aside
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-[2.2rem] p-5"
      >
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.4em] text-pink-200/70">
          <Brain size={14} />
          Reasoning Trace
        </div>
        <div className="mt-3 text-xl text-pink-50">{task?.title ?? "No active task selected"}</div>
        <div className="mt-2 text-sm leading-6 text-pink-100/74">
          {task?.reasoningTrace?.verdict ?? "Select a task or capture a thought to inspect the multi-source reasoning layer."}
        </div>
        <div className="mt-4 space-y-3">
          {task?.reasoningTrace?.sources.map((source) => (
            <div key={source.type} className="rounded-[1.4rem] border border-pink-100/10 bg-black/14 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs uppercase tracking-[0.22em] text-pink-100/50">
                  {source.type.replace(/_/g, " ")}
                </div>
                <div className="text-xs text-pink-50">{Math.round(source.confidence * 100)}%</div>
              </div>
              <div className="mt-2 text-xs leading-5 text-pink-100/72">{source.summary}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-pink-100/52">
          <Route size={12} />
          Consensus {task?.reasoningTrace ? `${Math.round(task.reasoningTrace.consensusScore * 100)}%` : "--"}
          <Sparkles size={12} className="ml-2" />
          {task?.assignedAgentIds.join(", ") ?? "Awaiting routing"}
        </div>
      </motion.aside>
    </div>
  );
}
