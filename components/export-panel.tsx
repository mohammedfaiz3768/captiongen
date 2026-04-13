"use client";

import { useState, useRef } from "react";
import {
  FileText,
  Globe,
  Palette,
  AlignLeft,
  Code,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Film,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Caption, CaptionTemplate, ExportFormat } from "@/types";
import {
  generateExport,
  downloadFile,
  FORMAT_INFO,
} from "@/lib/export-formats";
import {
  exportVideoWithCaptions,
  canExportMP4,
  EXPORT_RESOLUTIONS,
  type ExportResolution,
  type ExportFPS,
} from "@/lib/video-exporter";

interface ExportPanelProps {
  captions: Caption[];
  selectedTemplate: CaptionTemplate;
  language: string;
  videoElRef?: React.RefObject<HTMLVideoElement | null>;
  captionScale?: number;
  captionPosition?: { x: number; y: number } | null;
}

const FORMAT_CARDS: {
  format: ExportFormat;
  icon: React.ElementType;
  label: string;
  desc: string;
}[] = [
  { format: "srt",  icon: FileText, label: "SRT",  desc: "SubRip — Universal compatibility" },
  { format: "vtt",  icon: Globe,    label: "VTT",  desc: "WebVTT — Web standard" },
  { format: "ass",  icon: Palette,  label: "ASS",  desc: "Advanced SubStation — includes styling" },
  { format: "txt",  icon: AlignLeft,label: "TXT",  desc: "Plain text — Just the words" },
  { format: "json", icon: Code,     label: "JSON", desc: "Structured data — For developers" },
];

const RESOLUTION_OPTIONS: { value: ExportResolution; label: string; sub: string }[] = [
  { value: "1080p", label: "1080p", sub: "Full HD · 12 Mbps" },
  { value: "1440p", label: "1440p", sub: "2K · 24 Mbps" },
  { value: "4k",    label: "4K",    sub: "Ultra HD · 80 Mbps" },
];

