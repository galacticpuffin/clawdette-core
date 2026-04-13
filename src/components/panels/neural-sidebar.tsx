"use client";

import { motion } from "framer-motion";

import type { AgentNode, MemoryArtifact } from "@/types/core";

export function NeuralSidebar({
  agents,
  memoryArtifacts,
  activeAgentId,
  onSelectAgent,
}: {
  agents: AgentNode[];
  memoryArtifacts: MemoryArtifact[];
  activeAgentId: string;
  onSelectAgent: (agentId: string) => void;
}) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass pointer-events-auto absolute left-6 top-28 z-30 h-[calc(100vh-11rem)] w-[320px] overflow-hidden rounded-[2.2rem]"
    >
      <div className="h-full overflow-y-auto px-5 py-5">
        <div className="text-[11px] uppercase tracking-[0.4em] text-pink-200/70">Executive Regions</div>
        <div className="mt-4 space-y-2">
          {agents.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => onSelectAgent(agent.id)}
              className={`w-full rounded-[1.6rem] border px-4 py-3 text-left transition ${
                activeAgentId === agent.id
                  ? "border-pink-300/18 bg-pink-300/12"
                  : "border-pink-100/10 bg-pink-100/4 hover:bg-pink-100/8"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-pink-50">{agent.name}</div>
                <div
                  className="h-3 w-3 rounded-full"
                  style={{
                    background: agent.color,
                    boxShadow: `0 0 22px ${agent.color}`,
                  }}
                />
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.22em] text-pink-100/48">{agent.title}</div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-[11px] uppercase tracking-[0.4em] text-pink-200/70">Persistent Memory</div>
        <div className="mt-4 space-y-3">
          {memoryArtifacts.map((artifact) => (
            <div key={artifact.id} className="rounded-[1.6rem] border border-pink-100/10 bg-black/12 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-pink-100/42">{artifact.layer}</div>
              <div className="mt-1 text-sm text-pink-50">{artifact.title}</div>
              <div className="mt-2 text-xs leading-5 text-pink-100/68">{artifact.summary}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.aside>
  );
}
