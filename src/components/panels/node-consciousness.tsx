"use client";

import { motion } from "framer-motion";

import type { AgentNode, AgentThread, CoreState, NotificationEvent, TaskThread, ZoomLevel } from "@/types/core";

// NodeConsciousness only mounts at zoom === "close" (enforced by parent).
// ONE layer renders at a time — no simultaneous stacking of text blocks.
export function NodeConsciousness({
  agent,
  thread,
  activeTask,
  notifications,
  state,
}: {
  agent?: AgentNode;
  thread?: AgentThread;
  activeTask?: TaskThread;
  notifications: NotificationEvent[];
  zoom: ZoomLevel;
  state: CoreState;
}) {
  if (!state?.neuroplasticity) {
    console.error("[CLAWDETTE] invalid node payload", "node consciousness missing neuroplasticity");
    return null;
  }

  const recentMessages = thread?.messages.slice(-4) ?? [];
  const strongestPathways = (state.neuroplasticity?.pathways ?? [])
    .filter((pathway) => pathway.from === agent?.id || pathway.to === agent?.id)
    .sort((a, b) => b.weight + b.salience - (a.weight + a.salience))
    .slice(0, 3);
  const dominantPatterns = (state.neuroplasticity?.behavioralPatterns ?? []).slice(0, 3);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <motion.div
        key={agent?.id ?? "none"}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative flex h-[60vh] w-[60vh] max-h-[620px] max-w-[620px] items-center justify-center"
      >
        {/* Halo rings */}
        <div className="absolute inset-[16%] rounded-full border border-pink-200/8 bg-[radial-gradient(circle_at_center,rgba(255,129,206,0.04),rgba(6,1,8,0.02)_58%,transparent_76%)] blur-[1px]" />
        <div className="absolute inset-[27%] rounded-full border border-pink-300/10" />

        <motion.div
          animate={{ scale: [1, 1.008, 1], opacity: [0.42, 0.58, 0.42] }}
          transition={{ duration: 7.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="absolute inset-[30%] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,92,180,0.14),rgba(255,123,206,0.06)_34%,rgba(255,185,231,0.02)_58%,transparent_74%)] blur-2xl"
        />

        {/* Central node label */}
        <div className="relative flex h-[28%] w-[28%] min-h-[120px] min-w-[120px] items-center justify-center rounded-full border border-pink-300/10 bg-[radial-gradient(circle_at_center,rgba(255,166,223,0.08),rgba(8,2,10,0.05)_58%,transparent_82%)]">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[0.45em] text-pink-200/40">{agent?.name ?? "CLAWDETTE"}</div>
            <div className="mx-auto mt-4 max-w-[180px] text-xs leading-5 text-pink-100/54">
              {activeTask?.reasoningTrace?.verdict ?? agent?.mission}
            </div>
          </div>
        </div>

        {/* CLOSE-ZOOM ONLY: thread signals, pathways, outbound trace */}
        <SignalThread className="left-[4%] top-[40%] max-w-[180px]" messages={recentMessages} />
        <SignalThread className="right-[4%] top-[46%] max-w-[180px]" messages={recentMessages.slice().reverse()} />
        {notifications[0] ? (
          <OutboundTrace className="top-[12%] right-[18%]" notification={notifications[0]} />
        ) : null}
        <AdaptivePathways
          className="left-[10%] bottom-[8%]"
          pathways={strongestPathways.map((p) => `${p.label} ${Math.round(p.weight * 100)}%`)}
        />
        <AdaptivePathways
          className="right-[11%] bottom-[9%]"
          pathways={dominantPatterns.map((p) => `${p.theme} ×${p.count}`)}
          title="Habit Loops"
        />
      </motion.div>
    </div>
  );
}

function SignalThread({
  messages,
  className,
}: {
  messages: AgentThread["messages"];
  className: string;
}) {
  return (
    <div className={`absolute ${className}`}>
      {messages.map((message, index) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, x: index % 2 === 0 ? -12 : 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.07 }}
          className="mb-3"
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-pink-300 shadow-[0_0_14px_rgba(255,105,188,0.9)]" />
            <span className="text-[9px] uppercase tracking-[0.3em] text-pink-200/34">{message.author}</span>
          </div>
          <div className="ml-4 mt-1 border-l border-pink-200/10 pl-3 text-[11px] leading-5 text-pink-100/48">
            {message.content}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function OutboundTrace({
  notification,
  className,
}: {
  notification: NonNullable<NotificationEvent>;
  className: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} className={`absolute ${className}`}>
      <div className="text-[9px] uppercase tracking-[0.36em] text-pink-200/32">Outbound Signal</div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-px w-16 bg-gradient-to-r from-pink-300/80 to-transparent" />
        <div className="rounded-full border border-pink-200/12 bg-black/12 px-3 py-2 text-[9px] uppercase tracking-[0.3em] text-pink-50">
          {notification.channels.join(" / ")}
        </div>
      </div>
      <div className="mt-2 max-w-[160px] text-[11px] leading-5 text-pink-100/48">{notification.title}</div>
    </motion.div>
  );
}

function AdaptivePathways({
  pathways,
  className,
  title = "Strengthened Paths",
}: {
  pathways: string[];
  className: string;
  title?: string;
}) {
  return (
    <div className={`absolute ${className}`}>
      <div className="text-[9px] uppercase tracking-[0.36em] text-pink-200/32">{title}</div>
      <div className="mt-3 space-y-2">
        {pathways.map((pathway) => (
          <div key={pathway} className="text-[11px] leading-5 text-pink-100/48">
            {pathway}
          </div>
        ))}
      </div>
    </div>
  );
}
