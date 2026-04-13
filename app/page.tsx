"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Wand2, Layers, Pencil, Download, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/app-header";
import VideoUpload from "@/components/video-upload";
import VideoPlayer from "@/components/video-player";
import TemplateSelector from "@/components/template-selector";
import CaptionEditor from "@/components/caption-editor";
import ExportPanel from "@/components/export-panel";
import ProcessingOverlay from "@/components/processing-overlay";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useCaptions } from "@/hooks/use-captions";
import { extractAudio } from "@/lib/audio-extractor";
import { transcribeAudio } from "@/lib/transcription";
import { parseTranscriptionToCaption } from "@/lib/caption-utils";
import type { ProcessingStep } from "@/types";
import {
  LOCAL_STORAGE_KEYS,
  DEFAULT_MAX_WORDS_PER_SEGMENT,
  DEFAULT_MAX_SEGMENT_DURATION,
} from "@/lib/constants";

type ActivePanel = "templates" | "editor" | "export";

const INITIAL_STEPS: ProcessingStep[] = [
  { id: "extract", label: "Extracting audio from video", status: "pending" },
  { id: "compress", label: "Compressing to 16kHz WAV", status: "pending" },
  { id: "upload", label: "Uploading to Whisper AI", status: "pending" },
  { id: "transcribe", label: "Transcribing speech", status: "pending" },
  { id: "build", label: "Building caption segments", status: "pending" },
];

