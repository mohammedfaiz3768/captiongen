import type { Caption, CaptionTemplate } from "@/types";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";

export type ExportResolution = "1080p" | "1440p" | "4k";
export type ExportFPS = 30 | 60;

export const EXPORT_RESOLUTIONS: Record<ExportResolution, { maxLongSide: number; bitrate: number; label: string }> = {
  "1080p": { maxLongSide: 1920,  bitrate: 12_000_000, label: "1080p Full HD" },
  "1440p": { maxLongSide: 2560,  bitrate: 24_000_000, label: "1440p 2K" },
  "4k":    { maxLongSide: 3840,  bitrate: 80_000_000, label: "4K Ultra HD" },
};

/** Compute canvas dimensions preserving the video's actual aspect ratio. */
function computeDimensions(videoEl: HTMLVideoElement, maxLongSide: number) {
  const vw = videoEl.videoWidth  || 1920;
  const vh = videoEl.videoHeight || 1080;
  const aspect = vw / vh;
  let w: number, h: number;
  if (aspect >= 1) { w = maxLongSide; h = Math.round(maxLongSide / aspect); }
  else             { h = maxLongSide; w = Math.round(maxLongSide * aspect); }
  // H.264 requires even dimensions
  return { w: w % 2 === 0 ? w : w - 1, h: h % 2 === 0 ? h : h - 1 };
}

// ── Canvas caption renderer ───────────────────────────────────────────────────

function parsePx(val: string | number | undefined, fallback = 0): number {
  if (val == null) return fallback;
  const n = parseFloat(String(val));
  return isNaN(n) ? fallback : n;
}

function parsePadding(pad: string | undefined) {
  if (!pad) return { top: 10, right: 20, bottom: 10, left: 20 };
  const parts = pad.trim().split(/\s+/).map(parsePx);
  if (parts.length === 1) return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  if (parts.length === 2) return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
  if (parts.length === 3) return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
  return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
}

function getCSSColor(style: Record<string, unknown>): string {
  const fill = style.WebkitTextFillColor as string | undefined;
  if (fill && fill !== "transparent") return fill;
  return (style.color as string) || "#FFFFFF";
}

function applyShadow(ctx: CanvasRenderingContext2D, shadow: string | undefined, scale: number) {
  if (!shadow) return;
  const m = shadow.match(/(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+(?:(-?\d+(?:\.\d+)?)px\s+)?(.+?)(?:,|$)/);
  if (!m) return;
  ctx.shadowOffsetX = parseFloat(m[1]) * scale;
  ctx.shadowOffsetY = parseFloat(m[2]) * scale;
  ctx.shadowBlur    = m[3] ? parseFloat(m[3]) * scale : 0;
  ctx.shadowColor   = m[4].trim();
}

function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;    ctx.shadowColor = "transparent";
}

