"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, Factory } from "lucide-react";
import { INDUSTRY_CONFIGS, type IndustryId } from "@/lib/industry-config";
import { useIndustryStore } from "@/store/industry";
import { cn } from "@/lib/utils";

const ORDER: IndustryId[] = [
  "automotive",
  "pharmaceutical",
  "electronics",
  "textile",
  "food_beverage",
  "aerospace",
  "chemical",
  "plastics",
];

export default function IndustrySelectPage() {
  const router = useRouter();
  const { selectedIndustry, setIndustry } = useIndustryStore();
  const [hovered, setHovered] = useState<IndustryId | null>(null);

  function handleSelect(id: IndustryId) {
    setIndustry(id);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-[100dvh] bg-sidebar-bg flex flex-col">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 rounded-sm bg-brand shrink-0" />
          <span className="font-mono text-xs font-bold text-sidebar-fg tracking-widest uppercase">GreyHook MES</span>
        </div>
        <h1 className="font-heading text-2xl font-bold text-sidebar-fg">
          What type of factory are you running?
        </h1>
        <p className="font-sans text-sm text-sidebar-fg-muted mt-1.5">
          GreyHook adapts its dashboard, terminology, and AI insights to your industry.
          You can change this at any time.
        </p>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl">
          {ORDER.map((id) => {
            const cfg = INDUSTRY_CONFIGS[id];
            const isSelected = selectedIndustry === id;
            const isHov = hovered === id;

            return (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                onMouseEnter={() => setHovered(id)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  "relative text-left p-4 rounded-xl border transition-all duration-200",
                  "hover:scale-[1.02] active:scale-[0.99]",
                  isSelected
                    ? "border-brand bg-brand/8 shadow-[0_0_0_2px] shadow-brand/30"
                    : "border-sidebar-border bg-sidebar-hover-bg hover:border-sidebar-fg-muted"
                )}
                style={isSelected || isHov ? { borderColor: cfg.color + "60" } : undefined}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 size={14} className="text-brand" />
                  </div>
                )}

                {/* Emoji icon in colored pill */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3 shrink-0"
                  style={{ backgroundColor: cfg.color + "20" }}
                >
                  {cfg.emoji}
                </div>

                <div className="font-heading text-sm font-bold text-sidebar-fg mb-0.5">{cfg.name}</div>
                <div className="font-sans text-xs text-sidebar-fg-muted leading-snug mb-3">{cfg.tagline}</div>

                {/* Standards chips */}
                <div className="flex flex-wrap gap-1">
                  {cfg.standards.slice(0, 2).map((s) => (
                    <span
                      key={s}
                      className="px-1.5 py-0.5 rounded font-mono text-2xs"
                      style={{ backgroundColor: cfg.color + "15", color: cfg.color }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="max-w-5xl mt-6 flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-white font-sans text-sm font-semibold hover:bg-brand/90 transition-colors"
          >
            <span>Go to Dashboard</span>
            <ArrowRight size={14} />
          </button>
          <span className="font-sans text-xs text-sidebar-fg-muted">
            Currently configured for{" "}
            <strong className="text-sidebar-fg">{INDUSTRY_CONFIGS[selectedIndustry].name}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
