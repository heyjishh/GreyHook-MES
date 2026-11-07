"use client";

import { cn } from "@/lib/utils";

interface ProductionProgressProps {
  actual: number;
  planned: number;
  label?: string;
}

function getProgressColor(pct: number): string {
  if (pct >= 0.9) return "bg-state-running";
  if (pct >= 0.7) return "bg-state-idle";
  return "bg-state-fault";
}

function getProgressTextColor(pct: number): string {
  if (pct >= 0.9) return "text-state-running";
  if (pct >= 0.7) return "text-state-idle";
  return "text-state-fault";
}

export function ProductionProgress({
  actual,
  planned,
  label,
}: ProductionProgressProps) {
  const pct = planned > 0 ? actual / planned : 0;
  const cappedPct = Math.min(pct, 1);
  const displayPct = (pct * 100).toFixed(1);
  const barColor = getProgressColor(pct);
  const textColor = getProgressTextColor(pct);

  return (
    <div className="space-y-2">
      {label && (
        <p className="font-sans text-sm text-text-secondary">{label}</p>
      )}

      <div className="flex items-center justify-between mb-1">
        <span className={cn("font-mono text-sm font-semibold", textColor)}>
          {displayPct}%
        </span>
        <span className="font-mono text-sm text-text-muted">
          {actual.toLocaleString()} / {planned.toLocaleString()}
        </span>
      </div>

      <div className="w-full h-2.5 bg-surface-2 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barColor
          )}
          style={{ width: `${cappedPct * 100}%` }}
          role="progressbar"
          aria-valuenow={actual}
          aria-valuemin={0}
          aria-valuemax={planned}
        />
      </div>

      {planned > 0 && actual > planned && (
        <p className="font-mono text-xs text-state-running">
          Target exceeded — {(actual - planned).toLocaleString()} over planned
        </p>
      )}
    </div>
  );
}
