"use client";

import { motion } from "framer-motion";

import type { CoreState, ZoomLevel } from "@/types/core";

const zoomLevels: ZoomLevel[] = ["far", "mid", "close"];

export function NeuralPresenceHud({
  state,
  dirty,
  lastSavedLabel,
  onZoomChange,
}: {
  state: CoreState;
  dirty: boolean;
  lastSavedLabel: string;
  onZoomChange: (zoom: ZoomLevel) => void;
}) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between px-8 py-7">
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto max-w-xl"
        >
          <div className="text-[11px] uppercase tracking-[0.5em] text-pink-200/58">CLAWDETTE CORE</div>
          <div className="mt-3 text-3xl font-semibold tracking-[0.16em] text-pink-50 glow-text">
            Living Neural Consciousness
          </div>
          <div className="mt-2 max-w-md text-sm leading-6 text-pink-100/62">
            One intelligence made of many agents. Thoughts become nodes. Signals keep moving when you do not.
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="pointer-events-auto flex items-center gap-5 rounded-full border border-pink-200/10 bg-black/18 px-5 py-3 backdrop-blur-xl"
        >
          <span className="text-[11px] uppercase tracking-[0.35em] text-pink-200/54">{state.systemMode}</span>
          <span className="text-[11px] uppercase tracking-[0.28em] text-pink-100/40">
            {dirty ? "Unsaved" : `Saved ${lastSavedLabel}`}
          </span>
          <div className="flex gap-2">
            {zoomLevels.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onZoomChange(level)}
                className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em] transition ${
                  state.zoom === level
                    ? "bg-pink-300/20 text-pink-50 shadow-[0_0_24px_rgba(255,112,196,0.35)]"
                    : "text-pink-100/55 hover:bg-pink-200/8"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}