function buildFont(textStyle: Record<string, unknown>, fontSize: number): string {
  const weight = textStyle.fontWeight ?? 700;
  const family = String(textStyle.fontFamily || "Inter, sans-serif")
    .split(",")[0].trim().replace(/['"]/g, "");
  return `${weight} ${fontSize}px "${family}"`;
}

export function drawCaptionFrame(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  caption: Caption,
  template: CaptionTemplate,
  currentTime: number,
  userScale: number,
  customPosition: { x: number; y: number } | null
) {
  const scale = (canvasW / 1920) * userScale;

  const ts  = template.textStyle        as Record<string, unknown>;
  const cs  = template.containerStyle   as Record<string, unknown>;
  const aws = (template.activeWordStyle   ?? {}) as Record<string, unknown>;
  const iws = (template.inactiveWordStyle ?? {}) as Record<string, unknown>;

  const transform = ts.textTransform as string | undefined;
  const process   = (t: string) => transform === "uppercase" ? t.toUpperCase() : t;

  const baseFontSize = parsePx(ts.fontSize as string, 22) * scale;
  ctx.font = buildFont(ts, baseFontSize);
  ctx.textBaseline = "middle";

  type WR = { text: string; color: string; shadow?: string; scaleUp: number };
  let wordList: WR[] = [];

  if (template.wordByWord && caption.words.length > 0) {
    wordList = caption.words.map((w, i) => {
      const nextStart = caption.words[i + 1]?.start ?? caption.end;
      const active    = currentTime >= w.start && currentTime < nextStart;
      const merged    = active ? { ...ts, ...aws } : { ...ts, ...iws };
      const scaleStr  = String((active ? aws : iws).transform ?? "scale(1)");
      const scaleUp   = parseFloat((scaleStr.match(/scale\(([^)]+)\)/) ?? ["", "1"])[1]);
      return { text: process(w.word), color: getCSSColor(merged), shadow: merged.textShadow as string, scaleUp };
    });
  } else {
    wordList = [{ text: process(caption.text), color: getCSSColor(ts), shadow: ts.textShadow as string, scaleUp: 1 }];
  }

  const pad  = parsePadding(cs.padding as string);
  const padX = ((pad.left + pad.right) / 2) * scale;
  const padY = ((pad.top  + pad.bottom) / 2) * scale;
  const maxW = canvasW * 0.9 - padX * 2;

  const measured = wordList.map(w => ({ ...w, w: ctx.measureText(w.text + " ").width }));

  const lines: (typeof measured)[] = [];
  let cur: typeof measured = [];
  let lw = 0;
  for (const word of measured) {
    if (lw + word.w > maxW && cur.length > 0) { lines.push(cur); cur = [word]; lw = word.w; }
    else                                        { cur.push(word); lw += word.w; }
  }
  if (cur.length > 0) lines.push(cur);

  const lineH = baseFontSize * 1.4;
  const boxH  = lines.length * lineH + padY * 2;
  const boxW  = Math.min(canvasW * 0.9,
    Math.max(...lines.map(l => l.reduce((s, w) => s + w.w, 0))) + padX * 2);

  let cx: number, cy: number;
  if (customPosition) {
    cx = (customPosition.x / 100) * canvasW;
    cy = (customPosition.y / 100) * canvasH;
  } else {
    cx = canvasW / 2;
    switch (template.position) {
      case "top":    cy = canvasH * 0.10 + boxH / 2; break;
      case "center": cy = canvasH * 0.50;             break;
      default:       cy = canvasH * 0.90 - boxH / 2; break;
    }
  }

  const bx = cx - boxW / 2;
  const by = cy - boxH / 2;

  const bg = (cs.background ?? cs.backgroundColor) as string | undefined;
  if (bg && !bg.startsWith("linear-gradient")) {
    const br = parsePx(cs.borderRadius as string, 0) * scale;
    ctx.save();
    ctx.fillStyle = bg;
    ctx.beginPath();
    if (br > 0 && ctx.roundRect) ctx.roundRect(bx, by, boxW, boxH, br);
    else ctx.rect(bx, by, boxW, boxH);
    ctx.fill();
    ctx.restore();
  }

  let ly = by + padY + lineH / 2;
  for (const line of lines) {
    const lTotal = line.reduce((s, w) => s + w.w, 0);
    let lx = cx - lTotal / 2;
    for (const word of line) {
      ctx.save();
      ctx.font = buildFont(ts, baseFontSize);
      ctx.textBaseline = "middle";
      if (word.scaleUp !== 1) {
        const wx = lx + word.w / 2;
        ctx.translate(wx, ly); ctx.scale(word.scaleUp, word.scaleUp); ctx.translate(-wx, -ly);
      }
      applyShadow(ctx, word.shadow, scale);
      ctx.fillStyle = word.color;
      ctx.fillText(word.text, lx, ly);
      clearShadow(ctx);
      ctx.restore();
      lx += word.w;
    }
    ly += lineH;
  }
}

// ── MP4 export via WebCodecs + mp4-muxer ─────────────────────────────────────

/** Try codec configs from high to low until one is supported. */
async function resolveVideoCodec(outW: number, outH: number, bitrate: number, fps: ExportFPS) {
  const candidates = [
    `avc1.640034`, // High Profile Level 5.2
    `avc1.640033`, // High Profile Level 5.1
    `avc1.640032`, // High Profile Level 5.0
    `avc1.4d0034`, // Main Profile Level 5.2
    `avc1.4d0032`, // Main Profile Level 5.0
    `avc1.420034`, // Baseline Level 5.2
    `avc1.42002a`, // Baseline Level 4.2
  ];
  for (const codec of candidates) {
    try {
      const support = await VideoEncoder.isConfigSupported({ codec, width: outW, height: outH, bitrate, framerate: fps });
      if (support.supported) return codec;
    } catch { /* try next */ }
  }
  return null; // no H.264 support
}

async function exportMP4(
  videoEl: HTMLVideoElement,
  captions: Caption[],
  template: CaptionTemplate,
  captionScale: number,
  captionPosition: { x: number; y: number } | null,
  outW: number,
  outH: number,
  fps: ExportFPS,
  bitrate: number,
  onProgress: (pct: number) => void,
  signal: AbortSignal
): Promise<Blob> {
  const codec = await resolveVideoCodec(outW, outH, bitrate, fps);
  if (!codec) throw new Error("No supported H.264 codec found on this device.");

  // ── Separate hidden video element so the visible player keeps playing ─────
  const ev = document.createElement("video");
  ev.src        = videoEl.src;
  ev.muted      = true;
  ev.playsInline = true;
  ev.preload    = "auto";
  await new Promise<void>((res, rej) => {
    ev.onloadedmetadata = () => res();
    ev.onerror = () => rej(new Error("Export video failed to load"));
    setTimeout(() => rej(new Error("Video load timeout")), 15_000);
  });

  const canvas = document.createElement("canvas");
  canvas.width  = outW;
  canvas.height = outH;
  // No willReadFrequently — VideoFrame reads from GPU, no CPU readback needed
  const ctx = canvas.getContext("2d")!;

  // ── Decode audio ──────────────────────────────────────────────────────────
  let audioBuffer: AudioBuffer | null = null;
  try {
    const resp = await fetch(videoEl.src);
    const ab   = await resp.arrayBuffer();
    const actx = new AudioContext();
    audioBuffer = await actx.decodeAudioData(ab);
    await actx.close();
  } catch { /* no audio track — continue video-only */ }

  // ── Muxer ─────────────────────────────────────────────────────────────────
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width: outW, height: outH },
    ...(audioBuffer ? {
      audio: {
        codec: "aac",
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
      }
    } : {}),
    fastStart: "in-memory",
  });

  // ── Encoders ──────────────────────────────────────────────────────────────
  let encoderError: DOMException | null = null;

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta!),
    error:  (e) => { encoderError = e; },
  });
  videoEncoder.configure({ codec, width: outW, height: outH, bitrate });

  if (audioBuffer) {
    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta!),
      error:  (e) => { encoderError = e; },
    });
    audioEncoder.configure({
      codec: "mp4a.40.2",
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      bitrate: 192_000,
    });

    const SR     = audioBuffer.sampleRate;
    const CHUNK  = 4096;
    const nch    = audioBuffer.numberOfChannels;
    const chData = Array.from({ length: nch }, (_, c) => audioBuffer!.getChannelData(c));

    for (let i = 0; i < audioBuffer.length; i += CHUNK) {
      const count = Math.min(CHUNK, audioBuffer.length - i);
      const plane = new Float32Array(count * nch);
      for (let c = 0; c < nch; c++) plane.set(chData[c].subarray(i, i + count), c * count);
      const ad = new AudioData({
        format: "f32-planar",
        sampleRate: SR,
        numberOfFrames: count,
        numberOfChannels: nch,
        timestamp: Math.round((i / SR) * 1_000_000),
        data: plane,
      });
      audioEncoder.encode(ad);
      ad.close();
    }
    await audioEncoder.flush();
  }

  // ── Frame loop on hidden element ──────────────────────────────────────────
  const duration = ev.duration || videoEl.duration || 1;
  let frameIdx   = 0;

  type VFRC = (now: DOMHighResTimeStamp, metadata: { mediaTime: number }) => void;
  const rvfc = (el: HTMLVideoElement, cb: VFRC) =>
    (el as unknown as { requestVideoFrameCallback: (cb: VFRC) => void }).requestVideoFrameCallback(cb);

  await new Promise<void>((resolve, reject) => {
    let done = false;
    const finish = () => { if (!done) { done = true; ev.pause(); resolve(); } };

    const onFrame: VFRC = (_now, metadata) => {
      if (done) return;
      if (signal.aborted) { done = true; ev.pause(); reject(new DOMException("Aborted", "AbortError")); return; }
      if (encoderError)   { done = true; ev.pause(); reject(encoderError); return; }

      const t = metadata.mediaTime;
      ctx.drawImage(ev, 0, 0, outW, outH);
      const cap = captions.find(c => t >= c.start && t <= c.end) ?? null;
      if (cap) drawCaptionFrame(ctx, outW, outH, cap, template, t, captionScale, captionPosition);

      // Queue limit of 8 — prevents memory crash on 4K
      if (videoEncoder.encodeQueueSize < 8) {
        const frame = new VideoFrame(canvas, { timestamp: Math.round(t * 1_000_000) });
        videoEncoder.encode(frame, { keyFrame: frameIdx % (fps * 2) === 0 });
        frame.close();
        frameIdx++;
      }

      onProgress(Math.min(98, (t / duration) * 100));

      if (ev.ended || t >= duration - 0.05) finish();
      else rvfc(ev, onFrame);
    };

    ev.onended = finish;
    ev.currentTime = 0;
    ev.play()
      .then(() => rvfc(ev, onFrame))
      .catch(reject);
  });

  ev.src = ""; // release memory

  await videoEncoder.flush();
  if (encoderError) throw new Error(`Encoder error: ${String(encoderError)}`);

  muxer.finalize();
  const { buffer } = muxer.target as ArrayBufferTarget;
  return new Blob([buffer], { type: "video/mp4" });
}

