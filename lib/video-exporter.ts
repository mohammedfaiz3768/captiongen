import type { Caption, CaptionTemplate } from "@/types";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";

export type ExportResolution = "1080p" | "1440p" | "4k";
export type ExportFPS = 30 | 60;

export const EXPORT_RESOLUTIONS: Record<ExportResolution, { maxLongSide: number; bitrate: number; label: string }> = {
  "1080p": { maxLongSide: 1920, bitrate:  8_000_000, label: "1080p Full HD" },
  "1440p": { maxLongSide: 2560, bitrate: 16_000_000, label: "1440p 2K" },
  "4k":    { maxLongSide: 3840, bitrate: 20_000_000, label: "4K Ultra HD" },
};

/**
 * Compute canvas dimensions preserving the video's actual aspect ratio.
 * Also caps to the video's native resolution — no pointless upscaling.
 */
function computeDimensions(videoEl: HTMLVideoElement, maxLongSide: number) {
  const vw = videoEl.videoWidth  || 1920;
  const vh = videoEl.videoHeight || 1080;
  const aspect = vw / vh;

  // Cap maxLongSide to native resolution (upscaling 1080p to 4K is pure waste)
  const nativeLong = Math.max(vw, vh);
  const effectiveMax = Math.min(maxLongSide, nativeLong);

  let w: number, h: number;
  if (aspect >= 1) { w = effectiveMax; h = Math.round(effectiveMax / aspect); }
  else             { h = effectiveMax; w = Math.round(effectiveMax * aspect); }
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

/** Create a canvas — OffscreenCanvas if available (GPU path), DOM canvas as fallback. */
function makeCanvas(w: number, h: number): { canvas: OffscreenCanvas | HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d")!;
    return { canvas, ctx: ctx as unknown as CanvasRenderingContext2D };
  }
  const canvas = document.createElement("canvas");
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx };
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
  // Check for requestVideoFrameCallback support upfront
  if (!("requestVideoFrameCallback" in HTMLVideoElement.prototype)) {
    throw new Error("requestVideoFrameCallback not supported");
  }

  const codec = await resolveVideoCodec(outW, outH, bitrate, fps);
  if (!codec) throw new Error("No supported H.264 codec found on this device.");

  const duration = videoEl.duration || 1;
  onProgress(5);

  if (signal.aborted) throw new DOMException("Aborted", "AbortError");

  // ── Hidden video element for frame capture ────────────────────────────────
  // Placed inside a 0×0 overflow:hidden container at top:0,left:0 so the browser
  // treats it as "visible" (no background throttling) without rendering anything.
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;overflow:hidden;pointer-events:none;z-index:-1";
  document.body.appendChild(wrapper);

  const ev = document.createElement("video");
  ev.src          = videoEl.src;
  ev.muted        = true;
  ev.playsInline  = true;
  ev.preload      = "auto";
  wrapper.appendChild(ev);

  try {
    await new Promise<void>((res, rej) => {
      ev.onloadedmetadata = () => res();
      ev.onerror          = () => rej(new Error("Export video failed to load"));
      setTimeout(() => rej(new Error("Video load timeout")), 15_000);
    });
  } catch (err) {
    document.body.removeChild(wrapper);
    throw err;
  }

  onProgress(10);

  // Use OffscreenCanvas if available (GPU-to-GPU, no CPU readback).
  // DOM canvas forces GPU→CPU→GPU — expensive at 4K.
  const { canvas, ctx } = makeCanvas(outW, outH);

  // ── Muxer ─────────────────────────────────────────────────────────────────
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width: outW, height: outH },
    fastStart: "in-memory",
  });

  // ── Video encoder ──────────────────────────────────────────────────────────
  let encoderError: Error | null = null;

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta!),
    error:  (e) => { encoderError = e; },
  });
  videoEncoder.configure({ codec, width: outW, height: outH, bitrate });

  // ── Frame loop via requestVideoFrameCallback ───────────────────────────────
  // Fires once per decoded frame. When encoder queue backs up we pause the video,
  // drain it, then resume — preventing the "stuck at N%" stall.
  let frameIdx = 0;

  type VFRC = (now: DOMHighResTimeStamp, metadata: { mediaTime: number }) => void;
  const rvfc = (el: HTMLVideoElement, cb: VFRC) =>
    (el as unknown as { requestVideoFrameCallback: (cb: VFRC) => void }).requestVideoFrameCallback(cb);

  try {
    await new Promise<void>((resolve, reject) => {
      let done = false;
      const finish = () => { if (!done) { done = true; ev.pause(); resolve(); } };
      const fail   = (e: unknown) => { if (!done) { done = true; ev.pause(); reject(e); } };

      const scheduleNext = () => {
        if (done) return;
        // Backpressure: if encoder queue is full, pause video and poll until it drains.
        // This is why export appears to "pause" — we do it intentionally to avoid data loss.
        if (videoEncoder.encodeQueueSize > 3) {
          ev.pause();
          const drain = () => {
            if (done) return;
            if (videoEncoder.encodeQueueSize <= 1) {
              ev.play().then(() => rvfc(ev, onFrame)).catch(fail);
            } else {
              setTimeout(drain, 20);
            }
          };
          setTimeout(drain, 20);
        } else {
          rvfc(ev, onFrame);
        }
      };

      const onFrame: VFRC = (_now, metadata) => {
        if (done) return;
        if (signal.aborted) { fail(new DOMException("Aborted", "AbortError")); return; }
        if (encoderError)   { fail(encoderError); return; }

        const t = metadata.mediaTime;

        ctx.drawImage(ev, 0, 0, outW, outH);
        const cap = captions.find(c => t >= c.start && t <= c.end) ?? null;
        if (cap) drawCaptionFrame(ctx, outW, outH, cap, template, t, captionScale, captionPosition);

        const frame = new VideoFrame(canvas as OffscreenCanvas, { timestamp: Math.round(t * 1_000_000) });
        videoEncoder.encode(frame, { keyFrame: frameIdx % 60 === 0 });
        frame.close();
        frameIdx++;

        onProgress(10 + Math.min(88, (t / duration) * 88));

        if (ev.ended || t >= duration - 0.05) finish();
        else scheduleNext();
      };

      ev.onended = finish;
      ev.currentTime  = 0;
      ev.playbackRate = 0.25; // 4× time budget per frame at source fps
      ev.play()
        .then(() => rvfc(ev, onFrame))
        .catch(fail);
    });
  } finally {
    document.body.removeChild(wrapper);
  }

  await videoEncoder.flush();
  if (encoderError) throw encoderError;

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
  // Hidden video element in a 0×0 container — in DOM so browser doesn't throttle it
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;overflow:hidden;pointer-events:none;z-index:-1";
  document.body.appendChild(wrapper);

  const ev = document.createElement("video");
  ev.src          = videoEl.src;
  ev.muted        = false; // need audio for captureStream
  ev.playsInline  = true;
  ev.preload      = "auto";
  wrapper.appendChild(ev);

  await new Promise<void>((res, rej) => {
    ev.onloadedmetadata = () => res();
    ev.onerror          = () => rej(new Error("WebM: video failed to load"));
    setTimeout(() => rej(new Error("WebM: video load timeout")), 15_000);
  });

  const canvas = document.createElement("canvas");
  canvas.width  = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;

  const rawStream    = (ev as unknown as { captureStream?(): MediaStream }).captureStream?.();
  const canvasStream = canvas.captureStream(fps);
  rawStream?.getAudioTracks().forEach(t => canvasStream.addTrack(t.clone()));

  const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
    .find(m => MediaRecorder.isTypeSupported(m)) ?? "video/webm";

  const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: bitrate });
  const chunks: Blob[] = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

  return new Promise((resolve, reject) => {
    let rafId = 0;
    let stallTimer = 0;
    let lastTime = -1;
    const duration = ev.duration || videoEl.duration || 1;

    const cleanup = () => {
      cancelAnimationFrame(rafId);
      clearTimeout(stallTimer);
      if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
      ev.pause(); ev.src = "";
      if (recorder.state !== "inactive") recorder.stop();
    };

    recorder.onstop  = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = () => { cleanup(); reject(new Error("MediaRecorder error")); };
    signal.addEventListener("abort", () => { cleanup(); reject(new DOMException("Aborted", "AbortError")); });

    const drawLoop = () => {
      if (signal.aborted) return;
      const t = ev.currentTime;
      onProgress(Math.min(98, (t / duration) * 100));
      ctx.drawImage(ev, 0, 0, outW, outH);
      const cap = captions.find(c => t >= c.start && t <= c.end) ?? null;
      if (cap) drawCaptionFrame(ctx, outW, outH, cap, template, t, captionScale, captionPosition);

      // Stall watchdog: if time hasn't advanced in 8 s, the video is stuck — finish up
      if (t !== lastTime) { lastTime = t; clearTimeout(stallTimer); stallTimer = window.setTimeout(() => { cleanup(); onProgress(100); }, 8_000); }

      if (!ev.ended) rafId = requestAnimationFrame(drawLoop);
      else { cleanup(); onProgress(100); }
    };

    ev.onended = () => { cleanup(); onProgress(100); };
    recorder.start(100);
    ev.currentTime = 0;
    ev.play().then(() => { rafId = requestAnimationFrame(drawLoop); }).catch(reject);
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
  signal: AbortSignal,
  onWarning?: (msg: string) => void
): Promise<{ blob: Blob; ext: string }> {
  const res = EXPORT_RESOLUTIONS[resolution];
  const { w: outW, h: outH } = computeDimensions(videoEl, res.maxLongSide);

  if (canExportMP4()) {
    try {
      const blob = await exportMP4(videoEl, captions, template, captionScale, captionPosition, outW, outH, fps, res.bitrate, onProgress, signal);
      return { blob, ext: "mp4" };
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      const reason = e instanceof Error ? e.message : String(e);
      console.warn("MP4 export failed, falling back to WebM:", reason);
      onWarning?.(`MP4 failed (${reason}) — exporting as WebM instead`);
    }
  }

  const blob = await exportWebM(videoEl, captions, template, captionScale, captionPosition, outW, outH, fps, res.bitrate, onProgress, signal);
  return { blob, ext: "webm" };
}
