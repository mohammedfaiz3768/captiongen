"use client";

interface WaveformBarProps {
  progress: number; // 0-100
  className?: string;
}

export default function WaveformBar({ progress, className = "" }: WaveformBarProps) {
  const bars = 32;

  return (
    <div className={`flex items-center gap-0.5 h-8 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => {
        const filled = (i / bars) * 100 <= progress;
        const height = 20 + Math.sin((i / bars) * Math.PI * 3) * 12 + Math.random() * 8;
        return (
          <div
            key={i}
            className="rounded-full transition-colors duration-150"
            style={{
              width: "3px",
              height: `${Math.max(4, height)}px`,
              backgroundColor: filled
                ? "rgb(99 102 241)"
                : "rgb(39 39 42)",
            }}
          />
        );
      })}
    </div>
  );
}
