"use client";

import type { CaptionTemplate } from "@/types";
import { Badge } from "@/components/ui/badge";

interface TemplatePreviewProps {
  template: CaptionTemplate;
  isSelected: boolean;
  onClick: () => void;
}

const PREVIEW_WORDS = ["sab", "bolte", "hai", "bhai"];
const ACTIVE_INDEX = 1; // "bolte" is highlighted in preview

export default function TemplatePreview({
  template,
  isSelected,
  onClick,
}: TemplatePreviewProps) {
  return (
    <button
      onClick={onClick}
      className={`group w-full text-left rounded-xl border transition-all duration-200 overflow-hidden
        ${
          isSelected
            ? "ring-2 ring-indigo-500 border-indigo-500/50 bg-indigo-500/5"
            : "border-[#2E2E38] bg-[#1C1C22] hover:border-[#3F3F50] hover:-translate-y-0.5"
        }
      `}
      aria-pressed={isSelected}
      aria-label={`Select ${template.name} template`}
    >
      {/* Preview area */}
      <div className="relative w-full bg-[#0D0D14] overflow-hidden" style={{ aspectRatio: "16/9" }}>
        {/* Fake video background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] opacity-80" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-x-0 top-1/4 h-px bg-white/10" />
          <div className="absolute inset-x-0 top-2/4 h-px bg-white/10" />
          <div className="absolute inset-x-0 top-3/4 h-px bg-white/10" />
        </div>

        {/* Caption preview */}
        <div
          className="absolute inset-0 flex"
          style={{
            alignItems:
              template.position === "top"
                ? "flex-start"
                : template.position === "center"
                ? "center"
                : "flex-end",
            justifyContent: "center",
            padding:
              template.position === "top"
                ? "8% 8% 0"
                : template.position === "bottom"
                ? "0 8% 10%"
                : "8%",
          }}
        >
          {template.wordByWord ? (
            <div
              style={{
                ...template.containerStyle,
                transform: "scale(0.5)",
                transformOrigin:
                  template.position === "top"
                    ? "top center"
                    : template.position === "bottom"
                    ? "bottom center"
                    : "center center",
                maxWidth: "200%",
              }}
            >
              {PREVIEW_WORDS.map((word, i) => {
                const isActive = i === ACTIVE_INDEX;
                const wordStyle = isActive
                  ? { ...template.textStyle, ...(template.activeWordStyle ?? {}) }
                  : { ...template.textStyle, ...(template.inactiveWordStyle ?? {}) };
                return (
                  <span key={i} style={wordStyle}>
                    {word}{" "}
                  </span>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                ...template.containerStyle,
                transform: "scale(0.55)",
                transformOrigin:
                  template.position === "top"
                    ? "top center"
                    : template.position === "bottom"
                    ? "bottom center"
                    : "center center",
                maxWidth: "180%",
              }}
            >
              <span style={template.textStyle}>sab bolte hai bhai</span>
            </div>
          )}
        </div>
      </div>

      {/* Card info */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-zinc-200">
            {template.icon} {template.name}
          </span>
          {template.wordByWord && (
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5 border-indigo-500/40 text-indigo-400 bg-indigo-500/5"
            >
              Word sync
            </Badge>
          )}
        </div>
        <p className="text-xs text-zinc-500 leading-snug">
          {template.description}
        </p>
      </div>
    </button>
  );
}
