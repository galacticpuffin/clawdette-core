"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mic, Send, Waves } from "lucide-react";

export function NeuralCommandRibbon({
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
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-auto absolute bottom-8 left-1/2 z-30 w-[min(760px,calc(100vw-3rem))] -translate-x-1/2"
    >
      <div className="relative overflow-hidden rounded-full border border-pink-200/10 bg-black/14 px-3 py-3 shadow-[0_0_40px_rgba(255,84,174,0.08)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,103,191,0.06),transparent_28%,transparent_72%,rgba(255,171,228,0.06))]" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-pink-200/10 bg-pink-200/6">
            <Waves size={16} className="text-pink-100/66" />
          </div>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Capture a thought before it disappears..."
            className="h-10 flex-1 bg-transparent px-1 text-sm text-pink-50 outline-none placeholder:text-pink-100/28"
          />
          <button
            type="button"
            disabled={voiceBusy}
            onClick={onVoiceCapture}
            className="rounded-full border border-pink-200/10 bg-pink-100/6 px-3 py-2 text-[10px] uppercase tracking-[0.26em] text-pink-50 transition hover:bg-pink-100/10 disabled:opacity-60"
          >
            <span className="flex items-center gap-2">
              <Mic size={12} />
              {voiceBusy ? "Voice..." : "Voice"}
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!draft.trim()) return;
              const content = draft;
              setDraft("");
              await onCapture(content);
            }}
            className="rounded-full bg-pink-400/16 px-3 py-2 text-[10px] uppercase tracking-[0.26em] text-pink-50 transition hover:bg-pink-400/24 disabled:opacity-60"
          >
            <span className="flex items-center gap-2">
              <Send size={12} />
              {busy ? "Routing..." : "Inject"}
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
