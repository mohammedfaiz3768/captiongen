import type React from "react";

export interface Word {
  word: string;
  start: number; // seconds
  end: number; // seconds
}

export interface Caption {
  id: string;
  index: number;
  start: number; // seconds
  end: number; // seconds
  text: string;
  words: Word[];
}

export interface CaptionTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "trending" | "minimal" | "bold" | "creative";
  wordByWord: boolean;
  position: "top" | "center" | "bottom";
  containerStyle: React.CSSProperties;
  textStyle: React.CSSProperties;
  activeWordStyle?: React.CSSProperties;
  inactiveWordStyle?: React.CSSProperties;
  animationClass?: string;
  fontImport?: string;
}

export interface TranscriptionResult {
  text: string;
  segments: {
    start: number;
    end: number;
    text: string;
    words?: { word: string; start: number; end: number }[];
  }[];
  words?: { word: string; start: number; end: number }[];
  language: string;
}

export interface ProcessingStep {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "error";
}

export type ExportFormat = "srt" | "vtt" | "ass" | "txt" | "json";

export type SupportedLanguage = {
  code: string;
  label: string;
  native: string;
};

export interface AppSettings {
  apiKey: string;
  language: string;
  autoDetect: boolean;
  maxWordsPerSegment: number;
  maxSegmentDuration: number;
  selectedTemplateId: string;
}
