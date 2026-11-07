"use client";

import ReactECharts from "echarts-for-react";
import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp } from "lucide-react";

const PRODUCTS = ["ENG-MNT-V2", "BRK-ASY-X4", "SHAFT-V7"];
const BATCHES = {
  "ENG-MNT-V2": ["Batch #GB-2026-10-14 (Golden)", "Batch #PO-2026-11-001 (Current)", "Batch #PO-2026-10-28"],
  "BRK-ASY-X4":  ["Batch #GB-2026-09-22 (Golden)", "Batch #PO-2026-11-002 (Current)"],
  "SHAFT-V7":    ["Batch #GB-2026-10-02 (Golden)", "Batch #PO-2026-11-003 (Current)"],
};

interface ProcessParam {
  id: string;
  label: string;
  unit: string;
  golden: { mean: number; ucl: number; lcl: number };
  current: number[];
  timestamps: string[];
}

function makeTimestamps(n: number) {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now - (n - i) * 15 * 60 * 1000);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  });
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function sinusoid(n: number, mean: number, amp: number, seed: number) {
  return Array.from({ length: n }, (_, i) => {
    const noise = Math.sin(i * 0.7 + seed) * amp * 0.3 + (Math.cos(i * 1.3 + seed * 2)) * amp * 0.2;
    return parseFloat((mean + Math.sin(i * 0.4 + seed) * amp + noise).toFixed(3));
  });
}

const PARAMS: ProcessParam[] = [
  { id: "spindle_speed", label: "Spindle Speed", unit: "RPM", golden: { mean: 1800, ucl: 1860, lcl: 1740 }, current: sinusoid(20, 1812, 35, 1), timestamps: makeTimestamps(20) },
  { id: "feed_rate", label: "Feed Rate", unit: "mm/min", golden: { mean: 220, ucl: 235, lcl: 205 }, current: sinusoid(20, 218, 10, 2.5), timestamps: makeTimestamps(20) },
  { id: "cutting_temp", label: "Cutting Temperature", unit: "°C", golden: { mean: 68, ucl: 78, lcl: 58 }, current: sinusoid(20, 74, 6, 0.8), timestamps: makeTimestamps(20) },
  { id: "vibration", label: "Vibration (RMS)", unit: "mm/s", golden: { mean: 1.2, ucl: 1.8, lcl: 0.6 }, current: sinusoid(20, 1.35, 0.3, 3.1), timestamps: makeTimestamps(20) },
  { id: "coolant_flow", label: "Coolant Flow", unit: "L/min", golden: { mean: 12.0, ucl: 13.0, lcl: 11.0 }, current: sinusoid(20, 11.7, 0.5, 1.7), timestamps: makeTimestamps(20) },
];

function deviation(current: number[], golden: { mean: number; ucl: number; lcl: number }) {
  const avg = current.reduce((a, b) => a + b, 0) / current.length;
  const devPct = ((avg - golden.mean) / golden.mean) * 100;
  const inBand = current.every(v => v >= golden.lcl && v <= golden.ucl);
  const violationCount = current.filter(v => v < golden.lcl || v > golden.ucl).length;
  return { avg, devPct, inBand, violationCount };
}