// ── WebM fallback via MediaRecorder ──────────────────────────────────────────

async function exportWebM(
  videoEl: HTMLVideoElement,
  captions: Caption[],
  template: CaptionTemplate,
  captionScale: number,
  captionPosition: { x: number; y: number } | null,
  outW: number,
  outH: number,
  fps: ExportFPS,
  bitrate: number,
  onProgress: (pct: number) => void,
  signal: AbortSignal
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width  = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;

  const rawStream    = (videoEl as unknown as { captureStream?(): MediaStream }).captureStream?.();
  const canvasStream = canvas.captureStream(fps);
  rawStream?.getAudioTracks().forEach(t => canvasStream.addTrack(t.clone()));

  const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
    .find(m => MediaRecorder.isTypeSupported(m)) ?? "video/webm";

  const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: bitrate });
  const chunks: Blob[] = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

  return new Promise((resolve, reject) => {
    let rafId = 0;
    const duration = videoEl.duration || 1;
    const stop = () => { cancelAnimationFrame(rafId); if (recorder.state !== "inactive") recorder.stop(); };
    recorder.onstop  = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = () => reject(new Error("MediaRecorder error"));
    signal.addEventListener("abort", () => { stop(); reject(new DOMException("Aborted", "AbortError")); });

    const drawLoop = () => {
      if (signal.aborted) return;
      const t = videoEl.currentTime;
      onProgress(Math.min(98, (t / duration) * 100));
      ctx.drawImage(videoEl, 0, 0, outW, outH);
      const cap = captions.find(c => t >= c.start && t <= c.end) ?? null;
      if (cap) drawCaptionFrame(ctx, outW, outH, cap, template, t, captionScale, captionPosition);
      if (!videoEl.ended) rafId = requestAnimationFrame(drawLoop);
      else { stop(); onProgress(100); }
    };

    recorder.start(100);
    videoEl.currentTime = 0;
    videoEl.play().then(() => { rafId = requestAnimationFrame(drawLoop); }).catch(reject);
    videoEl.onended = () => { stop(); onProgress(100); };
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export function canExportMP4(): boolean {
  return typeof VideoEncoder !== "undefined" && typeof AudioEncoder !== "undefined";
}

export async function exportVideoWithCaptions(
  videoEl: HTMLVideoElement,
  captions: Caption[],
  template: CaptionTemplate,
  captionScale: number,
  captionPosition: { x: number; y: number } | null,
  resolution: ExportResolution,
  fps: ExportFPS,
  onProgress: (pct: number) => void,
  signal: AbortSignal
): Promise<{ blob: Blob; ext: string }> {
  const res = EXPORT_RESOLUTIONS[resolution];
  const { w: outW, h: outH } = computeDimensions(videoEl, res.maxLongSide);

  if (canExportMP4()) {
    try {
      const blob = await exportMP4(videoEl, captions, template, captionScale, captionPosition, outW, outH, fps, res.bitrate, onProgress, signal);
      return { blob, ext: "mp4" };
    } catch (e) {
      // If aborted, rethrow
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      // Otherwise fall through to WebM
      console.warn("MP4 export failed, falling back to WebM:", e);
    }
  }

  const blob = await exportWebM(videoEl, captions, template, captionScale, captionPosition, outW, outH, fps, res.bitrate, onProgress, signal);
  return { blob, ext: "webm" };
}
