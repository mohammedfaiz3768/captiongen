import { encodeWAV } from "./wav-encoder";
import { TARGET_SAMPLE_RATE } from "./constants";

export type ProgressCallback = (step: string, progress: number) => void;

export async function extractAudio(
  file: File,
  onProgress: ProgressCallback,
  signal?: AbortSignal
): Promise<Blob> {
  if (!window.AudioContext && !(window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) {
    throw new Error(
      "Web Audio API is not supported in this browser. Please use Chrome, Firefox, or Safari."
    );
  }

  onProgress("Reading video file...", 10);

  const arrayBuffer = await file.arrayBuffer();

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  onProgress("Decoding audio tracks...", 30);

  const AudioCtx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioCtx();

  let decoded: AudioBuffer;
  try {
    decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  } catch {
    await audioContext.close();
    throw new Error(
      "Could not decode audio from this video file. The file may have no audio track or use an unsupported format."
    );
  }

  if (signal?.aborted) {
    await audioContext.close();
    throw new DOMException("Aborted", "AbortError");
  }

  onProgress("Resampling to 16kHz...", 55);

  // Resample to mono 16kHz
  const targetSampleRate = TARGET_SAMPLE_RATE;
  const duration = decoded.duration;
  const targetLength = Math.ceil(duration * targetSampleRate);

  const offlineCtx = new OfflineAudioContext(1, targetLength, targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start(0);

  const resampled = await offlineCtx.startRendering();

  await audioContext.close();

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  onProgress("Encoding WAV...", 80);

  const wavBuffer = encodeWAV(resampled);

  onProgress("Audio ready", 100);

  return new Blob([wavBuffer], { type: "audio/wav" });
}
