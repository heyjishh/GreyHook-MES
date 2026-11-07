"use client";

import { useState } from "react";
import ReactECharts from "echarts-for-react";
import { ShieldCheck, AlertTriangle, TrendingDown, TrendingUp, CheckCircle2, XCircle } from "lucide-react";

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

function seededRand(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function spcData(mean: number, sigma: number, n: number, seed = 42) {
  const rand = seededRand(seed);
  return Array.from({ length: n }, (_, i) => {
    const drift = i > 60 ? (i - 60) * 0.004 : 0;
    return +(mean + drift + (rand() - 0.5) * 2 * sigma).toFixed(3);
  });
}

function xbarOption(machine: string) {
  const mean  = 25.000;
  const sigma = 0.012;
  const ucl   = mean + 3 * sigma;
  const lcl   = mean - 3 * sigma;
  const data  = spcData(mean, sigma, 80, machine === "M-01" ? 42 : machine === "M-04" ? 11 : 77);
  const xs    = data.map((_, i) => i + 1);
  const outOfControl = data.map((v, i) => v > ucl || v < lcl ? { value: [i + 1, v], itemStyle: { color: T.danger, symbolSize: 8 } } : null).filter(Boolean);

  return {
    grid: { top: 24, bottom: 32, left: 56, right: 20 },
    xAxis: {
      type: "category", data: xs,
      axisLine: { lineStyle: { color: T.border } }, axisTick: { show: false },
      axisLabel: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono", interval: 9 },
    },
    yAxis: {
      type: "value",
      min: +(lcl - sigma).toFixed(3), max: +(ucl + sigma).toFixed(3),
      axisLabel: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
      splitLine: { lineStyle: { color: T.grid, type: "dashed" } },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [
      {
        name: "Measurement", type: "line", data, smooth: false, symbol: "circle",
        symbolSize: 4,
        lineStyle: { width: 1.5, color: T.brand },
        itemStyle: { color: T.brand },
        markLine: {
          silent: true, symbol: "none",
          label: { fontSize: 10, fontFamily: "IBM Plex Mono" },
          data: [
            { yAxis: ucl, lineStyle: { color: T.danger, type: "dashed", width: 1 }, label: { formatter: `UCL ${ucl.toFixed(3)}`, position: "insideStartTop", color: T.danger } },
            { yAxis: mean, lineStyle: { color: T.success, type: "solid", width: 1.5 }, label: { formatter: `CL ${mean.toFixed(3)}`, position: "insideStartTop", color: T.success } },
            { yAxis: lcl, lineStyle: { color: T.danger, type: "dashed", width: 1 }, label: { formatter: `LCL ${lcl.toFixed(3)}`, position: "insideStartBottom", color: T.danger } },
          ],
        },
      },
      {
        name: "OOC", type: "scatter", data: outOfControl,
        symbolSize: 8, itemStyle: { color: T.danger },
      },
    ],
    tooltip: {
      trigger: "axis", backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 8,
      textStyle: { color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono" },
      formatter: (p: { name: string; value: number }[]) => `Sample ${p[0].name}: <b>${p[0].value} mm</b>`,
    },
    animation: false,
  };
}

function paretoDefectOption() {
  const defects = [
    { cat: "Dimensional",    count: 42 },
    { cat: "Surface Finish", count: 28 },
    { cat: "Porosity",       count: 17 },
    { cat: "Burr",           count: 11 },
    { cat: "Wrong Part",     count:  6 },
    { cat: "Other",          count:  4 },
  ].sort((a, b) => b.count - a.count);

  const total = defects.reduce((s, d) => s + d.count, 0);
  let cum = 0;
  const cumPct = defects.map(d => { cum += d.count; return +(cum / total * 100).toFixed(1); });

  return {
    grid: { top: 16, bottom: 60, left: 48, right: 56 },
    xAxis: {
      type: "category", data: defects.map(d => d.cat),
      axisLine: { lineStyle: { color: T.border } }, axisTick: { show: false },
      axisLabel: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono", rotate: 20 },
    },
    yAxis: [
      {
        type: "value", name: "Count",
        nameTextStyle: { color: T.muted, fontSize: 10, fontFamily: "IBM Plex Mono" },
        axisLabel: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
        splitLine: { lineStyle: { color: T.grid, type: "dashed" } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      {
        type: "value", min: 0, max: 100, name: "Cum %",
        nameTextStyle: { color: T.muted, fontSize: 10, fontFamily: "IBM Plex Mono" },
        axisLabel: { formatter: (v: number) => `${v}%`, fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
        splitLine: { show: false }, axisLine: { show: false }, axisTick: { show: false },
      },
    ],
    series: [
      {
        name: "Count", type: "bar", data: defects.map(d => d.count),
        itemStyle: { borderRadius: [3,3,0,0] },
        colorBy: "data",
        color: [T.danger, T.brand, T.warning, "#B86A00", T.neutral, T.disabled],
        barMaxWidth: 48,
      },
      {
        name: "Cumulative %", type: "line", yAxisIndex: 1, data: cumPct,
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

function cpkGaugeOption(cpk: number) {
  const color = cpk >= 1.67 ? T.success : cpk >= 1.33 ? T.brand : cpk >= 1.0 ? T.warning : T.danger;
  return {
    series: [{
      type: "gauge",
      center: ["50%","65%"],
      radius: "88%",
      startAngle: 200, endAngle: -20,
      min: 0, max: 2.5,
      splitNumber: 5,
      axisLine: {
        lineStyle: {
          width: 10,
          color: [[0.4, T.danger+"AA"],[0.53, T.warning+"AA"],[0.67, T.brand+"AA"],[1, T.success+"AA"]],
        },
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { fontSize: 9, color: T.muted, fontFamily: "IBM Plex Mono", distance: 12 },
      pointer: { width: 4, length: "60%", itemStyle: { color } },
      detail: {
        offsetCenter: [0, "20%"],
        fontSize: 22, fontWeight: 700, fontFamily: "IBM Plex Mono",
        formatter: cpk.toFixed(2), color,
      },
      title: {
        offsetCenter: [0,"55%"],
        fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono",
        formatter: "Cpk",
      },
      data: [{ value: cpk }],
    }],
    animation: false,
  };
}

const MACHINES = ["M-01","M-02","M-03","M-04"];
const MACHINE_NAMES: Record<string, string> = {
  "M-01": "AP-ENGINE-MOUNT-V2",
  "M-02": "AP-FRAME-WELD-01",
  "M-03": "AP-PRESS-FORM-03",
  "M-04": "AP-ASSEM-LINE-A",
};
const MACHINE_CPK: Record<string, number> = {
  "M-01": 1.52, "M-02": 1.21, "M-03": 0.94, "M-04": 1.78,
};
const MACHINE_FPY: Record<string, number> = {
  "M-01": 94.6, "M-02": 91.7, "M-03": 88.4, "M-04": 97.1,
};
const MACHINE_OOC: Record<string, number> = {
  "M-01": 2, "M-02": 5, "M-03": 11, "M-04": 1,
};

const INSPECTIONS = [
  { id:"INS-312", order:"WO-2024-091", machine:"M-01", inspector:"Priya Mehta",  time:"03:12", result:"pass",   checked:50, rejected:0,  note:"Within spec" },
  { id:"INS-311", order:"WO-2024-092", machine:"M-02", inspector:"Arjun Nair",   time:"02:48", result:"pass",   checked:30, rejected:2,  note:"2 surface finish defects" },
  { id:"INS-310", order:"WO-2024-091", machine:"M-01", inspector:"Priya Mehta",  time:"01:30", result:"pass",   checked:50, rejected:1,  note:"1 dimensional OOT" },
  { id:"INS-309", order:"WO-2024-093", machine:"M-03", inspector:"Arjun Nair",   time:"00:50", result:"fail",   checked:20, rejected:4,  note:"Porosity detected – batch hold" },
  { id:"INS-308", order:"WO-2024-094", machine:"M-04", inspector:"Kiran Desai",  time:"00:10", result:"pass",   checked:25, rejected:0,  note:"Excellent quality" },
];

export default function QualityPage() {
  const [selectedMachine, setSelectedMachine] = useState("M-01");
  const cpk = MACHINE_CPK[selectedMachine];
  const fpy = MACHINE_FPY[selectedMachine];
  const ooc = MACHINE_OOC[selectedMachine];

  return (
    <div className="max-w-[1280px] mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Quality Control</h1>
        <p className="font-mono text-xs text-text-tertiary mt-0.5">SPC · Cpk · defect Pareto · inspection log</p>
      </div>

      {/* Floor-level FPY cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {MACHINES.map((m) => {
          const f = MACHINE_FPY[m];
          const c = MACHINE_CPK[m];
          const color = f >= 97 ? T.success : f >= 93 ? T.brand : f >= 90 ? T.warning : T.danger;
          const bg    = f >= 97 ? T.successDim : f >= 93 ? T.brandDim : f >= 90 ? T.warningDim : T.dangerDim;
          return (
            <button
              key={m}
              onClick={() => setSelectedMachine(m)}
              className="bg-white rounded-xl p-4 shadow-card text-left transition-all"
              style={{ outline: selectedMachine === m ? `2px solid ${T.brand}` : "none", outlineOffset: 2 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-text-primary">{m}</span>
                <span className="font-mono text-2xs text-text-disabled">{MACHINE_NAMES[m].split("-").slice(-2).join("-")}</span>
              </div>
              <p className="font-mono text-2xl font-black tabular-nums leading-none" style={{ color }}>{f}%</p>
              <p className="font-mono text-2xs text-text-disabled mt-1 mb-2">FPY</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xs rounded px-1.5 py-0.5" style={{ background: bg, color }}>
                  Cpk {c.toFixed(2)}
                </span>
                {MACHINE_OOC[m] > 0 && (
                  <span className="font-mono text-2xs rounded px-1.5 py-0.5" style={{ background: T.dangerDim, color: T.danger }}>
                    {MACHINE_OOC[m]} OOC
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* SPC + Cpk */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-text-primary">
              SPC — X̄ Chart · {MACHINE_NAMES[selectedMachine]}
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-6 border-t border-dashed" style={{ borderColor: T.danger }} />
                <span className="font-mono text-2xs text-text-disabled">UCL / LCL</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 border-t-2" style={{ borderColor: T.success }} />
                <span className="font-mono text-2xs text-text-disabled">Center</span>
              </div>
              {ooc > 0 && (
                <span className="font-mono text-2xs text-danger font-bold">{ooc} OOC signals</span>
              )}
            </div>
          </div>
          <p className="font-mono text-2xs text-text-disabled mb-2">
            Dimension: Bore Ø 25.000mm · Tolerance: ±0.036 mm
          </p>
          <ReactECharts key={selectedMachine} option={xbarOption(selectedMachine)} style={{ height: 220 }} opts={{ renderer: "svg" }} />
        </div>

        <div className="bg-white rounded-xl p-4 shadow-card flex flex-col items-center justify-center">
          <h2 className="text-xs font-semibold text-text-primary self-start mb-1">Process Capability</h2>
          <p className="font-mono text-2xs text-text-disabled self-start mb-3">
            {cpk >= 1.67 ? "Excellent" : cpk >= 1.33 ? "Adequate" : cpk >= 1.0 ? "Marginal" : "⚠ Incapable"}
          </p>
          <ReactECharts key={`cpk-${selectedMachine}`} option={cpkGaugeOption(cpk)} style={{ height: 160, width: "100%" }} opts={{ renderer: "svg" }} />
          <div className="w-full border-t border-border pt-3 mt-2 space-y-1.5">
            {[
              { label: "FPY",       v: `${fpy}%`,           color: fpy >= 97 ? T.success : T.warning },
              { label: "OOC Points",v: ooc.toString(),       color: ooc === 0 ? T.success : T.danger },
              { label: "Sigma",     v: "0.012 mm",          color: T.text },
            ].map(({ label, v, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="font-mono text-2xs text-text-disabled">{label}</span>
                <span className="font-mono text-xs font-bold" style={{ color }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Defect Pareto + Inspection Log */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-card">
          <h2 className="text-sm font-semibold text-text-primary mb-1">Defect Pareto</h2>
          <p className="font-mono text-2xs text-text-disabled mb-2">All machines · current shift · 108 total defects</p>
          <ReactECharts option={paretoDefectOption()} style={{ height: 240 }} opts={{ renderer: "svg" }} />
        </div>

        <div className="lg:col-span-3 bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-bold text-text-primary">Inspection Log</h2>
            <span className="font-mono text-2xs text-text-disabled">Today · Shift 2</span>
          </div>
          <div className="divide-y divide-border">
            <div className="grid grid-cols-[6rem_6rem_5rem_4rem_1fr_4rem] gap-3 px-5 py-2.5 bg-bg-subtle">
              {["Lot ID","Order","Machine","Inspector","Note","Result"].map((h) => (
                <span key={h} className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{h}</span>
              ))}
            </div>
            {INSPECTIONS.map((ins) => (
              <div key={ins.id} className="grid grid-cols-[6rem_6rem_5rem_4rem_1fr_4rem] gap-3 items-center px-5 py-3 hover:bg-bg-subtle transition-colors">
                <span className="font-mono text-xs font-bold text-text-primary">{ins.id}</span>
                <span className="font-mono text-xs text-text-secondary">{ins.order}</span>
                <span className="font-mono text-xs text-text-secondary">{ins.machine}</span>
                <span className="font-sans text-xs text-text-secondary truncate">{ins.inspector.split(" ")[0]}</span>
                <span className="font-sans text-xs text-text-secondary truncate">{ins.note}</span>
                <span
                  className="inline-flex items-center gap-1 font-mono text-2xs font-semibold rounded-full px-2 py-0.5"
                  style={{ background: ins.result === "pass" ? T.successDim : T.dangerDim, color: ins.result === "pass" ? T.success : T.danger }}
                >
                  {ins.result === "pass" ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                  {ins.result}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quality alerts */}
      <div className="space-y-2 pb-8">
        <h2 className="text-sm font-semibold text-text-primary">Active Quality Alerts</h2>
        {[
          { level:"critical", machine:"M-03", msg:"Batch hold — INS-309 porosity defect rate 20% exceeds 5% limit. Work order WO-2024-093 paused.", time:"00:50" },
          { level:"warning",  machine:"M-02", msg:"11 OOC signals detected on SPC chart in last 2 hours. Trend drifting +σ. Review tooling.", time:"02:30" },
          { level:"info",     machine:"M-01", msg:"1 dimensional OOT in lot INS-310. Within acceptable limits. No action required.", time:"01:30" },
        ].map(({ level, machine, msg, time }) => {
          const cfg = level === "critical"
            ? { color: T.danger, bg: T.dangerDim, icon: XCircle }
            : level === "warning"
              ? { color: T.warning, bg: T.warningDim, icon: AlertTriangle }
              : { color: T.success, bg: T.successDim, icon: CheckCircle2 };
          const Icon = cfg.icon;
          return (
            <div key={time + machine} className="flex items-start gap-3 bg-white rounded-xl px-5 py-4 shadow-card">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                <Icon size={14} style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-xs font-bold" style={{ color: cfg.color }}>{machine}</span>
                  <span className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{level}</span>
                </div>
                <p className="font-sans text-xs text-text-secondary">{msg}</p>
              </div>
              <span className="font-mono text-2xs text-text-disabled shrink-0">{time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
