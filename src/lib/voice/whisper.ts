import { nowIso, uid } from "@/lib/utils";
import { dataPaths, writeJsonFile } from "@/lib/persistence/fs-store";
import type { MemoryArtifact, TranscriptionResult } from "@/types/core";

export async function transcribeAudio(
  audioBase64: string,
  storeAsMemory: boolean,
): Promise<TranscriptionResult> {
  const endpoint = process.env.WHISPER_TRANSCRIBE_URL;

  if (!endpoint) {
    const text =
      "Whisper adapter not configured yet. This placeholder transcript confirms the voice lane and storage path are active.";
    const storedArtifactId = storeAsMemory ? await storeTranscriptArtifact(text) : undefined;

    return {
      text,
      storedArtifactId,
      durationMs: Math.round(audioBase64.length / 64),
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.WHISPER_API_KEY
        ? { Authorization: `Bearer ${process.env.WHISPER_API_KEY}` }
        : {}),
    },
    body: JSON.stringify({
      audio: audioBase64,
      format: "base64",
      model: "whisper-compatible",
    }),
  });

  if (!response.ok) {
    throw new Error(`Transcription failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { text?: string; durationMs?: number };
  const text = payload.text ?? "";
  const storedArtifactId = storeAsMemory ? await storeTranscriptArtifact(text) : undefined;

  return {
    text,
    durationMs: payload.durationMs,
    storedArtifactId,
  };
}

async function storeTranscriptArtifact(text: string) {
  const artifact: MemoryArtifact = {
    id: uid("voice"),
    layer: "session",
    title: "Voice Transcript",
    summary: text.slice(0, 280),
    tags: ["voice", "transcript", "routing"],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await writeJsonFile(dataPaths.sessionMemory, artifact);
  return artifact.id;
}
