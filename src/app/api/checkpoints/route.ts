import { NextResponse } from "next/server";

import { createGitCheckpoint } from "@/lib/git/checkpoints";

export async function POST(request: Request) {
  const payload = (await request.json()) as { summary?: string };
  const result = await createGitCheckpoint(payload.summary ?? "state checkpoint");
  return NextResponse.json(result);
}