export default function Home() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>("templates");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>(INITIAL_STEPS);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [captionScale, setCaptionScale] = useState(1);

  const abortControllerRef = useRef<AbortController | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const [captionPosition, setCaptionPosition] = useState<{ x: number; y: number } | null>(null);

  // Persisted settings
  const [apiKey, setApiKey] = useLocalStorage(LOCAL_STORAGE_KEYS.API_KEY, "");
  const [maxWordsPerSegment, setMaxWordsPerSegment] = useLocalStorage(
    LOCAL_STORAGE_KEYS.MAX_WORDS,
    DEFAULT_MAX_WORDS_PER_SEGMENT
  );
  const [maxSegmentDuration, setMaxSegmentDuration] = useLocalStorage(
    LOCAL_STORAGE_KEYS.MAX_DURATION,
    DEFAULT_MAX_SEGMENT_DURATION
  );

  const {
    captions,
    setCaptions,
    updateCaption,
    deleteCaption,
    mergeCaptions,
    splitCaption,
    resetCaptions,
    selectedTemplate,
    setTemplate,
    editingId,
    setEditingId,
  } = useCaptions();

  // Clean up object URL on unmount / video change
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (e.key === "Escape" && editingId) {
        setEditingId(null);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (captions.length > 0) {
          import("@/lib/export-formats").then(({ generateExport, downloadFile }) => {
            const content = generateExport("srt", captions, selectedTemplate, "en");
            downloadFile(content, "captions.srt", "text/plain");
            toast.success("Exported captions.srt");
          });
        }
      }

      if (!isInput && e.key === "Escape") {
        setEditingId(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [editingId, setEditingId, captions, selectedTemplate]);

  const handleFileSelected = useCallback(
    (file: File) => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      const url = URL.createObjectURL(file);
      setVideoFile(file);
      setVideoUrl(url);
    },
    [videoUrl]
  );

  const handleRemoveVideo = useCallback(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoFile(null);
    setVideoUrl(null);
    setCaptions([]);
    setActivePanel("templates");
  }, [videoUrl, setCaptions]);

  const updateStep = useCallback(
    (id: string, status: ProcessingStep["status"]) => {
      setProcessingSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s))
      );
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    if (!videoFile) {
      toast.error("Please upload a video first.");
      return;
    }

    const activeKey = apiKey.trim();
    if (!activeKey) {
      toast.error("Add your Groq API key in Settings (gear icon top-right).");
      return;
    }

    // Check audio context support
    if (typeof window === "undefined" || (!window.AudioContext && !(window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)) {
      toast.error("Web Audio API not supported. Please use Chrome, Firefox, or Safari.");
      return;
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsProcessing(true);
    setProcessingSteps(INITIAL_STEPS);
    setProcessingProgress(0);

    try {
      // Step 1: Extract audio
      updateStep("extract", "active");
      updateStep("compress", "active");
      setProcessingProgress(10);

      let audioBlob: Blob;
      try {
        audioBlob = await extractAudio(
          videoFile,
          (_step, progress) => {
            setProcessingProgress(10 + progress * 0.35);
          },
          signal
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") throw err;
        const msg = err instanceof Error ? err.message : "Audio extraction failed";
        toast.error(msg);
        updateStep("extract", "error");
        updateStep("compress", "error");
        setIsProcessing(false);
        return;
      }

      updateStep("extract", "done");
      updateStep("compress", "done");
      setProcessingProgress(45);

      if (signal.aborted) throw new DOMException("Aborted", "AbortError");

      // Step 3: Upload
      updateStep("upload", "active");
      setProcessingProgress(50);

      // Step 4: Transcribe
      updateStep("transcribe", "active");

      let result;
      try {
        result = await transcribeAudio(
          audioBlob,
          activeKey,
          signal
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") throw err;
        const msg = err instanceof Error ? err.message : "Transcription failed";

        updateStep("upload", "error");
        updateStep("transcribe", "error");

        if (msg.includes("401") || msg.includes("No API key") || msg.includes("Unauthorized")) {
          toast.error("Invalid API key. Check your Groq API key in Settings.");
        } else if (msg.includes("429") || msg.includes("rate")) {
          toast.error("Rate limited by Groq. Please wait a moment and try again.");
        } else if (msg.includes("413") || msg.includes("too large")) {
          toast.error("Audio file too large. Try a shorter video (under 2 minutes).");
        } else if (msg.includes("NetworkError") || msg.includes("fetch")) {
          toast.error("Network error. Check your internet connection.");
        } else {
          toast.error(`Transcription failed: ${msg}`);
        }
        setIsProcessing(false);
        return;
      }

      updateStep("upload", "done");
      updateStep("transcribe", "done");
      setProcessingProgress(85);

      // Step 5: Build captions
      updateStep("build", "active");

      const segments = result.segments ?? [];
      if (segments.length === 0 && !result.text?.trim()) {
        toast.error("No speech detected. Try a video with clear speech.");
        updateStep("build", "error");
        setIsProcessing(false);
        return;
      }

      const parsed = parseTranscriptionToCaption(
        segments,
        maxWordsPerSegment,
        maxSegmentDuration
      );

      if (parsed.length === 0) {
        toast.error("Could not parse captions. The video may have no detectable speech.");
        updateStep("build", "error");
        setIsProcessing(false);
        return;
      }

      setCaptions(parsed);
      updateStep("build", "done");
      setProcessingProgress(100);

      setIsProcessing(false);
      toast.success(`${parsed.length} captions generated successfully!`);
      setActivePanel("templates");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        toast.info("Caption generation cancelled.");
      } else {
        toast.error("An unexpected error occurred.");
      }
      setIsProcessing(false);
    }
  }, [
    videoFile,
    apiKey,
    maxWordsPerSegment,
    maxSegmentDuration,
    setCaptions,
    updateStep,
  ]);

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsProcessing(false);
  }, []);

  const handleUpdateCaption = useCallback(
    (id: string, text: string) => {
      updateCaption(id, { text });
      setEditingId(null);
    },
    [updateCaption, setEditingId]
  );

  const handleUpdateTime = useCallback(
    (id: string, start: number, end: number) => {
      updateCaption(id, { start, end });
    },
    [updateCaption]
  );

  const hasCaptions = captions.length > 0;

  return (
    <>
      <AppHeader
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        maxWordsPerSegment={maxWordsPerSegment}
        onMaxWordsChange={setMaxWordsPerSegment}
        maxSegmentDuration={maxSegmentDuration}
        onMaxDurationChange={setMaxSegmentDuration}
      />

      <main className="pt-14 min-h-screen bg-[#09090b]">
        {!videoUrl ? (
          <VideoUpload onFileSelected={handleFileSelected} />
        ) : (
          <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 animate-slide-up">
            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-4 flex-wrap bg-[#131316] border border-[#2E2E38] rounded-xl px-4 py-2.5">
              {/* Generate button */}
              <Button
                onClick={handleGenerate}
                disabled={isProcessing}
                className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold h-9 px-4 text-sm shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-100"
              >
                <Wand2 size={15} className="mr-2" />
                {hasCaptions ? "Re-generate" : "Generate Captions"}
              </Button>

              <div className="w-px h-5 bg-[#2E2E38] mx-1 hidden sm:block" />

              {/* Panel tabs */}
              {(
                [
                  { id: "templates", label: "Templates", icon: Layers },
                  { id: "editor", label: "Editor", icon: Pencil },
                  { id: "export", label: "Export", icon: Download },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActivePanel(id)}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium transition-all
                    ${
                      activePanel === id
                        ? "bg-[#27272A] text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-[#1C1C22]"
                    }
                  `}
                >
                  <Icon size={14} />
                  {label}
                  {id === "editor" && hasCaptions && (
                    <span className="ml-1 text-[10px] bg-indigo-500/20 text-indigo-400 px-1 rounded">
                      {captions.length}
                    </span>
                  )}
                </button>
              ))}

              {/* Caption size slider */}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-zinc-500 text-xs font-bold select-none">A</span>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={captionScale}
                  onChange={(e) => setCaptionScale(parseFloat(e.target.value))}
                  className="w-20 h-1 cursor-pointer"
                  title={`Caption size: ${Math.round(captionScale * 100)}%`}
                />
                <span className="text-zinc-300 text-sm font-bold select-none">A</span>
              </div>

              {!apiKey && (
                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                  <Settings size={13} />
                  <span className="hidden sm:inline">Add API key in Settings</span>
                </div>
              )}
            </div>

            {/* Video player */}
            <div className="mb-4">
              <VideoPlayer
                videoUrl={videoUrl}
                captions={captions}
                selectedTemplate={selectedTemplate}
                onRemove={handleRemoveVideo}
                onTimeUpdate={setCurrentTime}
                captionScale={captionScale}
                captionPosition={captionPosition}
                onCaptionPositionChange={setCaptionPosition}
                onVideoReady={(el) => { videoElRef.current = el; }}
              />
            </div>

            {/* Active panel */}
            <div
              key={activePanel}
              className="bg-[#1C1C22] border border-[#2E2E38] rounded-xl p-4 md:p-6 animate-slide-up"
            >
              {activePanel === "templates" && (
                <TemplateSelector
                  selectedTemplate={selectedTemplate}
                  onTemplateSelect={setTemplate}
                />
              )}

              {activePanel === "editor" && (
                <CaptionEditor
                  captions={captions}
                  currentTime={currentTime}
                  editingId={editingId}
                  onEditStart={setEditingId}
                  onEditEnd={() => setEditingId(null)}
                  onUpdate={handleUpdateCaption}
                  onDelete={deleteCaption}
                  onSplit={splitCaption}
                  onMerge={mergeCaptions}
                  onReset={resetCaptions}
                  onSeek={setCurrentTime}
                  onUpdateTime={handleUpdateTime}
                />
              )}

              {activePanel === "export" && (
                <ExportPanel
                  captions={captions}
                  selectedTemplate={selectedTemplate}
                  language="en"
                  videoElRef={videoElRef}
                  captionScale={captionScale}
                  captionPosition={captionPosition}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {isProcessing && (
        <ProcessingOverlay
          steps={processingSteps}
          onCancel={handleCancel}
          progress={processingProgress}
        />
      )}
    </>
  );
}
