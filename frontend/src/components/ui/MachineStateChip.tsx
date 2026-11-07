"use client";

import { Zap, Pause, AlertTriangle, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MachineState } from "@/types/api";

interface MachineStateChipProps {
  state: MachineState;
  since?: string;
  size?: "sm" | "md" | "lg";
}

const STATE_CONFIG: Record<
  MachineState,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ReactNode;
    pulse: boolean;
  }
> = {
  running: {
    label: "Running",
    color: "text-state-running",
    bgColor: "bg-state-running/10",
    borderColor: "border-state-running/30",
    icon: <Zap />,
    pulse: true,
  },
  idle: {
    label: "Idle",
    color: "text-state-idle",
    bgColor: "bg-state-idle/10",
    borderColor: "border-state-idle/30",
    icon: <Pause />,
    pulse: false,
  },
  fault: {
    label: "Fault",
    color: "text-state-fault",
    bgColor: "bg-state-fault/10",
    borderColor: "border-state-fault/30",
    icon: <AlertTriangle />,
    pulse: false,
  },
  offline: {
    label: "Offline",
    color: "text-state-offline",
    bgColor: "bg-state-offline/10",
    borderColor: "border-state-offline/30",
    icon: <WifiOff />,
    pulse: false,
  },
};

const SIZE_CLASS = {
  sm: { chip: "px-2 py-0.5 text-xs gap-1", icon: 10 },
  md: { chip: "px-3 py-1 text-sm gap-1.5", icon: 13 },
  lg: { chip: "px-4 py-1.5 text-base gap-2", icon: 16 },
};

export function MachineStateChip({
  state,
  since,
  size = "md",
}: MachineStateChipProps) {
  const config = STATE_CONFIG[state];
  const sizeConfig = SIZE_CLASS[size];

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "relative inline-flex items-center font-mono font-semibold rounded-full border transition-colors duration-300",
          config.color,
          config.bgColor,
          config.borderColor,
          sizeConfig.chip
        )}
      >
        {config.pulse && (
          <span
            className={cn(
              "absolute inset-0 rounded-full border border-state-running animate-state-pulse opacity-30"
            )}
          />
        )}
        <span
          className="shrink-0"
          style={{ width: sizeConfig.icon, height: sizeConfig.icon }}
        >
          {config.icon}
        </span>
        <span>{config.label}</span>
      </div>

      {since && (
        <span className="font-mono text-xs text-text-muted">
          since {since}
        </span>
      )}
    </div>
  );
}
