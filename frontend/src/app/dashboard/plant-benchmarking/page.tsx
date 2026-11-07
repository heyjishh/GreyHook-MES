"use client";

import { useState } from "react";
import { PLANTS, ENTERPRISE_SUMMARY, type PlantConfig } from "@/lib/enterprise-config";
import ReactECharts from "echarts-for-react";
import { Trophy, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

function lcg(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

type Metric = "oee" | "availability" | "performance" | "quality" | "output";

const METRIC_LABELS: Record<Metric, string> = {
  oee: "OEE",
  availability: "Availability",
  performance: "Performance",
  quality: "Quality Rate",
  output: "Output %",
};

function getMetricValue(plant: PlantConfig, metric: Metric): number {
  if (metric === "output") return Math.round((plant.outputToday / plant.outputTarget) * 100);
  return plant[metric];
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="font-mono text-sm text-muted font-bold">#{rank}</span>;
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-bgMuted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-2xs text-text w-10 text-right">{value}%</span>
    </div>
  );
}

function RadarChart() {
  const indicators = [
    { name: "OEE", max: 100 },
    { name: "Availability", max: 100 },
    { name: "Performance", max: 100 },
    { name: "Quality", max: 100 },
    { name: "Output %", max: 100 },
  ];

  const series = PLANTS.map(p => ({
    name: p.name,
    value: [
      p.oee,
      p.availability,
      p.performance,
      p.quality,
      Math.round((p.outputToday / p.outputTarget) * 100),
    ],
    lineStyle: { color: p.industryColor, width: 2 },
    itemStyle: { color: p.industryColor },
    areaStyle: { color: p.industryColor + "22" },
  }));

  const opt = {
    backgroundColor: "transparent",
    tooltip: { textStyle: { fontSize: 10, fontFamily: "IBM Plex Mono" } },
    legend: {
      bottom: 0, textStyle: { fontSize: 9, fontFamily: "IBM Plex Mono" },
      data: PLANTS.map(p => ({ name: p.name, icon: "circle" })),
    },
    radar: {
      indicator: indicators,
      shape: "polygon",
      splitNumber: 4,
      axisName: { fontSize: 10, fontFamily: "IBM Plex Mono", color: "#6A8A9A" },
      splitLine: { lineStyle: { color: "#E8E4DF" } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: "#E8E4DF" } },
    },
    series: [{ type: "radar", data: series }],
  };

  return <ReactECharts option={opt} style={{ height: "320px", width: "100%" }} />;
}

function WeeklyProgressChart() {
  const opt = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", textStyle: { fontSize: 10, fontFamily: "IBM Plex Mono" } },
    legend: { bottom: 0, textStyle: { fontSize: 9, fontFamily: "IBM Plex Mono" }, itemWidth: 10, itemHeight: 2 },
    grid: { top: 8, bottom: 50, left: 40, right: 16 },
    xAxis: { type: "category", data: ["W1", "W2", "W3", "W4", "W5", "W6"], axisLabel: { fontSize: 10, fontFamily: "IBM Plex Mono" } },
    yAxis: { type: "value", min: 55, axisLabel: { fontSize: 10, fontFamily: "IBM Plex Mono", formatter: "{value}%" }, splitLine: { lineStyle: { color: "#F4F0EC" } } },
    series: PLANTS.map(p => ({
      name: p.name.replace("Sunrise ", ""),
      type: "line",
      data: p.oeeWeekTrend,
      smooth: true,
      symbol: "circle",
      symbolSize: 4,
      lineStyle: { color: p.industryColor, width: 2 },
      itemStyle: { color: p.industryColor },
    })),
  };

  return <ReactECharts option={opt} style={{ height: "220px", width: "100%" }} />;
}

function PerformanceGapChart() {
  const gaps = PLANTS.map(p => ({
    name: p.name.replace("Sunrise ", ""),
    gap: +(p.oeeTarget - p.oee).toFixed(1),
    color: (p.oeeTarget - p.oee) > 10 ? "#CC1800" : (p.oeeTarget - p.oee) > 5 ? "#A85E00" : "#1A7A40",
  }));

  const opt = {
    backgroundColor: "transparent",
    tooltip: { formatter: (p: { name: string; value: number }) => `${p.name}: ${p.value}% gap to target`, textStyle: { fontSize: 10, fontFamily: "IBM Plex Mono" } },
    grid: { top: 8, bottom: 60, left: 8, right: 8 },
    xAxis: { type: "category", data: gaps.map(g => g.name), axisLabel: { fontSize: 9, fontFamily: "IBM Plex Mono", rotate: 10 } },
    yAxis: { type: "value", axisLabel: { fontSize: 10, fontFamily: "IBM Plex Mono", formatter: "{value}%" }, splitLine: { lineStyle: { color: "#F4F0EC" } } },
    series: [{
      type: "bar",
      data: gaps.map(g => ({ value: g.gap, itemStyle: { color: g.color, borderRadius: [3, 3, 0, 0] } })),
      barWidth: "40%",
      markLine: {
        data: [{ type: "average" }],
        lineStyle: { color: "#6A8A9A", type: "dashed" },
        label: { formatter: "Avg {c}%", fontSize: 9, fontFamily: "IBM Plex Mono" },
      },
    }],
  };

  return <ReactECharts option={opt} style={{ height: "200px", width: "100%" }} />;
}