export default function ExportPanel({
  captions,
  selectedTemplate,
  language,
  videoElRef,
  captionScale = 1,
  captionPosition = null,
}: ExportPanelProps) {
  const [previewFormat, setPreviewFormat] = useState<ExportFormat>("srt");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Video export state
  const [resolution, setResolution] = useState<ExportResolution>("4k");
  const [fps, setFps] = useState<ExportFPS>(60);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const handleDownload = (format: ExportFormat) => {
    if (captions.length === 0) {
      toast.error("No captions to export. Generate captions first.");
      return;
    }
    const content = generateExport(format, captions, selectedTemplate, language);
    const info = FORMAT_INFO[format];
    downloadFile(content, `captions.${info.ext}`, info.mime);
    toast.success(`Downloaded captions.${info.ext}`);
  };

  const handleCopyAll = async () => {
    if (captions.length === 0) {
      toast.error("No captions to copy.");
      return;
    }
    const text = captions.map((c) => c.text).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Transcript copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVideoExport = async () => {
    const videoEl = videoElRef?.current;
    if (!videoEl) {
      toast.error("No video loaded.");
      return;
    }
    if (captions.length === 0) {
      toast.error("No captions to burn in. Generate captions first.");
      return;
    }

    abortRef.current = new AbortController();
    setIsExporting(true);
    setExportProgress(0);

    try {
      const { blob, ext } = await exportVideoWithCaptions(
        videoEl,
        captions,
        selectedTemplate,
        captionScale,
        captionPosition ?? null,
        resolution,
        fps,
        (pct) => setExportProgress(pct),
        abortRef.current.signal
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `captions-${resolution}-${fps}fps.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Video exported as .${ext} — ${EXPORT_RESOLUTIONS[resolution].label} ${fps}fps`);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.info("Export cancelled.");
      } else {
        const msg = err instanceof Error ? err.message : "Export failed";
        toast.error(`Export failed: ${msg}`);
      }
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleCancelExport = () => {
    abortRef.current?.abort();
  };

  const previewContent = captions.length > 0
    ? generateExport(previewFormat, captions.slice(0, 5), selectedTemplate, language)
    : "";

  if (captions.length === 0) {
    return (
      <section aria-label="Export panel" className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#27272A] flex items-center justify-center mb-3">
          <FileText size={22} className="text-zinc-600" />
        </div>
        <p className="text-sm font-medium text-zinc-400">No captions to export</p>
        <p className="text-xs text-zinc-600 mt-1">Generate captions first</p>
      </section>
    );
  }

  return (
    <section aria-label="Export panel" className="space-y-6">

      {/* ── Video Export ───────────────────────────────────────────── */}
      <div className="border border-[#2E2E38] rounded-xl p-4 bg-[#131316]">
        <div className="flex items-center gap-2 mb-4">
          <Film size={16} className="text-indigo-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Export Video with Captions</h2>
          <span className="ml-auto text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-medium">
            {canExportMP4() ? "MP4" : "WEBM"}
          </span>
        </div>

        {/* Resolution picker */}
        <div className="mb-3">
          <p className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wide">Resolution</p>
          <div className="flex gap-2">
            {RESOLUTION_OPTIONS.map(({ value, label, sub }) => (
              <button
                key={value}
                onClick={() => setResolution(value)}
                disabled={isExporting}
                className={`flex-1 flex flex-col items-center py-2.5 rounded-lg border text-center transition-all
                  ${resolution === value
                    ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-300"
                    : "border-[#2E2E38] bg-[#1C1C22] text-zinc-400 hover:border-[#3F3F50] hover:text-zinc-200"}
                  ${isExporting ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <span className="text-sm font-bold">{label}</span>
                <span className="text-[10px] mt-0.5 opacity-70">{sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* FPS toggle */}
        <div className="mb-4">
          <p className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wide">Frame Rate</p>
          <div className="flex gap-2">
            {([30, 60] as ExportFPS[]).map((f) => (
              <button
                key={f}
                onClick={() => setFps(f)}
                disabled={isExporting}
                className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-all
                  ${fps === f
                    ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-300"
                    : "border-[#2E2E38] bg-[#1C1C22] text-zinc-400 hover:border-[#3F3F50] hover:text-zinc-200"}
                  ${isExporting ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                {f} fps
              </button>
            ))}
          </div>
        </div>

        {/* Export button / progress */}
        {isExporting ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Exporting… {Math.round(exportProgress)}%</span>
              <button
                onClick={handleCancelExport}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
              >
                <X size={12} /> Cancel
              </button>
            </div>
            <div className="h-2 bg-[#27272A] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-600">
              Video is playing in background — do not close this tab
            </p>
          </div>
        ) : (
          <Button
            onClick={handleVideoExport}
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold h-10 shadow-lg shadow-indigo-500/20"
          >
            <Film size={15} className="mr-2" />
            Export {EXPORT_RESOLUTIONS[resolution].label} · {fps}fps · {canExportMP4() ? "MP4" : "WebM"}
          </Button>
        )}

        <p className="text-[10px] text-zinc-600 mt-2">
          {canExportMP4()
            ? "Captions burned in as H.264 MP4 — plays everywhere."
            : "WebM fallback (Chrome/Firefox). For MP4, use Chrome 94+."}
        </p>
      </div>

      {/* ── Caption File Export ────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-200">Export Caption File</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
            className="h-7 text-xs border-[#3F3F50] bg-transparent text-zinc-400 hover:bg-[#27272A] hover:text-zinc-200"
          >
            {copied ? (
              <Check size={12} className="mr-1 text-green-400" />
            ) : (
              <Copy size={12} className="mr-1" />
            )}
            Copy all text
          </Button>
        </div>

        {/* Format cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mb-5">
          {FORMAT_CARDS.map(({ format, icon: Icon, label, desc }) => (
            <button
              key={format}
              onClick={() => {
                handleDownload(format);
                setPreviewFormat(format);
              }}
              className={`group flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-150 text-center hover:-translate-y-0.5 active:translate-y-0
                ${
                  previewFormat === format
                    ? "border-indigo-500/50 bg-indigo-500/5"
                    : "border-[#2E2E38] bg-[#1C1C22] hover:border-[#3F3F50]"
                }
              `}
              aria-label={`Download ${label} file`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                ${
                  previewFormat === format
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "bg-[#27272A] text-zinc-500 group-hover:text-zinc-300"
                }
              `}
              >
                <Icon size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-200">{label}</p>
                <p className="text-[10px] text-zinc-600 leading-tight mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Preview toggle */}
        <button
          onClick={() => setPreviewOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-2"
        >
          {previewOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Preview (first 5 captions)
          <span className="text-zinc-700">— {FORMAT_INFO[previewFormat].label}</span>
        </button>

        {previewOpen && (
          <pre className="text-[11px] font-mono text-zinc-400 bg-[#0D0D14] border border-[#2E2E38] rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap">
            {previewContent || "No preview available"}
          </pre>
        )}

        <p className="text-xs text-zinc-600 mt-4">
          Import SRT/VTT into CapCut, Premiere Pro, DaVinci Resolve, or any video editor
        </p>
      </div>
    </section>
  );
}
