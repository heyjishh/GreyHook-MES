"use client";

import { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { TrendingUp, TrendingDown, Minus, BarChart2, Target, Zap, ShieldCheck } from "lucide-react";

const T = {
  brand:     "#F05230",
  brandDim:  "#FEF0EB",
  success:   "#1A7A40",
  successDim:"#E8F5EC",
  warning:   "#A85E00",
  warningDim:"#FEF0D6",
  danger:    "#CC1800",
  dangerDim: "#FDE8E4",
  neutral:   "#6A8A9A",
  neutralDim:"#F0ECE8",
  border:    "#E8E4DF",
  text:      "#001C2E",
  muted:     "#6A8A9A",
  disabled:  "#B0C4CE",
  bg:        "#FFFFFF",
  bgSubtle:  "#FAFAF8",
  bgMuted:   "#F4F0EC",
  grid:      "#F0ECE8",
};

type Range = "day" | "week" | "month";

const MACHINES = [
  { id: "M-01", name: "AP-ENGINE-MOUNT-V2", oee: 0.767, avail: 0.92, perf: 0.87, qual: 0.96 },
  { id: "M-02", name: "AP-FRAME-WELD-01",   oee: 0.588, avail: 0.78, perf: 0.82, qual: 0.92 },
  { id: "M-03", name: "AP-PRESS-FORM-03",   oee: 0.440, avail: 0.61, perf: 0.79, qual: 0.91 },
  { id: "M-04", name: "AP-ASSEM-LINE-A",    oee: 0.874, avail: 0.96, perf: 0.94, qual: 0.97 },
];

const DOWNTIME_PARETO = [
  { cat: "Mechanical",    minutes: 142, pct: 38 },
  { cat: "Changeover",    minutes: 98,  pct: 26 },
  { cat: "Quality Hold",  minutes: 64,  pct: 17 },
  { cat: "No Material",   minutes: 48,  pct: 13 },
  { cat: "Electrical",    minutes: 24,  pct: 6  },
];

function seed(base: number, s: number, days: number) {
  const r: number[] = [];
  let v = base;
  for (let i = 0; i < days; i++) {
    v = Math.max(0.3, Math.min(0.99, v + (Math.random() - 0.48) * s));
    r.push(+v.toFixed(3));
  }
  return r;
}

function dateLabels(range: Range): string[] {
  const now = new Date();
  if (range === "day") {
    return Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,"0")}:00`);
  }
  if (range === "week") {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - 6 + i);
      return d.toLocaleDateString("en-IN", { weekday: "short" });
    });
  }
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - 29 + i);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  });
}

function oeeColor(v: number) {
  if (v >= 0.85) return T.brand;
  if (v >= 0.65) return T.warning;
  if (v >= 0.5)  return "#B86A00";
  return T.danger;
}

function oeeTrendOption(range: Range) {
  const n = range === "day" ? 24 : range === "week" ? 7 : 30;
  const labels = dateLabels(range);
  const floor  = seed(0.72, 0.06, n);
  const target = Array(n).fill(0.85);
  return {
    grid: { top: 24, bottom: 36, left: 52, right: 24 },
    legend: {
      show: true, top: 0, right: 0,
      textStyle: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
      itemWidth: 12, itemHeight: 8,
    },
    xAxis: {
      type: "category", data: labels,
      axisLine: { lineStyle: { color: T.border } },
      axisTick: { show: false },
      axisLabel: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono", interval: range === "month" ? 4 : 0 },
    },
    yAxis: {
      type: "value", min: 0.3, max: 1,
      axisLabel: {
        formatter: (v: number) => `${(v * 100).toFixed(0)}%`,
        fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono",
      },
      splitLine: { lineStyle: { color: T.grid, type: "dashed" } },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [
      {
        name: "OEE", type: "line", data: floor, smooth: 0.4, symbol: "none",
        lineStyle: { width: 2.5, color: T.brand },
        areaStyle: { color: { type: "linear", x:0, y:0, x2:0, y2:1,
          colorStops: [{ offset:0, color: T.brand+"20" }, { offset:1, color: T.brand+"00" }] } },
      },
      {
        name: "Target", type: "line", data: target, symbol: "none",
        lineStyle: { width: 1.5, color: T.success, type: "dashed" },
        z: 0,
      },
    ],
    tooltip: {
      trigger: "axis", backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 8,
      textStyle: { color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono" },
      formatter: (p: { seriesName: string; value: number }[]) =>
        p.map(x => `${x.seriesName}: <b>${(x.value * 100).toFixed(1)}%</b>`).join("<br/>"),
    },
    animation: true,
  };
}

function throughputOption(range: Range) {
  const n = range === "day" ? 24 : range === "week" ? 7 : 30;
  const labels = dateLabels(range);
  const actual  = Array.from({ length: n }, () => Math.floor(Math.random() * 80 + 60));
  const planned = Array(n).fill(130);
  return {
    grid: { top: 24, bottom: 36, left: 52, right: 24 },
    legend: {
      show: true, top: 0, right: 0,
      textStyle: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
      itemWidth: 12, itemHeight: 8,
    },
    xAxis: {
      type: "category", data: labels,
      axisLine: { lineStyle: { color: T.border } }, axisTick: { show: false },
      axisLabel: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono", interval: range === "month" ? 4 : 0 },
    },
    yAxis: {
      type: "value",
      axisLabel: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
      splitLine: { lineStyle: { color: T.grid, type: "dashed" } },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [
      {
        name: "Actual", type: "bar", data: actual,
        itemStyle: { color: T.brand, borderRadius: [3,3,0,0] },
        barMaxWidth: 32,
      },
      {
        name: "Planned", type: "line", data: planned, symbol: "none",
        lineStyle: { width: 1.5, color: T.success, type: "dashed" },
        z: 10,
      },
    ],
    tooltip: {
      trigger: "axis", backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 8,
      textStyle: { color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono" },
    },
    animation: true,
  };
}

function qualityTrendOption(range: Range) {
  const n = range === "day" ? 24 : range === "week" ? 7 : 30;
  const labels = dateLabels(range);
  const qRate  = seed(0.962, 0.015, n).map(v => +(v * 100).toFixed(2));
  const reject = qRate.map(q => +(100 - q).toFixed(2));
  return {
    grid: { top: 24, bottom: 36, left: 52, right: 24 },
    legend: {
      show: true, top: 0, right: 0,
      textStyle: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
      itemWidth: 12, itemHeight: 8,
    },
    xAxis: {
      type: "category", data: labels,
      axisLine: { lineStyle: { color: T.border } }, axisTick: { show: false },
      axisLabel: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono", interval: range === "month" ? 4 : 0 },
    },
    yAxis: {
      type: "value", min: 90, max: 100,
      axisLabel: {
        formatter: (v: number) => `${v}%`,
        fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono",
      },
      splitLine: { lineStyle: { color: T.grid, type: "dashed" } },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [
      {
        name: "Quality %", type: "line", data: qRate, smooth: 0.4, symbol: "none",
        lineStyle: { width: 2.5, color: T.success },
        areaStyle: { color: { type: "linear", x:0, y:0, x2:0, y2:1,
          colorStops: [{ offset:0, color: T.success+"18" }, { offset:1, color: T.success+"00" }] } },
      },
      {
        name: "Reject %", type: "bar", data: reject,
        itemStyle: { color: T.danger + "60", borderRadius: [2,2,0,0] },
        barMaxWidth: 20, yAxisIndex: 0,
      },
    ],
    tooltip: {
      trigger: "axis", backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 8,
      textStyle: { color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono" },
      formatter: (p: { seriesName: string; value: number }[]) =>
        p.map(x => `${x.seriesName}: <b>${x.value}%</b>`).join("<br/>"),
    },
    animation: true,
  };
}

function paretoOption() {
  const sorted = [...DOWNTIME_PARETO].sort((a, b) => b.minutes - a.minutes);
  let cumPct = 0;
  const cumulative = sorted.map((d) => { cumPct += d.pct; return cumPct; });
  return {
    grid: { top: 16, bottom: 60, left: 56, right: 56 },
    xAxis: {
      type: "category",
      data: sorted.map((d) => d.cat),
      axisLine: { lineStyle: { color: T.border } }, axisTick: { show: false },
      axisLabel: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono", rotate: 15 },
    },
    yAxis: [
      {
        type: "value", name: "Minutes",
        nameTextStyle: { color: T.muted, fontSize: 10, fontFamily: "IBM Plex Mono" },
        axisLabel: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
        splitLine: { lineStyle: { color: T.grid, type: "dashed" } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      {
        type: "value", name: "Cumulative %", min: 0, max: 100,
        nameTextStyle: { color: T.muted, fontSize: 10, fontFamily: "IBM Plex Mono" },
        axisLabel: { formatter: (v: number) => `${v}%`, fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
        splitLine: { show: false },
        axisLine: { show: false }, axisTick: { show: false },
      },
    ],
    series: [
      {
        name: "Duration (min)", type: "bar", data: sorted.map((d) => d.minutes),
        itemStyle: { borderRadius: [3,3,0,0] },
        colorBy: "data",
        color: [T.danger, T.brand, T.warning, "#B86A00", T.disabled],
        barMaxWidth: 48,
      },
      {
        name: "Cumulative %", type: "line", yAxisIndex: 1, data: cumulative,
        symbol: "circle", symbolSize: 6,
        lineStyle: { width: 2, color: T.success },
        itemStyle: { color: T.success, borderColor: T.bg, borderWidth: 2 },
      },
    ],
    tooltip: {
      trigger: "axis", backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 8,
      textStyle: { color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono" },
    },
    animation: true,
  };
}

function machineHeatmapOption() {
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,"0")}:00`);
  const data: [number, number, number][] = [];
  MACHINES.forEach((m, mi) => {
    for (let h = 0; h < 24; h++) {
      const base = m.oee;
      const val = Math.max(0, Math.min(1, base + (Math.random() - 0.5) * 0.2));
      data.push([h, mi, +val.toFixed(3)]);
    }
  });
  return {
    grid: { top: 8, bottom: 56, left: 140, right: 60 },
    xAxis: {
      type: "category", data: hours,
      axisLine: { lineStyle: { color: T.border } }, axisTick: { show: false },
      axisLabel: { fontSize: 9, color: T.muted, fontFamily: "IBM Plex Mono", interval: 3 },
    },
    yAxis: {
      type: "category", data: MACHINES.map((m) => m.id),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { fontSize: 10, color: T.text, fontFamily: "IBM Plex Mono" },
    },
    visualMap: {
      min: 0, max: 1,
      calculable: false, show: true,
      right: 0, top: "middle",
      orient: "vertical",
      inRange: { color: [T.danger + "80", T.warning + "80", T.brand + "CC"] },
      textStyle: { color: T.muted, fontSize: 10, fontFamily: "IBM Plex Mono" },
      formatter: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    series: [{
      type: "heatmap", data,
      itemStyle: { borderRadius: 2, borderWidth: 1, borderColor: T.bgSubtle },
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: T.brand + "40" } },
    }],
    tooltip: {
      trigger: "item", backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 8,
      textStyle: { color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono" },
      formatter: (p: { value: [number, number, number]; name: string }) =>
        `${MACHINES[p.value[1]]?.id} @ ${hours[p.value[0]]}<br/>OEE: <b>${(p.value[2] * 100).toFixed(1)}%</b>`,
    },
    animation: false,
  };
}

