"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, SendHorizontal, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AgentNode, AgentThread } from "@/types/core";

export function AgentThreadPanel({
  activeAgent,
  thread,
  onSend,
  onVoiceCapture,
  voiceBusy,
}: {
  activeAgent?: AgentNode;
  thread?: AgentThread;
  onSend: (content: string) => Promise<void>;
  onVoiceCapture: () => Promise<void>;
  voiceBusy: boolean;
}) {
  const [draft, setDraft] = useState("");

  return (
    <div className="pointer-events-auto absolute right-6 top-1/2 z-30 h-[540px] w-[340px] -translate-y-1/2">
      <AnimatePresence mode="wait">
        <motion.aside
          key={activeAgent?.id ?? "empty"}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          className="flex h-full flex-col overflow-hidden rounded-[2.5rem] border border-pink-200/12 bg-[linear-gradient(180deg,rgba(10,4,13,0.08),rgba(10,2,12,0.36))] shadow-[0_0_60px_rgba(255,84,174,0.12)] backdrop-blur-2xl"
        >
          <div className="border-b border-pink-100/8 px-5 py-5">
            <div className="text-[11px] uppercase tracking-[0.4em] text-pink-200/70">Embedded Thread</div>
            <div className="mt-2 text-2xl text-pink-50">{activeAgent?.name ?? "Select an agent"}</div>
            <div className="mt-1 text-sm leading-6 text-pink-100/74">{activeAgent?.mission}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeAgent?.linkedAgents.map((linkedAgent) => (
                <span
                  key={linkedAgent}
                  className="rounded-full border border-pink-200/10 bg-pink-200/6 px-3 py-1 text-xs text-pink-100/72"
                >
                  {linkedAgent}
                </span>
              ))}
            </div>
          </div>

          <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {thread?.messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "rounded-[1.5rem] border px-4 py-3",
                  message.author === "user"
                    ? "ml-10 border-pink-300/18 bg-pink-300/10"
                    : "mr-8 border-pink-100/10 bg-black/16",
                )}
              >
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.25em] text-pink-200/65">
                  <span>{message.author}</span>
                  <span>{message.state ?? "active"}</span>
                </div>
                <div className="mt-2 text-sm leading-6 text-pink-50">{message.content}</div>
                {message.linkedAgents?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.linkedAgents.map((linkedAgent) => (
                      <span
                        key={linkedAgent}
                        className="rounded-full border border-pink-100/10 bg-pink-100/7 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-pink-100/60"
                      >
                        {linkedAgent}
                      </span>
                    ))}
                  </div>
                ) : null}
                {message.output ? (
                  <div className="mt-3 rounded-2xl bg-pink-100/6 px-3 py-2 text-xs leading-5 text-pink-100/72">
                    {message.output}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="border-t border-pink-100/8 p-4">
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={onVoiceCapture}
                className="flex items-center gap-2 rounded-full bg-pink-200/10 px-4 py-2 text-sm text-pink-50 transition hover:bg-pink-200/18"
              >
                <Mic size={16} />
                {voiceBusy ? "Listening..." : "Voice"}
              </button>
              <div className="flex items-center gap-2 rounded-full border border-pink-100/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-pink-100/65">
                <Sparkles size={14} />
                Neural Routing
              </div>
            </div>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Directly instruct this intelligence..."
              className="min-h-[110px] w-full rounded-[1.7rem] border border-pink-100/8 bg-black/14 px-4 py-3 text-sm text-pink-50 outline-none placeholder:text-pink-100/35"
            />
            <button
              type="button"
              onClick={async () => {
                if (!draft.trim()) return;
                const content = draft;
                setDraft("");
                await onSend(content);
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-pink-400/22 px-4 py-3 text-sm text-pink-50 transition hover:bg-pink-400/32"
            >
              <SendHorizontal size={16} />
              Send To {activeAgent?.name ?? "Agent"}
            </button>
          </div>
        </motion.aside>
      </AnimatePresence>
    </div>
  );
}
