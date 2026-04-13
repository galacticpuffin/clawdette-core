import { NextResponse } from "next/server";

import { appendThreadMessage, loadThreads } from "@/lib/persistence/core-store";
import type { ThreadMessage } from "@/types/core";

export async function GET() {
  const threads = await loadThreads();
  return NextResponse.json(threads);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    agentId: string;
    messages: ThreadMessage[];
  };

  let thread;
  for (const message of payload.messages) {
    thread = await appendThreadMessage(payload.agentId, message);
  }

  return NextResponse.json(thread);
}
