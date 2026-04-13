"use client";

import { useState, useRef, useCallback } from "react";
import { Pencil, Trash2, Scissors, Check, X } from "lucide-react";
import type { Caption } from "@/types";
import { formatTime } from "@/lib/caption-utils";

interface CaptionRowProps {
  caption: Caption;
  isActive: boolean;
  isEditing: boolean;
  onEdit: (id: string) => void;
  onSave: (id: string, text: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onSplit: (id: string) => void;
  onSeek: (time: number) => void;
  onUpdateTime: (id: string, start: number, end: number) => void;
}

export default function CaptionRow({
  caption,
  isActive,
  isEditing,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
  onSplit,
  onSeek,
  onUpdateTime,
}: CaptionRowProps) {
  const [editText, setEditText] = useState(caption.text);
  const [editStart, setEditStart] = useState(false);
  const [editEnd, setEditEnd] = useState(false);
  const [startVal, setStartVal] = useState(formatTime(caption.start));
  const [endVal, setEndVal] = useState(formatTime(caption.end));
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleEditClick = useCallback(() => {
    setEditText(caption.text);
    onEdit(caption.id);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [caption.id, caption.text, onEdit]);

  const handleSave = useCallback(() => {
    onSave(caption.id, editText.trim() || caption.text);
  }, [caption.id, caption.text, editText, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        onCancelEdit();
      }
    },
    [handleSave, onCancelEdit]
  );

  const parseTime = (val: string): number => {
    const parts = val.split(":").flatMap((p) => p.split("."));
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseFloat(`${parts[1]}`);
    }
    if (parts.length >= 3) {
      return (
        parseInt(parts[0]) * 3600 +
        parseInt(parts[1]) * 60 +
        parseFloat(`${parts[2]}`)
      );
    }
    return caption.start;
  };

  const handleStartSave = () => {
    const t = parseTime(startVal);
    if (!isNaN(t) && t >= 0) onUpdateTime(caption.id, t, caption.end);
    setEditStart(false);
  };

  const handleEndSave = () => {
    const t = parseTime(endVal);
    if (!isNaN(t) && t > caption.start) onUpdateTime(caption.id, caption.start, t);
    setEditEnd(false);
  };

  return (
    <article
      className={`group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
        isActive
          ? "bg-indigo-500/5 border-l-2 border-l-indigo-500 pl-2.5"
          : "border-l-2 border-l-transparent hover:bg-[#27272A]/50"
      }`}
    >
      {/* Index */}
      <span className="text-xs text-zinc-600 font-mono w-5 shrink-0 mt-1 text-right">
        {caption.index}
      </span>

      {/* Times */}
      <div className="flex items-center gap-1 shrink-0 mt-0.5">
        {editStart ? (
          <input
            value={startVal}
            onChange={(e) => setStartVal(e.target.value)}
            onBlur={handleStartSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleStartSave();
              if (e.key === "Escape") setEditStart(false);
            }}
            className="w-16 text-[10px] font-mono bg-[#27272A] border border-[#3F3F50] rounded px-1 py-0.5 text-zinc-200 outline-none focus:border-indigo-500"
            autoFocus
          />
        ) : (
          <button
            className="text-[10px] font-mono text-zinc-500 hover:text-indigo-400 transition-colors tabular-nums"
            onClick={() => {
              onSeek(caption.start);
              setEditStart(true);
              setStartVal(formatTime(caption.start));
            }}
            title="Click to edit start time"
          >
            {formatTime(caption.start)}
          </button>
        )}
        <span className="text-zinc-700 text-[10px]">→</span>
        {editEnd ? (
          <input
            value={endVal}
            onChange={(e) => setEndVal(e.target.value)}
            onBlur={handleEndSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEndSave();
              if (e.key === "Escape") setEditEnd(false);
            }}
            className="w-16 text-[10px] font-mono bg-[#27272A] border border-[#3F3F50] rounded px-1 py-0.5 text-zinc-200 outline-none focus:border-indigo-500"
            autoFocus
          />
        ) : (
          <button
            className="text-[10px] font-mono text-zinc-500 hover:text-indigo-400 transition-colors tabular-nums"
            onClick={() => {
              setEditEnd(true);
              setEndVal(formatTime(caption.end));
            }}
            title="Click to edit end time"
          >
            {formatTime(caption.end)}
          </button>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-1.5">
            <textarea
              ref={inputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="w-full text-sm bg-[#27272A] border border-indigo-500 rounded-md px-2 py-1 text-zinc-100 resize-none outline-none leading-snug"
            />
            <div className="flex gap-1">
              <button
                onClick={handleSave}
                className="flex items-center gap-0.5 text-[10px] text-green-400 hover:text-green-300 font-medium"
                aria-label="Save caption"
              >
                <Check size={11} /> Save
              </button>
              <span className="text-zinc-700 text-[10px]">·</span>
              <button
                onClick={onCancelEdit}
                className="flex items-center gap-0.5 text-[10px] text-zinc-500 hover:text-zinc-300"
                aria-label="Cancel edit"
              >
                <X size={11} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            className="text-sm text-zinc-200 leading-snug text-left w-full hover:text-zinc-50 transition-colors"
            onClick={handleEditClick}
            title="Click to edit"
          >
            {caption.text}
          </button>
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={handleEditClick}
            className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-200 rounded"
            aria-label="Edit caption"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onSplit(caption.id)}
            className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-amber-400 rounded"
            aria-label="Split caption at current time"
            title="Split at current playback time"
          >
            <Scissors size={12} />
          </button>
          <button
            onClick={() => onDelete(caption.id)}
            className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-red-400 rounded"
            aria-label="Delete caption"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </article>
  );
}