function SummaryCard({
  label, value, delta, color, bgColor, icon: Icon,
}: {
  label: string; value: string; delta: string;
  color: string; bgColor: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}) {
  const isUp   = delta.startsWith("+");
  const isDown = delta.startsWith("-");
  return (
    <div className="bg-white rounded-xl p-4 shadow-card">
      <div className="flex items-start justify-between mb-3">
        <span className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bgColor }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <p className="font-mono text-2xl font-black leading-none tabular-nums" style={{ color }}>{value}</p>
      <div className="flex items-center gap-1 mt-2">
        {isUp   ? <TrendingUp   size={12} style={{ color: T.success }} /> :
         isDown ? <TrendingDown size={12} style={{ color: T.danger  }} /> :
                  <Minus        size={12} style={{ color: T.disabled }} />}
        <span className="font-mono text-2xs" style={{ color: isUp ? T.success : isDown ? T.danger : T.disabled }}>
          {delta} vs prior period
        </span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("week");

  const avgOEE   = +(MACHINES.reduce((s, m) => s + m.oee, 0) / MACHINES.length * 100).toFixed(1);
  const avgAvail = +(MACHINES.reduce((s, m) => s + m.avail, 0) / MACHINES.length * 100).toFixed(1);
  const avgPerf  = +(MACHINES.reduce((s, m) => s + m.perf,  0) / MACHINES.length * 100).toFixed(1);
  const avgQual  = +(MACHINES.reduce((s, m) => s + m.qual,  0) / MACHINES.length * 100).toFixed(1);

  const oeeOpt       = useMemo(() => oeeTrendOption(range),    [range]);
  const throughOpt   = useMemo(() => throughputOption(range),  [range]);
  const qualOpt      = useMemo(() => qualityTrendOption(range),[range]);

  return (
    <div className="max-w-[1280px] mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text-primary leading-tight">Analytics</h1>
          <p className="font-mono text-xs text-text-tertiary mt-0.5">Production intelligence · trend analysis</p>
        </div>

        {/* Range selector */}
        <div className="flex items-center bg-bg-subtle border border-border rounded-lg p-0.5 gap-0.5">
          {(["day","week","month"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="font-mono text-xs px-3 py-1.5 rounded-md transition-all"
              style={range === r
                ? { background: T.brand, color: "#fff", fontWeight: 700 }
                : { color: T.muted }
              }
            >
              {r === "day" ? "24h" : r === "week" ? "7d" : "30d"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Avg OEE" value={`${avgOEE}%`} delta="+2.3%"
          color={T.brand} bgColor={T.brandDim} icon={BarChart2}
        />
        <SummaryCard
          label="Availability" value={`${avgAvail}%`} delta="+1.1%"
          color={T.success} bgColor={T.successDim} icon={Zap}
        />
        <SummaryCard
          label="Performance" value={`${avgPerf}%`} delta="-0.4%"
          color={T.warning} bgColor={T.warningDim} icon={Target}
        />
        <SummaryCard
          label="Quality" value={`${avgQual}%`} delta="+0.2%"
          color={T.neutral} bgColor={T.neutralDim} icon={ShieldCheck}
        />
      </div>

      {/* ── OEE Trend ── */}
      <div className="bg-white rounded-xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-text-primary">OEE Trend</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded" style={{ background: T.brand }} />
              <span className="font-mono text-2xs text-text-disabled">Actual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-px border-t-2 border-dashed" style={{ borderColor: T.success }} />
              <span className="font-mono text-2xs text-text-disabled">85% target</span>
            </div>
          </div>
        </div>
        <ReactECharts key={`oee-${range}`} option={oeeOpt} style={{ height: 200 }} opts={{ renderer: "svg" }} />
      </div>

      {/* ── Throughput + Quality ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-card">
          <h2 className="text-sm font-semibold text-text-primary mb-1">Production Throughput</h2>
          <p className="font-mono text-2xs text-text-disabled mb-1">Parts / period · vs planned 130/hr</p>
          <ReactECharts key={`through-${range}`} option={throughOpt} style={{ height: 190 }} opts={{ renderer: "svg" }} />
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <h2 className="text-sm font-semibold text-text-primary mb-1">Quality Rate</h2>
          <p className="font-mono text-2xs text-text-disabled mb-1">First-pass yield · reject overlay</p>
          <ReactECharts key={`qual-${range}`} option={qualOpt} style={{ height: 190 }} opts={{ renderer: "svg" }} />
        </div>
      </div>

      {/* ── OEE Heatmap ── */}
      <div className="bg-white rounded-xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-text-primary">OEE Heatmap — Machines × Time</h2>
          <span className="font-mono text-2xs text-text-disabled">Today · hourly resolution</span>
        </div>
        <p className="font-mono text-2xs text-text-disabled mb-2">Red = low OEE · Coral = on-target</p>
        <ReactECharts option={machineHeatmapOption()} style={{ height: 180 }} opts={{ renderer: "svg" }} />
      </div>

      {/* ── Downtime Pareto ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 pb-8">
        <div className="lg:col-span-3 bg-white rounded-xl p-5 shadow-card">
          <h2 className="text-sm font-semibold text-text-primary mb-1">Downtime Pareto</h2>
          <p className="font-mono text-2xs text-text-disabled mb-1">Duration by category · cumulative %</p>
          <ReactECharts option={paretoOption()} style={{ height: 220 }} opts={{ renderer: "svg" }} />
        </div>

        {/* Machine performance table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-xs font-bold text-text-primary">Machine Performance</h2>
          </div>
          <div className="divide-y divide-border">
            <div className="grid grid-cols-5 px-5 py-2.5 bg-bg-subtle">
              {["Machine","OEE","A","P","Q"].map((h) => (
                <span key={h} className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{h}</span>
              ))}
            </div>
            {MACHINES.map((m) => {
              const c = oeeColor(m.oee);
              return (
                <div key={m.id} className="grid grid-cols-5 items-center px-5 py-3 hover:bg-bg-subtle transition-colors">
                  <div className="min-w-0 col-span-1">
                    <p className="font-mono text-xs font-bold text-text-primary">{m.id}</p>
                    <p className="font-sans text-2xs text-text-disabled truncate">{m.name.split("-").slice(-2).join("-")}</p>
                  </div>
                  <span className="font-mono text-xs font-black tabular-nums" style={{ color: c }}>
                    {(m.oee * 100).toFixed(0)}%
                  </span>
                  <span className="font-mono text-xs text-text-secondary tabular-nums">{(m.avail * 100).toFixed(0)}%</span>
                  <span className="font-mono text-xs text-text-secondary tabular-nums">{(m.perf  * 100).toFixed(0)}%</span>
                  <span className="font-mono text-xs text-text-secondary tabular-nums">{(m.qual  * 100).toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-border bg-bg-subtle">
            <div className="grid grid-cols-5">
              <span className="font-mono text-2xs text-text-disabled col-span-1">Floor avg</span>
              <span className="font-mono text-xs font-black tabular-nums" style={{ color: T.brand }}>
                {avgOEE}%
              </span>
              <span className="font-mono text-xs font-semibold text-text-secondary tabular-nums">{avgAvail}%</span>
              <span className="font-mono text-xs font-semibold text-text-secondary tabular-nums">{avgPerf}%</span>
              <span className="font-mono text-xs font-semibold text-text-secondary tabular-nums">{avgQual}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
