import { NextResponse } from "next/server";

import { transcribeAudio } from "@/lib/voice/whisper";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    audioBase64: string;
    storeAsMemory?: boolean;
  };

  const result = await transcribeAudio(payload.audioBase64, Boolean(payload.storeAsMemory));
  return NextResponse.json(result);
}
