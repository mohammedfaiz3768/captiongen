"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { CaptionTemplate } from "@/types";
import { CAPTION_TEMPLATES } from "@/lib/templates";
import TemplatePreview from "./template-preview";

type Category = "all" | "trending" | "minimal" | "bold" | "creative";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "all", label: "All" },
  { value: "trending", label: "Trending" },
  { value: "minimal", label: "Minimal" },
  { value: "bold", label: "Bold" },
  { value: "creative", label: "Creative" },
];

interface TemplateSelectorProps {
  selectedTemplate: CaptionTemplate;
  onTemplateSelect: (template: CaptionTemplate) => void;
}

export default function TemplateSelector({
  selectedTemplate,
  onTemplateSelect,
}: TemplateSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<Category>("all");

  const filtered = useMemo(() => {
    if (activeCategory === "all") return CAPTION_TEMPLATES;
    return CAPTION_TEMPLATES.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  return (
    <section aria-label="Caption style selector">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold text-zinc-200">Caption Style</h2>
        <Badge
          variant="outline"
          className="text-[10px] py-0 px-1.5 border-[#3F3F50] text-zinc-500"
        >
          {CAPTION_TEMPLATES.length}
        </Badge>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {CATEGORIES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setActiveCategory(value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150
              ${
                activeCategory === value
                  ? "bg-indigo-500 text-white"
                  : "bg-[#27272A] text-zinc-400 hover:bg-[#3F3F50] hover:text-zinc-200"
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {filtered.map((template) => (
          <TemplatePreview
            key={template.id}
            template={template}
            isSelected={selectedTemplate.id === template.id}
            onClick={() => onTemplateSelect(template)}
          />
        ))}
      </div>
    </section>
  );
}
