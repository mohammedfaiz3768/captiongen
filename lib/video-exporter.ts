import type { Caption, CaptionTemplate } from "@/types";

export type ExportResolution = "1080p" | "1440p" | "4k";
export type ExportFPS = 30 | 60;

export const EXPORT_RESOLUTIONS: Record<ExportResolution, { width: number; height: number; bitrate: number; label: string }> = {
  "1080p": { width: 1920,  height: 1080,  bitrate: 12_000_000, label: "1080p Full HD" },
  "1440p": { width: 2560,  height: 1440,  bitrate: 24_000_000, label: "1440p 2K" },
  "4k":    { width: 3840,  height: 2160,  bitrate: 80_000_000, label: "4K Ultra HD" },
};

// ── Canvas caption renderer ───────────────────────────────────────────────────

function parsePx(val: string | number | undefined, fallback = 0): number {
  if (val == null) return fallback;
  const n = parseFloat(String(val));
  return isNaN(n) ? fallback : n;
}

function parsePadding(pad: string | undefined): { top: number; right: number; bottom: number; left: number } {
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
  // parse first shadow segment only
  const m = shadow.match(/(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+(?:(-?\d+(?:\.\d+)?)px\s+)?(.+?)(?:,|$)/);
  if (!m) return;
  ctx.shadowOffsetX = parseFloat(m[1]) * scale;
  ctx.shadowOffsetY = parseFloat(m[2]) * scale;
  ctx.shadowBlur    = m[3] ? parseFloat(m[3]) * scale : 0;
  ctx.shadowColor   = m[4].trim();
}

function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur    = 0;
  ctx.shadowColor   = "transparent";
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

  const ts  = template.textStyle  as Record<string, unknown>;
  const cs  = template.containerStyle as Record<string, unknown>;
  const aws = (template.activeWordStyle   ?? {}) as Record<string, unknown>;
  const iws = (template.inactiveWordStyle ?? {}) as Record<string, unknown>;

  const transform = ts.textTransform as string | undefined;
  const process   = (t: string) => transform === "uppercase" ? t.toUpperCase() : t;

  const baseFontSize = parsePx(ts.fontSize as string, 22) * scale;
  ctx.font = buildFont(ts, baseFontSize);
  ctx.textBaseline = "middle";

  // ── Build word list ───────────────────────────────────────────────────────
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

  // ── Measure + wrap ────────────────────────────────────────────────────────
  const gap    = 6 * scale;
  const pad    = parsePadding(cs.padding as string);
  const padX   = ((pad.left + pad.right) / 2) * scale;
  const padY   = ((pad.top  + pad.bottom) / 2) * scale;
  const maxW   = canvasW * 0.9 - padX * 2;

  const measured = wordList.map(w => ({ ...w, w: ctx.measureText(w.text + " ").width }));

  const lines: (typeof measured)[] = [];
  let cur: typeof measured = [];
  let lw = 0;
  for (const word of measured) {
    if (lw + word.w > maxW && cur.length > 0) { lines.push(cur); cur = [word]; lw = word.w; }
    else                                        { cur.push(word); lw += word.w; }
  }
  if (cur.length > 0) lines.push(cur);

  const lineH  = baseFontSize * 1.4;
  const boxH   = lines.length * lineH + padY * 2;
  const boxW   = Math.min(canvasW * 0.9,
    Math.max(...lines.map(l => l.reduce((s, w) => s + w.w, 0))) + padX * 2);

  // ── Position ──────────────────────────────────────────────────────────────
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

  // ── Draw background ───────────────────────────────────────────────────────
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

  // ── Draw words ────────────────────────────────────────────────────────────
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
        ctx.translate(wx, ly);
        ctx.scale(word.scaleUp, word.scaleUp);
        ctx.translate(-wx, -ly);
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

// ── Main export function ──────────────────────────────────────────────────────

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
): Promise<Blob> {
  const res = EXPORT_RESOLUTIONS[resolution];

  const canvas = document.createElement("canvas");
  canvas.width  = res.width;
  canvas.height = res.height;
  const ctx = canvas.getContext("2d")!;

  // Grab audio track from the video element's stream
  const rawStream = (videoEl as unknown as { captureStream?(): MediaStream }).captureStream?.();
  const canvasStream = canvas.captureStream(fps);
  rawStream?.getAudioTracks().forEach(t => canvasStream.addTrack(t.clone()));

  const mimeTypes = [
    `video/webm;codecs=vp9,opus`,
    `video/webm;codecs=vp8,opus`,
    `video/webm`,
    `video/mp4`,
  ];
  const mimeType = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) ?? "video/webm";

  const recorder = new MediaRecorder(canvasStream, {
    mimeType,
    videoBitsPerSecond: res.bitrate,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

  return new Promise((resolve, reject) => {
    let rafId = 0;
    const duration = videoEl.duration || 1;

    const stop = () => {
      cancelAnimationFrame(rafId);
      if (recorder.state !== "inactive") recorder.stop();
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };
    recorder.onerror = () => reject(new Error("MediaRecorder error"));

    signal.addEventListener("abort", () => { stop(); reject(new DOMException("Aborted", "AbortError")); });

    const drawLoop = () => {
      if (signal.aborted) return;

      const t = videoEl.currentTime;
      onProgress(Math.min(99, (t / duration) * 100));

      // Draw video frame upscaled to target resolution
      ctx.drawImage(videoEl, 0, 0, res.width, res.height);

      // Find and draw caption
      const cap = captions.find(c => t >= c.start && t <= c.end) ?? null;
      if (cap) drawCaptionFrame(ctx, res.width, res.height, cap, template, t, captionScale, captionPosition);

      if (!videoEl.ended) rafId = requestAnimationFrame(drawLoop);
      else { stop(); onProgress(100); }
    };

    recorder.start(100); // collect chunks every 100ms
    videoEl.currentTime = 0;
    videoEl.play().then(() => { rafId = requestAnimationFrame(drawLoop); }).catch(reject);
    videoEl.onended = () => { stop(); onProgress(100); };
  });
}
