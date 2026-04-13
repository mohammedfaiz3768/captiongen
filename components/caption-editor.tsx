"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Wand2, Merge, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Caption } from "@/types";
import { formatDisplayTime } from "@/lib/caption-utils";
import CaptionRow from "./caption-row";

interface CaptionEditorProps {
  captions: Caption[];
  currentTime: number;
  editingId: string | null;
  onEditStart: (id: string) => void;
  onEditEnd: () => void;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onSplit: (id: string, time: number) => void;
  onMerge: (index1: number, index2: number) => void;
  onReset: () => void;
  onSeek: (time: number) => void;
  onUpdateTime: (id: string, start: number, end: number) => void;
}

export default function CaptionEditor({
  captions,
  currentTime,
  editingId,
  onEditStart,
  onEditEnd,
  onUpdate,
  onDelete,
  onSplit,
  onMerge,
  onReset,
  onSeek,
  onUpdateTime,
}: CaptionEditorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const activeCaptionRef = useRef<HTMLDivElement>(null);

  const activeCaptionId = captions.find(
    (c) => currentTime >= c.start && currentTime <= c.end
  )?.id;

  // Auto-scroll active caption into view
  useEffect(() => {
    activeCaptionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [activeCaptionId]);

  const totalDuration =
    captions.length > 0
      ? captions[captions.length - 1].end
      : 0;

  const handleMergeSelected = useCallback(() => {
    if (selectedIds.length !== 2) return;
    const indices = selectedIds
      .map((id) => captions.findIndex((c) => c.id === id))
      .sort((a, b) => a - b);
    if (Math.abs(indices[0] - indices[1]) === 1) {
      onMerge(indices[0], indices[1]);
      setSelectedIds([]);
    }
  }, [selectedIds, captions, onMerge]);

  if (captions.length === 0) {
    return (
      <section
        aria-label="Caption editor"
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="w-12 h-12 rounded-xl bg-[#27272A] flex items-center justify-center mb-3">
          <Wand2 size={22} className="text-zinc-600" />
        </div>
        <p className="text-sm font-medium text-zinc-400">No captions yet</p>
        <p className="text-xs text-zinc-600 mt-1">
          Generate captions first using the Generate button
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Caption editor">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-200">
            Edit Captions
          </h2>
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-1.5 border-[#3F3F50] text-zinc-500"
          >
            {captions.length}
          </Badge>
          <span className="text-xs text-zinc-600">
            Total: {formatDisplayTime(totalDuration)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMergeSelected}
            disabled={selectedIds.length !== 2}
            className="h-7 text-xs border-[#3F3F50] bg-transparent text-zinc-400 hover:bg-[#27272A] hover:text-zinc-200 disabled:opacity-40"
          >
            <Merge size={12} className="mr-1" />
            Merge
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="h-7 text-xs border-[#3F3F50] bg-transparent text-zinc-400 hover:bg-[#27272A] hover:text-zinc-200"
          >
            <RotateCcw size={12} className="mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <p className="text-xs text-indigo-400 mb-2">
          {selectedIds.length} selected — select 2 adjacent captions to merge
        </p>
      )}

      {/* List */}
      <ScrollArea className="max-h-[45vh] pr-1">
        <div className="space-y-0.5">
          {captions.map((caption) => {
            const isActive = caption.id === activeCaptionId;
            return (
              <div
                key={caption.id}
                ref={isActive ? activeCaptionRef : undefined}
              >
                <CaptionRow
                  caption={caption}
                  isActive={isActive}
                  isEditing={editingId === caption.id}
                  onEdit={onEditStart}
                  onSave={onUpdate}
                  onCancelEdit={onEditEnd}
                  onDelete={onDelete}
                  onSplit={(id) => onSplit(id, currentTime)}
                  onSeek={onSeek}
                  onUpdateTime={onUpdateTime}
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </section>
  );
}
