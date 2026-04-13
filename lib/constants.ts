import type { SupportedLanguage } from "@/types";

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "auto", label: "Auto Detect", native: "Auto" },
  { code: "hi", label: "Hindi / Hinglish", native: "हिन्दी" },
  { code: "en", label: "English", native: "English" },
  { code: "ur", label: "Urdu", native: "اردو" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ar", label: "Arabic", native: "العربية" },
];

export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
export const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/avi",
  "video/mov",
];
export const TARGET_SAMPLE_RATE = 16000;

export const DEFAULT_MAX_WORDS_PER_SEGMENT = 4;
export const DEFAULT_MAX_SEGMENT_DURATION = 3;
export const DEFAULT_LANGUAGE = "auto";
export const DEFAULT_TEMPLATE_ID = "clean-classic";

export const LOCAL_STORAGE_KEYS = {
  API_KEY: "captiongen_api_key",
  LANGUAGE: "captiongen_language",
  AUTO_DETECT: "captiongen_auto_detect",
  MAX_WORDS: "captiongen_max_words",
  MAX_DURATION: "captiongen_max_duration",
  TEMPLATE_ID: "captiongen_template_id",
} as const;