function StatusIcon({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (ok) return <CheckCircle2 size={14} className="text-success" />;
  if (warn) return <AlertTriangle size={14} className="text-warning" />;
  return <XCircle size={14} className="text-danger" />;
}

export default function GoldenBatchPage() {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
  const [selectedParam, setSelectedParam] = useState(PARAMS[0].id);

  const param = PARAMS.find(p => p.id === selectedParam)!;
  const { avg, devPct, inBand, violationCount } = deviation(param.current, param.golden);

  const overallScore = Math.round(PARAMS.map(p => {
    const { violationCount: vc } = deviation(p.current, p.golden);
    return Math.max(0, 100 - vc * 15);
  }).reduce((a, b) => a + b, 0) / PARAMS.length);

  const overlayOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", backgroundColor: "#0D1B2A", borderColor: "#1E3A5F", textStyle: { color: "#E5E7EB", fontSize: 11 } },
    legend: { bottom: 0, textStyle: { color: "#9CA3AF", fontSize: 9 }, itemHeight: 8 },
    grid: { left: 56, right: 20, top: 20, bottom: 44 },
    xAxis: { type: "category", data: param.timestamps, axisLabel: { color: "#6B7280", fontSize: 10 }, axisLine: { lineStyle: { color: "#1E3A5F" } } },
    yAxis: { type: "value", axisLabel: { color: "#6B7280", fontSize: 10, formatter: (v: number) => v.toString() }, splitLine: { lineStyle: { color: "#1E3A5F", type: "dashed" } } },
    series: [
      { name: "Current Batch", type: "line", data: param.current, symbol: "circle", symbolSize: 4,
        lineStyle: { color: "#F05230", width: 2 }, itemStyle: { color: (p: { value: number }) => (p.value > param.golden.ucl || p.value < param.golden.lcl) ? "#CC1800" : "#F05230" } },
      { name: "Golden Mean", type: "line", data: Array(param.current.length).fill(param.golden.mean),
        symbol: "none", lineStyle: { color: "#1A7A40", width: 1.5, type: "dashed" } },
      { name: "UCL (Golden)", type: "line", data: Array(param.current.length).fill(param.golden.ucl),
        symbol: "none", lineStyle: { color: "#2563EB", width: 1, type: "dotted" } },
      { name: "LCL (Golden)", type: "line", data: Array(param.current.length).fill(param.golden.lcl),
        symbol: "none", lineStyle: { color: "#2563EB", width: 1, type: "dotted" } },
    ],
  };

  const radarOption = {
    backgroundColor: "transparent",
    tooltip: { backgroundColor: "#0D1B2A", borderColor: "#1E3A5F", textStyle: { color: "#E5E7EB", fontSize: 11 } },
    radar: {
      indicator: PARAMS.map(p => ({ name: p.label, max: 100 })),
      axisName: { color: "#9CA3AF", fontSize: 9 },
      splitLine: { lineStyle: { color: "#1E3A5F" } },
      splitArea: { show: false },
    },
    series: [{
      type: "radar",
      data: [
        { name: "Golden Batch", value: PARAMS.map(() => 100), itemStyle: { color: "#1A7A40" }, lineStyle: { color: "#1A7A40", width: 2 }, areaStyle: { color: "rgba(26,122,64,0.1)" } },
        { name: "Current Batch", value: PARAMS.map(p => { const { violationCount: vc } = deviation(p.current, p.golden); return Math.max(0, 100 - vc * 20); }),
          itemStyle: { color: "#F05230" }, lineStyle: { color: "#F05230", width: 2 }, areaStyle: { color: "rgba(240,82,48,0.12)" } },
      ],
      legend: { data: ["Golden Batch", "Current Batch"] },
    }],
    legend: { bottom: 0, textStyle: { color: "#9CA3AF", fontSize: 9 }, itemHeight: 8 },
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary">Golden Batch / Process Monitor</h1>
          <p className="font-sans text-xs text-text-tertiary mt-0.5">Compare current batch process parameters against the golden benchmark batch</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
            className="font-mono text-xs bg-surface border border-border rounded-lg px-3 py-1.5 text-text-primary focus:border-brand focus:outline-none">
            {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Similarity score + overall */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`sm:col-span-2 bg-surface border rounded-xl p-4 flex items-center gap-4 ${overallScore >= 85 ? "border-success/30" : overallScore >= 70 ? "border-warning/30" : "border-danger/30"}`}>
          <div className="relative w-16 h-16 shrink-0">
            <svg viewBox="0 0 60 60" className="w-16 h-16">
              <circle cx="30" cy="30" r="24" fill="none" stroke="#E5E7EB" strokeWidth="6" />
              <circle cx="30" cy="30" r="24" fill="none"
                stroke={overallScore >= 85 ? "#1A7A40" : overallScore >= 70 ? "#A85E00" : "#CC1800"}
                strokeWidth="6" strokeDasharray={`${(overallScore / 100) * (2 * Math.PI * 24)} ${2 * Math.PI * 24}`}
                strokeLinecap="round" transform="rotate(-90 30 30)" />
              <text x="30" y="30" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="700"
                fill={overallScore >= 85 ? "#1A7A40" : overallScore >= 70 ? "#A85E00" : "#CC1800"} fontFamily="'IBM Plex Mono'">{overallScore}</text>
            </svg>
          </div>
          <div>
            <p className="font-mono text-2xs text-text-tertiary uppercase tracking-widest mb-0.5">Golden Batch Similarity Score</p>
            <p className={`font-heading text-lg font-bold ${overallScore >= 85 ? "text-success" : overallScore >= 70 ? "text-warning" : "text-danger"}`}>
              {overallScore >= 85 ? "On Target" : overallScore >= 70 ? "Minor Deviations" : "Significant Deviations"}
            </p>
            <p className="font-sans text-xs text-text-tertiary">Comparing current batch vs Golden #GB-2026-10-14</p>
          </div>
        </div>
        {[
          { label: "Active Parameters", value: `${PARAMS.length}`, sub: "being monitored" },
          { label: "Violations", value: `${PARAMS.reduce((s, p) => s + deviation(p.current, p.golden).violationCount, 0)}`, sub: "out-of-band readings", color: "text-danger" },
        ].map(k => (
          <div key={k.label} className="bg-surface border border-border rounded-xl p-4">
            <p className="font-mono text-2xs text-text-tertiary uppercase tracking-widest mb-1">{k.label}</p>
            <p className={`font-mono text-2xl font-bold ${k.color ?? "text-text-primary"}`}>{k.value}</p>
            <p className="font-sans text-xs text-text-tertiary">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Parameter list */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="font-heading text-xs font-semibold text-text-secondary uppercase tracking-widest mb-3">Parameters</p>
          <div className="space-y-2">
            {PARAMS.map(p => {
              const { avg: a, devPct: dp, inBand: ib, violationCount: vc } = deviation(p.current, p.golden);
              return (
                <div key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selectedParam === p.id ? "bg-brand/8 border border-brand/20" : "hover:bg-bg border border-transparent"}`}
                  onClick={() => setSelectedParam(p.id)}>
                  <StatusIcon ok={ib} warn={!ib && vc <= 2} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-sans text-xs font-medium truncate ${selectedParam === p.id ? "text-brand" : "text-text-primary"}`}>{p.label}</p>
                    <p className="font-mono text-2xs text-text-tertiary">{a.toFixed(2)} {p.unit} · {dp >= 0 ? "+" : ""}{dp.toFixed(1)}%</p>
                  </div>
                  {!ib && <span className="font-mono text-2xs text-danger shrink-0">{vc} OOB</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Overlay chart */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-heading text-sm font-semibold text-text-primary">{param.label}</p>
              <p className="font-mono text-2xs text-text-tertiary">
                Golden mean: {param.golden.mean} {param.unit} · Current avg: {avg.toFixed(2)} {param.unit} · Dev: {devPct >= 0 ? "+" : ""}{devPct.toFixed(2)}%
              </p>
            </div>
            {!inBand && (
              <div className="flex items-center gap-1.5 bg-warning/10 border border-warning/30 rounded-lg px-2.5 py-1">
                <AlertTriangle size={12} className="text-warning" />
                <span className="font-mono text-2xs text-warning">{violationCount} readings outside golden band</span>
              </div>
            )}
          </div>
          <ReactECharts option={overlayOption} style={{ height: 240 }} opts={{ renderer: "svg" }} />
        </div>
      </div>

      {/* Radar + history */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="font-heading text-xs font-semibold text-text-secondary uppercase tracking-widest mb-2">Golden vs Current — Radar View</p>
          <ReactECharts option={radarOption} style={{ height: 280 }} opts={{ renderer: "svg" }} />
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="font-heading text-xs font-semibold text-text-secondary uppercase tracking-widest mb-3">Recent Batch Comparisons</p>
          <div className="space-y-2">
            {[
              { batch: "PO-2026-11-001", product: "ENG-MNT-V2", score: 94, yield: 97.2, date: "Nov 6" },
              { batch: "PO-2026-10-28", product: "ENG-MNT-V2", score: 88, yield: 95.1, date: "Oct 28" },
              { batch: "PO-2026-10-21", product: "ENG-MNT-V2", score: 71, yield: 91.3, date: "Oct 21" },
              { batch: "PO-2026-10-14", product: "ENG-MNT-V2", score: 100, yield: 98.8, date: "Oct 14 ★ Golden" },
              { batch: "PO-2026-10-07", product: "ENG-MNT-V2", score: 82, yield: 93.7, date: "Oct 7" },
            ].map(b => (
              <div key={b.batch} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg transition-colors">
                <div className="w-10 h-10 rounded-lg bg-bg border border-border flex items-center justify-center shrink-0">
                  <span className={`font-mono text-xs font-bold ${b.score >= 90 ? "text-success" : b.score >= 75 ? "text-warning" : "text-danger"}`}>{b.score}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-text-primary font-semibold">{b.batch}</p>
                  <p className="font-sans text-2xs text-text-tertiary">{b.date}</p>
                </div>
                <div className="text-right">
                  <p className={`font-mono text-xs font-bold ${b.yield >= 95 ? "text-success" : "text-warning"}`}>{b.yield}%</p>
                  <p className="font-mono text-2xs text-text-tertiary">FPY</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
