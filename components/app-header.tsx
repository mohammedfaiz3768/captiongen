"use client";

import { useState } from "react";
import { Settings, Captions } from "lucide-react";
import { Button } from "@/components/ui/button";
import SettingsPanel from "./settings-panel";

interface AppHeaderProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  maxWordsPerSegment: number;
  onMaxWordsChange: (v: number) => void;
  maxSegmentDuration: number;
  onMaxDurationChange: (v: number) => void;
}

export default function AppHeader({
  apiKey,
  onApiKeyChange,
  maxWordsPerSegment,
  onMaxWordsChange,
  maxSegmentDuration,
  onMaxDurationChange,
}: AppHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#09090B]/80 backdrop-blur-xl border-b border-[#2E2E38]">
        <div className="max-w-[1400px] mx-auto h-full flex items-center justify-between px-4 md:px-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
              <Captions size={16} className="text-white" />
            </div>
            <span className="text-zinc-50 font-bold text-lg tracking-tight">
              CaptionGen
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {!apiKey && (
              <span className="text-xs text-amber-400 hidden sm:inline">
                Add API key in Settings
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-[#27272A]"
              aria-label="Open settings"
            >
              <Settings size={16} />
            </Button>
          </div>
        </div>
      </header>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiKey={apiKey}
        onApiKeyChange={onApiKeyChange}
        maxWordsPerSegment={maxWordsPerSegment}
        onMaxWordsChange={onMaxWordsChange}
        maxSegmentDuration={maxSegmentDuration}
        onMaxDurationChange={onMaxDurationChange}
      />
    </>
  );
}
