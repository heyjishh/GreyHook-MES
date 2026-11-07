"use client";

import ReactECharts from "echarts-for-react";
import { useMemo } from "react";

interface OEEGaugeProps {
  value: number;
  label: string;
  size?: number;
}

function getOEEColor(value: number): string {
  if (value >= 0.85) return "#F05230";
  if (value >= 0.65) return "#E8603A";
  if (value >= 0.5)  return "#B86A00";
  return "#B0C4CE";
}

export function OEEGauge({ value, label, size = 160 }: OEEGaugeProps) {
  const color = getOEEColor(value);
  const displayPct = (value * 100).toFixed(1);

  const option = useMemo(
    () => ({
      backgroundColor: "transparent",
      series: [
        {
          type: "pie",
          radius: ["68%", "88%"],
          data: [
            {
              value: value * 100,
              name: label,
              itemStyle: { color },
            },
            {
              value: (1 - value) * 100,
              name: "",
              itemStyle: { color: "#F5EDEA" },
            },
          ],
          label: { show: false },
          emphasis: { disabled: true },
          silent: true,
        },
      ],
      graphic: [
        {
          type: "text",
          left: "center",
          top: "center",
          style: {
            text: `${displayPct}%`,
            font: `600 ${Math.round(size * 0.14)}px 'IBM Plex Mono', monospace`,
            fill: color,
            textAlign: "center",
          },
        },
      ],
    }),
    [value, color, label, displayPct, size]
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <ReactECharts
        option={option}
        style={{ width: size, height: size }}
        opts={{ renderer: "svg" }}
      />
      <p className="font-sans text-sm text-text-secondary text-center">{label}</p>
    </div>
  );
}
