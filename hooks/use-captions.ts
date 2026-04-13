"use client";

import { useState, useCallback, useRef } from "react";
import type { Caption, CaptionTemplate } from "@/types";
import {
  mergeCaptions as mergeCaptionsUtil,
  splitCaption as splitCaptionUtil,
  reindexCaptions,
  generateId,
} from "@/lib/caption-utils";
import { CAPTION_TEMPLATES } from "@/lib/templates";
import { DEFAULT_TEMPLATE_ID } from "@/lib/constants";

export function useCaptions() {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CaptionTemplate>(
    CAPTION_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID) ??
      CAPTION_TEMPLATES[0]
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const originalCaptionsRef = useRef<Caption[]>([]);

  const setOriginalCaptions = useCallback((caps: Caption[]) => {
    originalCaptionsRef.current = caps;
    setCaptions(caps);
  }, []);

  const updateCaption = useCallback(
    (id: string, updates: Partial<Pick<Caption, "text" | "start" | "end">>) => {
      setCaptions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
    },
    []
  );

  const deleteCaption = useCallback((id: string) => {
    setCaptions((prev) =>
      reindexCaptions(prev.filter((c) => c.id !== id))
    );
  }, []);

  const mergeCaptions = useCallback((index1: number, index2: number) => {
    setCaptions((prev) => mergeCaptionsUtil(prev, index1, index2));
  }, []);

  const splitCaption = useCallback(
    (captionId: string, splitTime: number) => {
      setCaptions((prev) => splitCaptionUtil(prev, captionId, splitTime));
    },
    []
  );

  const addCaption = useCallback(
    (afterId: string | null, start: number, end: number) => {
      setCaptions((prev) => {
        const newCaption: Caption = {
          id: generateId(),
          index: 0,
          start,
          end,
          text: "New caption",
          words: [],
        };
        if (afterId === null) {
          return reindexCaptions([...prev, newCaption]);
        }
        const idx = prev.findIndex((c) => c.id === afterId);
        const result = [...prev];
        result.splice(idx + 1, 0, newCaption);
        return reindexCaptions(result);
      });
    },
    []
  );

  const resetCaptions = useCallback(() => {
    setCaptions(originalCaptionsRef.current);
  }, []);

  const setTemplate = useCallback((template: CaptionTemplate) => {
    setSelectedTemplate(template);
  }, []);

  return {
    captions,
    setCaptions: setOriginalCaptions,
    updateCaption,
    deleteCaption,
    mergeCaptions,
    splitCaption,
    addCaption,
    resetCaptions,
    selectedTemplate,
    setTemplate,
    editingId,
    setEditingId,
  };
}
