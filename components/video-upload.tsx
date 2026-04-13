"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, Zap, Globe, Layers, Download } from "lucide-react";
import { toast } from "sonner";
import { MAX_FILE_SIZE, ACCEPTED_VIDEO_TYPES } from "@/lib/constants";

interface VideoUploadProps {
  onFileSelected: (file: File) => void;
}

const FEATURES = [
  {
    icon: Zap,
    title: "AI Transcription",
    desc: "Powered by Groq Whisper — fast, accurate speech-to-text in seconds",
  },
  {
    icon: Globe,
    title: "Hinglish & 12 Languages",
    desc: "Hindi, Urdu, Tamil, Telugu, Bengali, Marathi, and more",
  },
  {
    icon: Layers,
    title: "10 Caption Templates",
    desc: "Trending, minimal, bold & creative styles with word-sync animation",
  },
  {
    icon: Download,
    title: "Multi-format Export",
    desc: "SRT, VTT, ASS, TXT and JSON — import into any video editor",
  },
];

export default function VideoUpload({ onFileSelected }: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("video/") && !ACCEPTED_VIDEO_TYPES.includes(file.type)) {
        toast.error("Invalid file type. Please upload a video file (MP4, WebM, MOV).");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File is too large. Maximum size is 500MB.");
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-4 py-8 animate-fade-in">
      {/* Upload zone */}
      <div className="w-full max-w-2xl mb-8">
        <div
          className={`upload-zone relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer
            ${
              isDragging
                ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
                : "border-[#2E2E38] hover:border-[#3F3F50] bg-[#18181B] hover:bg-[#1C1C22]"
            }
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload video file"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
        >
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div
              className={`w-20 h-20 rounded-2xl mb-6 flex items-center justify-center transition-all duration-200 ${
                isDragging
                  ? "bg-indigo-500/20"
                  : "bg-[#27272A]"
              }`}
            >
              <Upload
                size={36}
                className={`transition-all duration-200 ${
                  isDragging
                    ? "text-indigo-400 animate-bounce-slow"
                    : "text-zinc-500"
                }`}
              />
            </div>
            <h2 className="text-xl font-bold text-zinc-100 mb-2">
              Drop your video or click to browse
            </h2>
            <p className="text-sm text-zinc-500 mb-1">
              MP4, WebM, MOV &bull; Up to 500MB
            </p>
            <p className="text-xs text-zinc-600">
              1–2 minutes recommended for best results
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleInputChange}
          aria-label="Video file input"
        />
      </div>

      {/* Feature cards */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="bg-[#1C1C22] border border-[#2E2E38] rounded-xl p-4 hover:border-[#3F3F50] transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={18} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-200 mb-0.5">
                  {title}
                </p>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
