"use client";

import { X, Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ProcessingStep } from "@/types";

interface ProcessingOverlayProps {
  steps: ProcessingStep[];
  onCancel: () => void;
  progress: number;
}

export default function ProcessingOverlay({
  steps,
  onCancel,
  progress,
}: ProcessingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1C1C22] border border-[#2E2E38] rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl">
        {/* Spinner */}
        <div className="flex justify-center mb-6">
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 rounded-full border-4 border-[#27272A]" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <Loader2 size={16} className="text-indigo-400 animate-spin" />
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-center text-lg font-bold text-zinc-50 mb-1">
          Generating Captions…
        </h3>
        <p className="text-center text-xs text-zinc-500 mb-6">
          This usually takes 10–30 seconds
        </p>

        {/* Steps */}
        <ul className="space-y-3 mb-6">
          {steps.map((step) => (
            <li key={step.id} className="flex items-center gap-3">
              <span className="shrink-0 w-5 h-5 flex items-center justify-center">
                {step.status === "done" && (
                  <Check size={16} className="text-green-400" />
                )}
                {step.status === "active" && (
                  <Loader2
                    size={16}
                    className="text-indigo-400 animate-spin"
                  />
                )}
                {step.status === "error" && (
                  <AlertCircle size={16} className="text-red-400" />
                )}
                {step.status === "pending" && (
                  <span className="w-3 h-3 rounded-full border border-[#3F3F50] inline-block" />
                )}
              </span>
              <span
                className={`text-sm ${
                  step.status === "done"
                    ? "text-zinc-400 line-through"
                    : step.status === "active"
                    ? "text-zinc-100 font-medium"
                    : step.status === "error"
                    ? "text-red-400"
                    : "text-zinc-600"
                }`}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ul>

        {/* Progress bar */}
        <Progress
          value={progress}
          className="h-1.5 bg-[#27272A] mb-6 [&>div]:bg-indigo-500"
        />

        <Button
          variant="ghost"
          onClick={onCancel}
          className="w-full text-zinc-500 hover:text-zinc-300 hover:bg-[#27272A] text-sm"
        >
          <X size={14} className="mr-1.5" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
