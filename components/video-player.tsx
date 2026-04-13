"use client";

import { useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  X,
} from "lucide-react";
import { useVideoPlayer } from "@/hooks/use-video-player";
import CaptionOverlay from "./caption-overlay";
import type { Caption, CaptionTemplate } from "@/types";
import { formatDisplayTime, findActiveCaption } from "@/lib/caption-utils";

interface VideoPlayerProps {
  videoUrl: string;
  captions: Caption[];
  selectedTemplate: CaptionTemplate;
  onRemove: () => void;
  onTimeUpdate?: (time: number) => void;
  captionScale?: number;
  captionPosition: { x: number; y: number } | null;
  onCaptionPositionChange: (pos: { x: number; y: number }) => void;
  onVideoReady?: (el: HTMLVideoElement) => void;
}

export default function VideoPlayer({
  videoUrl,
  captions,
  selectedTemplate,
  onRemove,
  onTimeUpdate,
  captionScale = 1,
  captionPosition,
  onCaptionPositionChange,
  onVideoReady,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [controlsVisible, setControlsVisible] = useState(false);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    currentTime,
    duration,
    isPlaying,
    volume,
    isMuted,
    isFullscreen,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    toggleFullscreen,
  } = useVideoPlayer(videoRef);

  const activeCaption = findActiveCaption(captions, currentTime);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      if (!videoRef.current?.paused) setControlsVisible(false);
    }, 2500);
  }, []);

  const handleVideoClick = useCallback(() => {
    togglePlay();
    showControls();
  }, [togglePlay, showControls]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      seek(val);
      onTimeUpdate?.(val);
    },
    [seek, onTimeUpdate]
  );

  const handleVolume = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setVolume(parseFloat(e.target.value));
    },
    [setVolume]
  );

  const seekPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden bg-black aspect-video group"
      data-video-container
      onMouseMove={showControls}
      onMouseEnter={showControls}
      onMouseLeave={() => {
        if (hideTimeout.current) clearTimeout(hideTimeout.current);
        if (isPlaying) setControlsVisible(false);
      }}
      onTouchStart={showControls}
    >
      {/* Remove button */}
      <button
        className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label="Remove video"
      >
        <X size={14} />
      </button>

      {/* Video element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        onClick={handleVideoClick}
        onLoadedMetadata={() => { if (videoRef.current) onVideoReady?.(videoRef.current); }}
        playsInline
        preload="metadata"
      />

      {/* Caption overlay — draggable + scalable */}
      <CaptionOverlay
        caption={activeCaption}
        template={selectedTemplate}
        currentTime={currentTime}
        customPosition={captionPosition}
        onPositionChange={onCaptionPositionChange}
        containerRef={containerRef}
        scale={captionScale}
      />

      {/* Controls bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
          controlsVisible || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
          paddingTop: "40px",
        }}
      >
        {/* Seekbar */}
        <div className="px-3 mb-2 relative">
          <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-indigo-500 rounded-full"
              style={{ width: `${seekPercent}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-5 -top-2"
            aria-label="Video seek"
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2 px-3 pb-3">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="w-9 h-9 flex items-center justify-center text-white hover:text-indigo-300 transition-colors"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          {/* Time */}
          <span className="text-white/80 text-xs font-mono tabular-nums shrink-0">
            {formatDisplayTime(currentTime)} / {formatDisplayTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Volume */}
          <button
            onClick={toggleMute}
            className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <div className="w-20 hidden sm:flex items-center">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolume}
              className="w-full h-1 cursor-pointer accent-white/70"
              aria-label="Volume"
              style={{ accentColor: "rgba(255,255,255,0.6)" }}
            />
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>

      {/* Center play icon when paused */}
      {!isPlaying && (
        <button
          className="absolute inset-0 flex items-center justify-center"
          onClick={handleVideoClick}
          aria-label="Play video"
        >
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all hover:scale-110">
            <Play size={28} className="text-white ml-1" />
          </div>
        </button>
      )}
    </div>
  );
}
