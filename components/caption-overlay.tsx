"use client";

import { useState, useCallback } from "react";
import type { Caption, CaptionTemplate } from "@/types";

interface CaptionOverlayProps {
  caption: Caption | null;
  template: CaptionTemplate;
  currentTime: number;
  customPosition: { x: number; y: number } | null;
  onPositionChange: (pos: { x: number; y: number }) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  scale?: number;
}

export default function CaptionOverlay({
  caption,
  template,
  currentTime,
  customPosition,
  onPositionChange,
  containerRef,
  scale = 1,
}: CaptionOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const posFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: clamp(((clientX - rect.left) / rect.width) * 100, 5, 95),
        y: clamp(((clientY - rect.top) / rect.height) * 100, 5, 95),
      };
    },
    [containerRef]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      const onMove = (ev: MouseEvent) => {
        const pos = posFromClient(ev.clientX, ev.clientY);
        if (pos) onPositionChange(pos);
      };
      const onUp = () => {
        setIsDragging(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [posFromClient, onPositionChange]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation();
      setIsDragging(true);

      const onMove = (ev: TouchEvent) => {
        const t = ev.touches[0];
        const pos = posFromClient(t.clientX, t.clientY);
        if (pos) onPositionChange(pos);
      };
      const onEnd = () => {
        setIsDragging(false);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      };
      window.addEventListener("touchmove", onMove, { passive: true });
      window.addEventListener("touchend", onEnd);
    },
    [posFromClient, onPositionChange]
  );

  // ── Position style ────────────────────────────────────────────────────────
  const wrapperStyle: React.CSSProperties = customPosition
    ? {
        position: "absolute",
        left: `${customPosition.x}%`,
        top: `${customPosition.y}%`,
        transform: "translate(-50%, -50%)",
        display: "flex",
        justifyContent: "center",
        zIndex: 10,
      }
    : (() => {
        const base: React.CSSProperties = {
          position: "absolute",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 10,
        };
        switch (template.position) {
          case "top":    return { ...base, top: "10%" };
          case "center": return { ...base, top: "50%", transform: "translateY(-50%)" };
          default:       return { ...base, bottom: "10%" };
        }
      })();

  const dragHandleStyle: React.CSSProperties = {
    cursor: isDragging ? "grabbing" : "grab",
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "none",
    borderRadius: "inherit",
    transform: `scale(${scale})`,
    transformOrigin: "center center",
    transition: isDragging ? "none" : "transform 0.1s ease",
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderContent = () => {
    if (!caption) return null;

    // Multi-word karaoke: all words visible, active one highlighted
    if (template.wordByWord && caption.words.length > 0) {
      return (
        <div style={{ ...template.containerStyle, maxWidth: "92%" }}>
          {caption.words.map((word, i) => {
            const nextStart = caption.words[i + 1]?.start ?? caption.end;
            const isActive = currentTime >= word.start && currentTime < nextStart;
            const wordStyle: React.CSSProperties = isActive
              ? { ...template.textStyle, ...(template.activeWordStyle ?? {}) }
              : { ...template.textStyle, ...(template.inactiveWordStyle ?? {}) };
            return (
              <span
                key={isActive ? `a-${i}` : `i-${i}`}
                className={isActive ? (template.animationClass ?? "") : ""}
                style={wordStyle}
              >
                {word.word}{" "}
              </span>
            );
          })}
        </div>
      );
    }

    // Sentence mode
    return (
      <div style={{ ...template.containerStyle, maxWidth: "92%" }}>
        <span style={template.textStyle}>{caption.text}</span>
      </div>
    );
  };

  const content = renderContent();

  // Always render the draggable wrapper so user can reposition even between captions
  // When no caption is active, show nothing but keep the drag area alive if position is set
  if (!content && !customPosition) return null;

  return (
    <div style={{ ...wrapperStyle, pointerEvents: "none" }}>
      {/* Drag wrapper — pointer-events only on the caption bubble itself */}
      <div
        style={{ ...dragHandleStyle, pointerEvents: "auto" }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        title="Drag to reposition"
      >
        {content}

        {/* Drag hint dot — always visible so user knows it's draggable */}
        <div
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            color: "#000",
            boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
            opacity: isDragging ? 1 : 0.6,
            transition: "opacity 0.2s",
            pointerEvents: "none",
          }}
        >
          ⠿
        </div>
      </div>
    </div>
  );
}
