import type { Caption, CaptionTemplate, ExportFormat } from "@/types";
import { formatSRTTime, formatVTTTime } from "./caption-utils";

export function generateSRT(captions: Caption[]): string {
  return captions
    .map((c, i) => {
      return `${i + 1}\n${formatSRTTime(c.start)} --> ${formatSRTTime(c.end)}\n${c.text}\n`;
    })
    .join("\n");
}

export function generateVTT(captions: Caption[]): string {
  const lines = ["WEBVTT", ""];
  for (const c of captions) {
    lines.push(`${formatVTTTime(c.start)} --> ${formatVTTTime(c.end)}`);
    lines.push(c.text);
    lines.push("");
  }
  return lines.join("\n");
}

function hexColorToASSColor(hex: string, alpha = "00"): string {
  // ASS color format: &HAABBGGRR
  const clean = hex.replace("#", "");
  if (clean.length === 6) {
    const r = clean.substring(0, 2);
    const g = clean.substring(2, 4);
    const b = clean.substring(4, 6);
    return `&H${alpha}${b}${g}${r}`.toUpperCase();
  }
  return "&H00FFFFFF";
}

function toASSTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

export function generateASS(
  captions: Caption[],
  template: CaptionTemplate
): string {
  const fontName = (() => {
    const ff = template.textStyle.fontFamily ?? "Arial";
    return ff.replace(/,.*$/, "").replace(/'/g, "").trim();
  })();

  const fontSize = Math.round(
    parseFloat(String(template.textStyle.fontSize ?? "22")) * 1.5
  );

  const color = (() => {
    const c = String(template.textStyle.color ?? "#FFFFFF");
    return hexColorToASSColor(c);
  })();

  const alignment = (() => {
    switch (template.position) {
      case "top":
        return 8;
      case "center":
        return 5;
      case "bottom":
      default:
        return 2;
    }
  })();

  const header = `[Script Info]
Title: CaptionGen Export
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${color},&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,1,${alignment},20,20,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const events = captions
    .map(
      (c) =>
        `Dialogue: 0,${toASSTime(c.start)},${toASSTime(c.end)},Default,,0,0,0,,${c.text}`
    )
    .join("\n");

  return `${header}\n${events}\n`;
}

export function generateTXT(captions: Caption[]): string {
  return captions
    .map((c) => {
      const startM = Math.floor(c.start / 60);
      const startS = Math.floor(c.start % 60);
      const endM = Math.floor(c.end / 60);
      const endS = Math.floor(c.end % 60);
      const start = `${startM}:${String(startS).padStart(2, "0")}`;
      const end = `${endM}:${String(endS).padStart(2, "0")}`;
      return `[${start} - ${end}] ${c.text}`;
    })
    .join("\n");
}

export function generateJSON(
  captions: Caption[],
  template: CaptionTemplate,
  language: string
): string {
  const data = {
    version: "1.0",
    generator: "CaptionGen",
    template: template.id,
    language,
    captions: captions.map((c) => ({
      start: c.start,
      end: c.end,
      text: c.text,
      words: c.words,
    })),
  };
  return JSON.stringify(data, null, 2);
}

export function generateExport(
  format: ExportFormat,
  captions: Caption[],
  template: CaptionTemplate,
  language: string
): string {
  switch (format) {
    case "srt":
      return generateSRT(captions);
    case "vtt":
      return generateVTT(captions);
    case "ass":
      return generateASS(captions, template);
    case "txt":
      return generateTXT(captions);
    case "json":
      return generateJSON(captions, template, language);
  }
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const FORMAT_INFO: Record<
  ExportFormat,
  { label: string; mime: string; ext: string }
> = {
  srt: { label: "SRT", mime: "text/plain", ext: "srt" },
  vtt: { label: "VTT", mime: "text/vtt", ext: "vtt" },
  ass: { label: "ASS", mime: "text/plain", ext: "ass" },
  txt: { label: "TXT", mime: "text/plain", ext: "txt" },
  json: { label: "JSON", mime: "application/json", ext: "json" },
};
