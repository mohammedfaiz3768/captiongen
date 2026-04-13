import type { Caption, Word } from "@/types";
import { nanoid } from "nanoid";

export function generateId(): string {
  return nanoid();
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}

export function formatDisplayTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export function formatVTTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

export function findActiveCaption(
  captions: Caption[],
  time: number
): Caption | null {
  for (const caption of captions) {
    if (time >= caption.start && time <= caption.end) {
      return caption;
    }
  }
  return null;
}

export function mergeCaptions(
  captions: Caption[],
  index1: number,
  index2: number
): Caption[] {
  if (index1 === index2) return captions;
  const lo = Math.min(index1, index2);
  const hi = Math.max(index1, index2);
  const a = captions[lo];
  const b = captions[hi];
  if (!a || !b) return captions;

  const merged: Caption = {
    id: generateId(),
    index: a.index,
    start: a.start,
    end: b.end,
    text: `${a.text} ${b.text}`.trim(),
    words: [...a.words, ...b.words],
  };

  const result = [...captions];
  result.splice(lo, 2, merged);
  return reindexCaptions(result);
}

export function splitCaption(
  captions: Caption[],
  captionId: string,
  splitTime: number
): Caption[] {
  const idx = captions.findIndex((c) => c.id === captionId);
  if (idx === -1) return captions;

  const caption = captions[idx];
  if (splitTime <= caption.start || splitTime >= caption.end) return captions;

  const wordsA: Word[] = [];
  const wordsB: Word[] = [];

  for (const word of caption.words) {
    if (word.start < splitTime) {
      wordsA.push(word);
    } else {
      wordsB.push(word);
    }
  }

  const textA = wordsA.map((w) => w.word).join(" ").trim() || caption.text.substring(0, Math.floor(caption.text.length / 2));
  const textB = wordsB.map((w) => w.word).join(" ").trim() || caption.text.substring(Math.floor(caption.text.length / 2));

  const captionA: Caption = {
    id: generateId(),
    index: caption.index,
    start: caption.start,
    end: splitTime,
    text: textA,
    words: wordsA,
  };

  const captionB: Caption = {
    id: generateId(),
    index: caption.index + 1,
    start: splitTime,
    end: caption.end,
    text: textB,
    words: wordsB,
  };

  const result = [...captions];
  result.splice(idx, 1, captionA, captionB);
  return reindexCaptions(result);
}

export function reindexCaptions(captions: Caption[]): Caption[] {
  return captions.map((c, i) => ({ ...c, index: i + 1 }));
}

export function parseTranscriptionToCaption(
  segments: {
    start: number;
    end: number;
    text: string;
    words?: { word: string; start: number; end: number }[];
  }[],
  maxWords = 10,
  maxDuration = 5
): Caption[] {
  const captions: Caption[] = [];

  for (const seg of segments) {
    const words = seg.words ?? [];
    const segText = seg.text.trim();

    if (!segText) continue;

    if (words.length === 0) {
      // No word-level timestamps — approximate weighted by character length
      // (longer words take proportionally more time than short ones like "hai", "ka")
      const duration = seg.end - seg.start;
      const rawWords = segText.split(/\s+/).filter(Boolean);

      const approxWords: { word: string; start: number; end: number }[] = [];
      if (rawWords.length > 0 && duration > 0) {
        const totalChars = rawWords.reduce((s, w) => s + w.length, 0) || 1;
        let cursor = seg.start;
        for (const w of rawWords) {
          const wordDur = duration * (w.length / totalChars);
          approxWords.push({ word: w, start: cursor, end: cursor + wordDur });
          cursor += wordDur;
        }
      }

      if (duration <= maxDuration) {
        captions.push({
          id: generateId(),
          index: captions.length + 1,
          start: seg.start,
          end: seg.end,
          text: segText,
          words: approxWords,
        });
      } else {
        // Split long segments into chunks, preserving char-weighted timing
        const parts = splitTextIntoChunks(segText, maxWords);
        const totalChars = segText.replace(/\s+/g, "").length || 1;
        let cursor = seg.start;
        for (const part of parts) {
          const partChars = part.replace(/\s+/g, "").length;
          const partDuration = duration * (partChars / totalChars);
          const chunkStart = cursor;
          const chunkEnd = cursor + partDuration;
          cursor = chunkEnd;

          const chunkRawWords = part.split(/\s+/).filter(Boolean);
          const chunkTotalChars = chunkRawWords.reduce((s, w) => s + w.length, 0) || 1;
          let wordCursor = chunkStart;
          const chunkApproxWords = chunkRawWords.map((w) => {
            const wordDur = partDuration * (w.length / chunkTotalChars);
            const entry = { word: w, start: wordCursor, end: wordCursor + wordDur };
            wordCursor += wordDur;
            return entry;
          });
          captions.push({
            id: generateId(),
            index: captions.length + 1,
            start: chunkStart,
            end: chunkEnd,
            text: part,
            words: chunkApproxWords,
          });
        }
      }
    } else {
      // Group words into chunks
      const chunks: { words: typeof words; start: number; end: number }[] = [];
      let currentChunk: typeof words = [];
      let chunkStart = words[0]?.start ?? seg.start;

      for (const word of words) {
        currentChunk.push(word);
        const chunkDuration = (word.end ?? word.start) - chunkStart;
        if (
          currentChunk.length >= maxWords ||
          chunkDuration >= maxDuration
        ) {
          chunks.push({
            words: currentChunk,
            start: chunkStart,
            end: word.end ?? word.start,
          });
          currentChunk = [];
          chunkStart = word.end ?? word.start;
        }
      }
      if (currentChunk.length > 0) {
        const lastWord = currentChunk[currentChunk.length - 1];
        chunks.push({
          words: currentChunk,
          start: chunkStart,
          end: lastWord.end ?? lastWord.start,
        });
      }

      for (const chunk of chunks) {
        captions.push({
          id: generateId(),
          index: captions.length + 1,
          start: chunk.start,
          end: chunk.end,
          text: chunk.words.map((w) => w.word).join(" ").trim(),
          words: chunk.words.map((w) => ({
            word: w.word,
            start: w.start,
            end: w.end,
          })),
        });
      }
    }
  }

  return reindexCaptions(captions);
}

function splitTextIntoChunks(text: string, maxWords: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(" "));
  }
  return chunks;
}
