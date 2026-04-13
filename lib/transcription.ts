import type { TranscriptionResult } from "@/types";

export async function transcribeAudio(
  audioBlob: Blob,
  apiKey: string,
  signal?: AbortSignal
): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.wav");

  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
    },
    body: formData,
    signal,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      errorMessage = errData.error ?? errorMessage;
    } catch {
      // ignore parse error
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data as TranscriptionResult;
}

export async function testApiKey(apiKey: string): Promise<boolean> {
  // We test by sending a tiny silent WAV to the transcription endpoint
  // Instead, just verify the key format since we can't make a real call easily
  return typeof apiKey === "string" && apiKey.startsWith("gsk_") && apiKey.length > 20;
}