function ImprovementSuggestions({ plant, rank }: { plant: PlantConfig; rank: number }) {
  const rng = lcg(plant.id.charCodeAt(5) * 13 + rank);
  const potentialGain = +(rng() * 8 + 2).toFixed(1);
  const suggestions = [
    `Reduce micro-stoppages on ${plant.industry === "Automotive" ? "welding" : plant.industry === "Pharmaceutical" ? "blister packing" : plant.industry === "Electronics" ? "SMT reflow" : "weaving"} lines`,
    `Cross-train operators from ${ENTERPRISE_SUMMARY.topPlant === plant.id ? "best-practice sharing" : PLANTS.find(p => p.id === ENTERPRISE_SUMMARY.topPlant)?.name}`,
    `Deploy predictive maintenance to close availability gap`,
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <TrendingUp size={11} className="text-brand" />
        <span className="font-mono text-2xs text-brand font-semibold">Potential +{potentialGain}% OEE</span>
      </div>
      {suggestions.slice(0, 2).map((s, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <span className="font-mono text-2xs text-muted mt-0.5">•</span>
          <span className="font-mono text-2xs text-muted">{s}</span>
        </div>
      ))}
    </div>
  );
}

export default function PlantBenchmarkingPage() {
  const [metric, setMetric] = useState<Metric>("oee");

  const ranked = [...PLANTS].sort((a, b) => getMetricValue(b, metric) - getMetricValue(a, metric));
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const maxVal = Math.max(...PLANTS.map(p => getMetricValue(p, metric)));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={16} className="text-brand" />
            <span className="font-mono text-2xs text-brand font-semibold uppercase tracking-widest">Enterprise</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-text">Plant Benchmarking</h1>
          <p className="font-mono text-xs text-muted mt-0.5">Performance league table across {PLANTS.length} plants</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-border rounded-xl p-4 flex flex-col gap-2">
          <span className="font-mono text-2xs text-muted">Top Performer</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥇</span>
            <div>
              <div className="font-heading text-sm font-bold text-text">{best.name}</div>
              <div className="font-mono text-2xs text-success">{getMetricValue(best, metric)}% {METRIC_LABELS[metric]}</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 flex flex-col gap-2">
          <span className="font-mono text-2xs text-muted">Needs Attention</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-heading text-sm font-bold text-text">{worst.name}</div>
              <div className="font-mono text-2xs text-danger">{getMetricValue(worst, metric)}% {METRIC_LABELS[metric]}</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 flex flex-col gap-2">
          <span className="font-mono text-2xs text-muted">Enterprise Average</span>
          <div className="font-heading text-2xl font-bold text-text">{ENTERPRISE_SUMMARY.avgOEE}%</div>
          <div className="font-mono text-2xs text-muted">OEE across all plants</div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h2 className="font-heading text-sm font-bold text-text">League Table</h2>
          <div className="flex items-center gap-1 bg-bgMuted rounded-lg p-1">
            {(Object.keys(METRIC_LABELS) as Metric[]).map(m => (
              <button key={m} onClick={() => setMetric(m)}
                className={cn(
                  "px-2.5 py-1 rounded-md font-mono text-2xs transition-all",
                  metric === m ? "bg-white text-text shadow-sm font-semibold" : "text-muted hover:text-text"
                )}>
                {METRIC_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {ranked.map((plant, idx) => {
            const val = getMetricValue(plant, metric);
            const prevIdx = PLANTS.findIndex(p => p.id === plant.id);
            const movement = idx < prevIdx ? "up" : idx > prevIdx ? "down" : "same";
            return (
              <div key={plant.id} className={cn(
                "flex items-center gap-4 p-3 rounded-lg border transition-colors",
                idx === 0 ? "border-[#FFD700]/40 bg-[#FFFBEA]" : "border-border bg-white hover:bg-bgSubtle"
              )}>
                <div className="w-8 flex items-center justify-center shrink-0">
                  <RankBadge rank={idx + 1} />
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0"
                     style={{ background: plant.industryColor + "18" }}>
                  {plant.industryEmoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-heading text-sm font-bold text-text truncate">{plant.name}</span>
                    <span className="font-mono text-2xs text-muted">{plant.location}</span>
                    {movement === "up" && <ArrowUp size={10} className="text-success shrink-0" />}
                    {movement === "down" && <ArrowDown size={10} className="text-danger shrink-0" />}
                  </div>
                  <ScoreBar value={val} max={maxVal} color={plant.industryColor} />
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 w-24">
                  <span className="font-heading text-base font-bold" style={{ color: plant.industryColor }}>{val}%</span>
                  <span className="font-mono text-2xs text-muted">{plant.industry}</span>
                </div>
                <div className="shrink-0">
                  {idx === 0 && <TrendingUp size={14} className="text-success" />}
                  {idx === ranked.length - 1 && <TrendingDown size={14} className="text-danger" />}
                  {idx > 0 && idx < ranked.length - 1 && <Minus size={14} className="text-muted" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-border rounded-xl p-5">
          <h2 className="font-heading text-sm font-bold text-text mb-4">Multi-Dimension Radar</h2>
          <RadarChart />
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <h2 className="font-heading text-sm font-bold text-text mb-4">OEE Trend (6W)</h2>
          <WeeklyProgressChart />
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl p-5">
        <h2 className="font-heading text-sm font-bold text-text mb-4">OEE Gap to Target</h2>
        <PerformanceGapChart />
      </div>

      <div className="bg-white border border-border rounded-xl p-5">
        <h2 className="font-heading text-sm font-bold text-text mb-4">Improvement Opportunities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {ranked.map((plant, idx) => (
            <div key={plant.id} className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <RankBadge rank={idx + 1} />
                <div>
                  <div className="font-heading text-xs font-bold text-text">{plant.name}</div>
                  <div className="font-mono text-2xs" style={{ color: plant.industryColor }}>{plant.industry}</div>
                </div>
              </div>
              <ImprovementSuggestions plant={plant} rank={idx + 1} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
