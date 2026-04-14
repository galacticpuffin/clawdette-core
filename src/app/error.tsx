"use client";

import { useEffect } from "react";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CLAWDETTE] App Router error boundary triggered", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#040106] px-6 text-pink-50">
      <div className="glass max-w-xl rounded-[2rem] p-8 text-center">
        <div className="text-[11px] uppercase tracking-[0.4em] text-pink-200/70">Runtime Error</div>
        <h1 className="mt-3 text-3xl">CLAWDETTE CORE hit a runtime fault.</h1>
        <p className="mt-4 text-sm leading-6 text-pink-100/76">
          Check the browser console for a message starting with <code>[CLAWDETTE]</code>. This boundary should prevent a blank screen.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-pink-400/22 px-5 py-3 text-sm text-pink-50 transition hover:bg-pink-400/32"
        >
          Retry Render
        </button>
      </div>
    </main>
  );
}
