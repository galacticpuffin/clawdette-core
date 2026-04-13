"use client";

import { motion } from "framer-motion";
import { Activity, Brain, Radio, Save, Shield, Waves } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AgentNode, CoreState, ZoomLevel } from "@/types/core";

const zoomLevels: ZoomLevel[] = ["far", "mid", "close"];

export function BrainHud({
  state,
  activeAgent,
  dirty,
  lastSavedLabel,
  onZoomChange,
  onCheckpoint,
}: {
  state: CoreState;
  activeAgent?: AgentNode;
  dirty: boolean;
  lastSavedLabel: string;
  onZoomChange: (zoom: ZoomLevel) => void;
  onCheckpoint: () => void;
}) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-between gap-4 p-6">
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass pointer-events-auto max-w-xl rounded-[2rem] px-6 py-5"
        >
          <div className="mb-2 flex items-center gap-3 text-[11px] uppercase tracking-[0.45em] text-pink-200/70">
            <Brain size={14} />
            CLAWDETTE CORE
          </div>
          <div className="glow-text text-3xl font-semibold tracking-[0.08em] text-pink-50">
            Living Neural Intelligence Core
          </div>
          <div className="mt-2 max-w-lg text-sm leading-6 text-pink-100/74">
            A local-first executive brain with inspectable agents, persistent memory, voice routing, and resumable Git-backed state.
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass pointer-events-auto min-w-[320px] rounded-[2rem] px-5 py-4"
        >
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.4em] text-pink-200/70">
            <span>System Vitals</span>
            <span>{state.ambientMode}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Vital icon={Activity} label="Signal Lanes" value={String(state.signals.length)} />
            <Vital icon={Waves} label="Zoom State" value={state.zoom} />
            <Vital icon={Shield} label="Autosave" value={dirty ? "Dirty" : "Stable"} />
            <Vital icon={Radio} label="Last Save" value={lastSavedLabel} />
          </div>
          <button
            type="button"
            onClick={onCheckpoint}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-pink-400/18 px-4 py-3 text-sm text-pink-50 transition hover:bg-pink-400/28"
          >
            <Save size={16} />
            Create Local Git Checkpoint
          </button>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 p-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass pointer-events-auto rounded-[2rem] px-4 py-4"
        >
          <div className="mb-3 text-[11px] uppercase tracking-[0.4em] text-pink-200/70">Neural Zoom</div>
          <div className="flex gap-2">
            {zoomLevels.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onZoomChange(level)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition",
                  state.zoom === level
                    ? "bg-pink-300/24 text-pink-50"
                    : "bg-transparent text-pink-100/70 hover:bg-pink-400/10",
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass pointer-events-auto max-w-md rounded-[2rem] px-5 py-4"
        >
          <div className="text-[11px] uppercase tracking-[0.4em] text-pink-200/70">Active Region</div>
          <div className="mt-2 text-xl text-pink-50">{activeAgent?.name ?? "None selected"}</div>
          <div className="mt-1 text-sm text-pink-100/78">{activeAgent?.mission}</div>
        </motion.div>
      </div>
    </>
  );
}

function Vital({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-pink-200/10 bg-pink-200/5 p-3">
      <div className="flex items-center gap-2 text-pink-100/60">
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <div className="mt-1 text-base text-pink-50">{value}</div>
    </div>
  );
}
