"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mic, Plus, Zap } from "lucide-react";

export function CaptureDock({
  onCapture,
  onVoiceCapture,
  busy,
  voiceBusy,
}: {
  onCapture: (content: string) => Promise<void>;
  onVoiceCapture: () => Promise<void>;
  busy: boolean;
  voiceBusy: boolean;
}) {
  const [draft, setDraft] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass pointer-events-auto absolute bottom-6 left-1/2 z-40 w-[min(760px,calc(100vw-3rem))] -translate-x-1/2 rounded-[2.4rem] p-4"
    >
      <div className="mb-3 flex items-center gap-3 text-[11px] uppercase tracking-[0.38em] text-pink-200/68">
        <Zap size={14} />
        ADHD Capture Lane
      </div>
      <div className="flex gap-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Catch the thought before it disappears. Example: look into that SaaS idea later."
          className="min-h-[88px] flex-1 rounded-[1.8rem] border border-pink-100/10 bg-black/22 px-4 py-3 text-sm text-pink-50 outline-none placeholder:text-pink-100/34"
        />
        <div className="flex w-[170px] flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!draft.trim()) return;
              const content = draft;
              setDraft("");
              await onCapture(content);
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-[1.6rem] bg-pink-400/22 px-4 py-3 text-sm text-pink-50 transition hover:bg-pink-400/34 disabled:opacity-60"
          >
            <Plus size={16} />
            {busy ? "Routing..." : "Capture"}
          </button>
          <button
            type="button"
            disabled={voiceBusy}
            onClick={onVoiceCapture}
            className="flex flex-1 items-center justify-center gap-2 rounded-[1.6rem] border border-pink-100/10 bg-pink-100/7 px-4 py-3 text-sm text-pink-50 transition hover:bg-pink-100/12 disabled:opacity-60"
          >
            <Mic size={16} />
            {voiceBusy ? "Recording..." : "Voice"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
