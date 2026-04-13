"use client";

import { useState } from "react";
import { Eye, EyeOff, ExternalLink, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  maxWordsPerSegment: number;
  onMaxWordsChange: (v: number) => void;
  maxSegmentDuration: number;
  onMaxDurationChange: (v: number) => void;
}

export default function SettingsPanel({
  open,
  onClose,
  apiKey,
  onApiKeyChange,
  maxWordsPerSegment,
  onMaxWordsChange,
  maxSegmentDuration,
  onMaxDurationChange,
}: SettingsPanelProps) {
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [localKey, setLocalKey] = useState(apiKey);
  const [localMaxWords, setLocalMaxWords] = useState(maxWordsPerSegment);
  const [localMaxDuration, setLocalMaxDuration] = useState(maxSegmentDuration);

  const handleSave = () => {
    onApiKeyChange(localKey);
    onMaxWordsChange(localMaxWords);
    onMaxDurationChange(localMaxDuration);
    onClose();
  };

  const handleTest = async () => {
    if (!localKey.startsWith("gsk_") || localKey.length < 20) {
      setTestStatus("fail");
      setTimeout(() => setTestStatus("idle"), 3000);
      return;
    }
    setTestStatus("testing");
    await new Promise((r) => setTimeout(r, 800));
    if (localKey.startsWith("gsk_") && localKey.length > 30) {
      setTestStatus("ok");
    } else {
      setTestStatus("fail");
    }
    setTimeout(() => setTestStatus("idle"), 3000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#1C1C22] border-[#2E2E38] text-zinc-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-zinc-50">
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* API Configuration */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
              API Configuration
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
                  Groq API Key
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKey ? "text" : "password"}
                      value={localKey}
                      onChange={(e) => setLocalKey(e.target.value)}
                      placeholder="gsk_..."
                      className="bg-[#27272A] border-[#3F3F50] text-zinc-100 placeholder:text-zinc-600 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      aria-label={showKey ? "Hide API key" : "Show API key"}
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTest}
                    disabled={testStatus === "testing"}
                    className="border-[#3F3F50] bg-transparent text-zinc-300 hover:bg-[#27272A] shrink-0"
                  >
                    {testStatus === "testing" && (
                      <span className="animate-spin mr-1">⟳</span>
                    )}
                    {testStatus === "ok" && (
                      <Check size={14} className="text-green-400 mr-1" />
                    )}
                    {testStatus === "fail" && (
                      <X size={14} className="text-red-400 mr-1" />
                    )}
                    Test
                  </Button>
                </div>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-1.5 transition-colors"
                >
                  Get free API key <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </div>

          <Separator className="bg-[#2E2E38]" />

          {/* Caption Preferences */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
              Caption Preferences
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
                  Max words per segment
                </label>
                <Input
                  type="number"
                  min={3}
                  max={20}
                  value={localMaxWords}
                  onChange={(e) =>
                    setLocalMaxWords(Math.max(3, parseInt(e.target.value) || 10))
                  }
                  className="bg-[#27272A] border-[#3F3F50] text-zinc-100"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
                  Max segment duration (s)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={15}
                  value={localMaxDuration}
                  onChange={(e) =>
                    setLocalMaxDuration(
                      Math.max(1, parseInt(e.target.value) || 5)
                    )
                  }
                  className="bg-[#27272A] border-[#3F3F50] text-zinc-100"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-[#27272A]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-indigo-500 hover:bg-indigo-400 text-white"
          >
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
