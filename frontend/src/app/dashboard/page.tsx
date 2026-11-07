"use client";

import { useEffect, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import { ProductionProgress } from "@/components/ui/ProductionProgress";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { createMachineStatusStream } from "@/lib/sse";
import {
  useMachineStatuses,
  useCurrentProduction,
  useFactory,
  useDowntimeEvents,
} from "@/hooks/api";
import type { MachineState, MachineStatusSchema } from "@/types/api";
import { MOCK_FACTORY_ID } from "@/lib/mock-data";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, Activity, Zap, Target, Clock, ArrowUpRight,
  ChevronRight, Settings2,
} from "lucide-react";
import { INDUSTRY_CONFIGS, type IndustryConfig } from "@/lib/industry-config";
import { useIndustryStore } from "@/store/industry";
import Link from "next/link";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

const T = {
  brand:    "#F05230",
  brandDim: "#FEF0EB",
  success:  "#1A7A40",
  successDim:"#E8F5EC",
  warning:  "#A85E00",
  warningDim:"#FEF0D6",
  danger:   "#CC1800",
  dangerDim: "#FDE8E4",
  border:   "#E8E4DF",
  text:     "#001C2E",
  secondary:"#2A4A60",
  muted:    "#6A8A9A",
  disabled: "#B0C4CE",
  bg:       "#FFFFFF",
  bgSubtle: "#FAFAF8",
  bgMuted:  "#F4F0EC",
  grid:     "#F0ECE8",
  axis:     "#B0C4CE",
};

const MACHINE_DATA: Record<string, {
  oee: number; parts: number;
  availability: number; performance: number; quality: number;
  trend: number[];
}> = {
  "10000000-0000-0000-0000-000000000001": {
    oee: 0.767, parts: 148, availability: 0.92, performance: 0.87, quality: 0.96,
    trend: [0.71, 0.74, 0.77, 0.75, 0.78, 0.76, 0.77],
  },
  "10000000-0000-0000-0000-000000000002": {
    oee: 0.588, parts: 72,  availability: 0.78, performance: 0.82, quality: 0.92,
    trend: [0.64, 0.61, 0.59, 0.60, 0.58, 0.59, 0.59],
  },
  "10000000-0000-0000-0000-000000000003": {
    oee: 0.440, parts: 31,  availability: 0.61, performance: 0.79, quality: 0.91,
    trend: [0.50, 0.47, 0.45, 0.43, 0.44, 0.44, 0.44],
  },
  "10000000-0000-0000-0000-000000000004": {
    oee: 0.874, parts: 312, availability: 0.96, performance: 0.94, quality: 0.97,
    trend: [0.86, 0.87, 0.88, 0.87, 0.87, 0.88, 0.87],
  },
};

function oeeColor(oee: number) {
  if (oee >= 0.85) return T.brand;
  if (oee >= 0.65) return T.warning;
  if (oee >= 0.5)  return "#B86A00";
  return T.danger;
}

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function trendOption(avg: number) {
  const labels = ["00","02","04","06","08","10","12","14","16","18","20","22"];
  const data   = labels.map((_, i) => +(avg + Math.sin(i * 0.6) * 0.04 + (Math.random() - 0.5) * 0.03).toFixed(3));
  const shiftX = ["00", "08", "16"];
  return {
    grid: { top: 16, bottom: 32, left: 48, right: 20 },
    xAxis: {
      type: "category", data: labels,
      axisLine: { lineStyle: { color: T.border } },
      axisTick: { show: false },
      axisLabel: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
    },
    yAxis: {
      type: "value", min: 0.3, max: 1,
      axisLabel: {
        formatter: (v: number) => `${(v * 100).toFixed(0)}%`,
        fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono",
      },
      splitLine: { lineStyle: { color: T.grid, width: 1, type: "dashed" } },
      axisLine: { show: false }, axisTick: { show: false },
    },
    markLine: {
      silent: true,
      symbol: "none",
      lineStyle: { color: T.border, type: "dashed", width: 1 },
      data: shiftX.map(x => ({ xAxis: x })),
    },
    series: [{
      type: "line", data, smooth: 0.4, symbol: "none",
      lineStyle: { width: 2.5, color: T.brand, shadowColor: T.brand + "30", shadowBlur: 6 },
      areaStyle: {
        color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: T.brand + "1A" },
            { offset: 1, color: T.brand + "00" },
          ],
        },
      },
    }],
    tooltip: {
      trigger: "axis",
      backgroundColor: T.bg,
      borderColor: T.border,
      borderWidth: 1,
      borderRadius: 8,
      textStyle: { color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono" },
      formatter: (p: { value: number }[]) => `OEE ${(p[0].value * 100).toFixed(1)}%`,
    },
    animation: true,
  };
}

function oeeBreakdownOption(machines: MachineStatusSchema[]) {
  const names = machines.map((m) => m.name.split(" ").slice(-2).join("\n"));
  const avail = machines.map((m) => +((MACHINE_DATA[m.machine_id]?.availability ?? 0) * 100).toFixed(1));
  const perf  = machines.map((m) => +((MACHINE_DATA[m.machine_id]?.performance  ?? 0) * 100).toFixed(1));
  const qual  = machines.map((m) => +((MACHINE_DATA[m.machine_id]?.quality      ?? 0) * 100).toFixed(1));

  return {
    grid: { top: 8, bottom: 32, left: 44, right: 16 },
    legend: { show: false },
    xAxis: {
      type: "category", data: names,
      axisLine: { lineStyle: { color: T.border } },
      axisTick: { show: false },
      axisLabel: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono", lineHeight: 14 },
    },
    yAxis: {
      type: "value", min: 0, max: 100,
      axisLabel: { formatter: (v: number) => `${v}%`, fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
      splitLine: { lineStyle: { color: T.grid, type: "dashed" } },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [
      {
        name: "Avail", type: "bar", data: avail, barWidth: 10, barGap: "30%",
        itemStyle: { color: T.brand, borderRadius: [3,3,0,0] },
      },
      {
        name: "Perf", type: "bar", data: perf, barWidth: 10, barGap: "30%",
        itemStyle: { color: T.warning, borderRadius: [3,3,0,0] },
      },
      {
        name: "Qual", type: "bar", data: qual, barWidth: 10, barGap: "30%",
        itemStyle: { color: T.success, borderRadius: [3,3,0,0] },
      },
    ],
    tooltip: {
      trigger: "axis",
      backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 8,
      textStyle: { color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono" },
      formatter: (params: { seriesName: string; value: number }[]) =>
        params.map((p) => `${p.seriesName}: <b>${p.value}%</b>`).join("<br/>"),
    },
    animation: true,
  };
}

function miniSparkOption(trend: number[], color: string) {
  return {
    grid: { top: 2, bottom: 2, left: 2, right: 2 },
    xAxis: { type: "category", show: false },
    yAxis: { type: "value", show: false, min: Math.min(...trend) - 0.05, max: Math.max(...trend) + 0.05 },
    series: [{
      type: "line", data: trend, smooth: 0.5, symbol: "none",
      lineStyle: { width: 1.5, color },
      areaStyle: { color: color + "1A" },
    }],
    animation: false,
  };
}

function oeeWaterfallOption() {
  const steps = [
    { name: "Available\nTime",    value: 480,  type: "total",  color: T.disabled },
    { name: "Planned\nStops",     value: -55,  type: "loss",   color: T.warning  },
    { name: "Unplanned\nDown",    value: -82,  type: "loss",   color: T.danger   },
    { name: "Perf\nLoss",         value: -38,  type: "loss",   color: "#B86A00"  },
    { name: "Quality\nLoss",      value: -18,  type: "loss",   color: T.brand    },
    { name: "Productive\nTime",   value: 287,  type: "total",  color: T.success  },
  ];

  let base = 0;
  const barData = steps.map((s) => {
    if (s.type === "total") {
      base = s.value > 0 ? 0 : base;
      const v = Math.abs(s.value);
      base = s.name.startsWith("Productive") ? 0 : v;
      return { value: [0, v], color: s.color, label: `${v} min` };
    }
    const start = base + s.value;
    const end   = base;
    base = start;
    return { value: [start, end], color: s.color, label: `${Math.abs(s.value)} min` };
  });

  return {
    grid: { top: 24, bottom: 44, left: 56, right: 16 },
    xAxis: {
      type: "category",
      data: steps.map((s) => s.name),
      axisLine: { lineStyle: { color: T.border } }, axisTick: { show: false },
      axisLabel: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono", lineHeight: 14, interval: 0 },
    },
    yAxis: {
      type: "value", min: 0, max: 500,
      axisLabel: { formatter: (v: number) => `${v}m`, fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
      splitLine: { lineStyle: { color: T.grid, type: "dashed" } },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [{
      type: "bar",
      data: barData.map((b) => ({
        value: b.value,
        itemStyle: { color: b.color + "CC", borderRadius: b.value[0] === 0 ? [4,4,0,0] : [3,3,0,0] },
        label: { show: true, position: b.value[0] === 0 ? "top" : "inside", fontSize: 9, fontFamily: "IBM Plex Mono", color: b.value[0] === 0 ? T.muted : "#fff", formatter: () => b.label },
      })),
      barMaxWidth: 48,
    }],
    tooltip: {
      trigger: "axis", backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 8,
      textStyle: { color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono" },
      formatter: (p: { name: string; value: [number, number] }[]) => {
        const d = p[0];
        const dur = Math.abs(d.value[1] - d.value[0]);
        return `${d.name.replace("\n"," ")}: <b>${dur} min</b>`;
      },
    },
    animation: false,
  };
}

function StateDot({ state }: { state: MachineState }) {
  const color = {
    running: T.success,
    idle:    T.warning,
    fault:   T.danger,
    offline: T.disabled,
  }[state] ?? T.disabled;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center w-2.5 h-2.5">
      <span className="w-2 h-2 rounded-full block" style={{ backgroundColor: color }} />
      {state === "running" && (
        <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: color, opacity: 0.3 }} />
      )}
    </span>
  );
}

function KPICard({
  label, value, sub, color, bgColor, trend, icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  bgColor: string;
  trend?: "up" | "down" | "flat";
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? T.success : trend === "down" ? T.danger : T.disabled;
  return (
    <div className="bg-white rounded-xl p-4 shadow-card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-2xs text-text-tertiary uppercase tracking-widest">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bgColor }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="font-mono text-2xl font-black leading-none tabular-nums" style={{ color }}>{value}</span>
        {trend && (
          <TrendIcon size={14} style={{ color: trendColor }} className="mb-0.5" />
        )}
      </div>
      {sub && <span className="font-mono text-2xs text-text-disabled">{sub}</span>}
    </div>
  );
}

function MachineCard({ machine }: { machine: MachineStatusSchema }) {
  const d = MACHINE_DATA[machine.machine_id];
  if (!d) return null;
  const col = oeeColor(d.oee);
  const stateBg = {
    running: T.successDim,
    idle:    T.warningDim,
    fault:   T.dangerDim,
    offline: T.bgMuted,
  }[machine.current_state] ?? T.bgMuted;
  const stateColor = {
    running: T.success,
    idle:    T.warning,
    fault:   T.danger,
    offline: T.disabled,
  }[machine.current_state] ?? T.disabled;

  return (
    <a
      href={`/dashboard/machines/${machine.machine_id}`}
      className="bg-white rounded-xl p-4 shadow-card hover:shadow-card-hover group transition-all duration-200 block"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-xs font-bold text-text-primary truncate leading-tight">{machine.name}</p>
          <span
            className="inline-flex items-center gap-1 mt-1.5 rounded-full px-2 py-0.5 font-mono text-2xs font-semibold uppercase tracking-wide"
            style={{ background: stateBg, color: stateColor }}
          >
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: stateColor }} />
            {machine.current_state}
          </span>
        </div>
        <div className="text-right shrink-0 ml-2">
          <p className="font-mono text-lg font-black leading-none tabular-nums" style={{ color: col }}>
            {(d.oee * 100).toFixed(0)}%
          </p>
          <p className="font-mono text-2xs text-text-disabled mt-0.5">OEE</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-2xs text-text-disabled">OEE</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${d.oee * 100}%`, backgroundColor: col }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-border">
        {[
          { label: "Avail", v: `${(d.availability * 100).toFixed(0)}%` },
          { label: "Perf",  v: `${(d.performance  * 100).toFixed(0)}%` },
          { label: "Parts", v: d.parts.toLocaleString() },
        ].map(({ label, v }) => (
          <div key={label}>
            <p className="font-mono text-xs font-bold text-text-secondary tabular-nums">{v}</p>
            <p className="font-mono text-2xs text-text-disabled uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-2 h-8 opacity-60 group-hover:opacity-100 transition-opacity">
        <ReactECharts option={miniSparkOption(d.trend, col)} style={{ height: 32 }} opts={{ renderer: "svg" }} />
      </div>
    </a>
  );
}

function IndustryKPIRow({ industry }: { industry: IndustryConfig }) {
  const icons = [Activity, CheckCircle2, TrendingUp, AlertTriangle];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {industry.kpis.map((kpi, i) => {
        const Icon = icons[i] ?? Activity;
        const trendUp = kpi.trend === "up";
        const trendDown = kpi.trend === "down";
        const isGood = kpi.trend === kpi.trendGood;
        const color = isGood ? T.success : kpi.trend === "flat" ? T.brand : T.danger;
        const TrendIcon = trendUp ? TrendingUp : trendDown ? TrendingDown : Minus;
        return (
          <div key={kpi.label} className="bg-white rounded-xl p-4 shadow-card flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xs text-text-tertiary uppercase tracking-widest">{kpi.label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: industry.color + "15" }}>
                <Icon size={14} style={{ color: industry.color }} />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="font-mono text-2xl font-black leading-none tabular-nums" style={{ color }}>{kpi.value}</span>
              {kpi.trend !== "flat" && <TrendIcon size={14} style={{ color }} className="mb-0.5" />}
            </div>
            <span className="font-mono text-2xs text-text-disabled">{kpi.sub}</span>
          </div>
        );
      })}
    </div>
  );
}

function IndustryProductionCard({ industry }: { industry: IndustryConfig }) {
  const o = industry.activeOrder;
  const pct = Math.min(100, (o.actual / o.planned) * 100);
  const good = Math.round(o.actual * (1 - o.rejectedPct));
  const rejected = o.actual - good;
  const isAhead = o.actual >= o.planned * o.elapsedPct;
  return (
    <div className="bg-white rounded-xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-text-primary">Current {industry.term.workOrder}</h2>
        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: T.successDim, color: T.success }}>
          {((good / Math.max(o.actual, 1)) * 100).toFixed(1)}% quality
        </span>
      </div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <p className="font-mono text-2xs text-text-disabled truncate">{o.orderNo}</p>
          <p className="text-base font-bold text-text-primary truncate mt-0.5">{o.product}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-lg font-black tabular-nums" style={{ color: industry.color }}>{o.estimatedDone}</p>
          <p className="font-mono text-2xs text-text-tertiary uppercase tracking-widest">Est. done</p>
        </div>
      </div>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-2xs text-text-disabled">{o.actual.toLocaleString()} / {o.planned.toLocaleString()} {o.unit}</span>
          <span className="font-mono text-2xs text-text-disabled">{pct.toFixed(0)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-bg-muted overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: isAhead ? T.success : T.warning }} />
        </div>
        <p className="font-mono text-2xs mt-1" style={{ color: isAhead ? T.success : T.warning }}>
          {isAhead ? "▲ On track" : `▼ Behind pace by ${Math.round(o.planned * o.elapsedPct - o.actual).toLocaleString()} ${o.unit}`}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-6 pt-4 border-t border-border">
        {[
          { label: "Good",    v: good.toLocaleString(),     color: T.success },
          { label: "Reject",  v: rejected.toLocaleString(), color: T.danger  },
          { label: "Elapsed", v: `${(o.elapsedPct * 100).toFixed(0)}%`, color: industry.color },
        ].map(({ label, v, color }) => (
          <div key={label}>
            <p className="font-mono text-2xl font-black leading-none tabular-nums" style={{ color }}>{v}</p>
            <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mt-1.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function IndustryMachineGrid({ industry }: { industry: IndustryConfig }) {
  const STATE_COLOR: Record<string, string> = { running: T.success, idle: T.warning, fault: T.danger, setup: T.brand };
  const STATE_BG: Record<string, string> = { running: T.successDim, idle: T.warningDim, fault: T.dangerDim, setup: T.brandDim };
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {industry.machines.map((m) => {
        const col = oeeColor(m.oee / 100);
        const sc = STATE_COLOR[m.state] ?? T.disabled;
        const sb = STATE_BG[m.state] ?? T.bgMuted;
        const pct = Math.min(100, (m.partsThisShift / Math.max(m.targetThisShift, 1)) * 100);
        return (
          <div key={m.id} className="bg-white rounded-xl p-4 shadow-card hover:shadow-card-hover transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1">
                <p className="font-sans text-xs font-bold text-text-primary truncate leading-tight">{m.name}</p>
                <span className="inline-flex items-center gap-1 mt-1.5 rounded-full px-2 py-0.5 font-mono text-2xs font-semibold uppercase tracking-wide"
                  style={{ background: sb, color: sc }}>
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: sc }} />
                  {m.state}
                </span>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="font-mono text-lg font-black leading-none tabular-nums" style={{ color: m.oee > 0 ? col : T.disabled }}>
                  {m.oee > 0 ? `${m.oee}%` : "—"}
                </p>
                <p className="font-mono text-2xs text-text-disabled mt-0.5">OEE</p>
              </div>
            </div>
            <p className="font-sans text-2xs text-text-disabled truncate mb-2">{m.currentOp}</p>
            <div className="w-full h-1.5 rounded-full bg-bg-muted overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: sc }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xs text-text-secondary font-bold">{m.partsThisShift.toLocaleString()}</span>
              <span className="font-mono text-2xs text-text-disabled">/ {m.targetThisShift.toLocaleString()} {m.unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IndustryInsightPanel({ industry }: { industry: IndustryConfig }) {
  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden flex flex-col">
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
        <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: industry.color + "15" }}>
          <Zap size={11} style={{ color: industry.color }} />
        </div>
        <h2 className="text-xs font-bold text-text-primary">AI Floor Insights</h2>
        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-2xs rounded-full px-2 py-0.5" style={{ background: T.successDim, color: T.success }}>Live</span>
          <span className="font-mono text-2xs text-text-disabled">{industry.name}</span>
        </div>
      </div>
      <div className="flex-1 divide-y divide-border">
        {industry.insights.map(({ level, title, body }) => {
          const cfg = level === "critical"
            ? { dot: T.danger,  color: T.danger  }
            : level === "warning"
              ? { dot: T.warning, color: T.warning }
              : { dot: T.success, color: T.success };
          return (
            <div key={title} className="px-5 py-3.5">
              <div className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: cfg.dot }} />
                <div className="min-w-0">
                  <p className="font-sans text-xs font-bold text-text-primary leading-snug">{title}</p>
                  <p className="font-sans text-2xs text-text-secondary mt-1 leading-relaxed">{body}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-5 py-3 border-t border-border bg-bg-subtle">
        <p className="font-mono text-2xs text-text-disabled">Read-only · AI cannot issue machine control</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { selectedIndustry } = useIndustryStore();
  const industry = INDUSTRY_CONFIGS[selectedIndustry];
  const user = typeof window !== "undefined"
    ? (() => { try { return JSON.parse(localStorage.getItem("greyhook-auth") ?? "{}"); } catch { return {}; } })()?.state?.user
    : null;
  const isAdmin = user?.role === "admin";

  const { data: factory }                                    = useFactory();
  const { data: statusData, isLoading: statusLoading }       = useMachineStatuses();
  const { data: production, isLoading: prodLoading }         = useCurrentProduction();
  const { data: downtimeEvents, isLoading: downtimeLoading } = useDowntimeEvents();
  const [liveStatuses, setLiveStatuses]                      = useState<Record<string, MachineState>>({});
  const [lastUpdated, setLastUpdated]                        = useState<Date>(new Date());
  const streamRef                                            = useRef<ReturnType<typeof createMachineStatusStream> | null>(null);
  const factoryId = IS_MOCK ? MOCK_FACTORY_ID : factory?.id;

  useEffect(() => {
    if (!factoryId || IS_MOCK) return;
    streamRef.current = createMachineStatusStream(factoryId, (ev) => {
      setLiveStatuses((p) => ({ ...p, [ev.machine_id]: ev.state }));
      setLastUpdated(new Date());
    });
    return () => { streamRef.current?.close(); };
  }, [factoryId]);

  const machines      = (statusData?.items ?? []) as MachineStatusSchema[];
  const resolved      = machines.map((m) => ({
    ...m,
    current_state: (liveStatuses[m.machine_id] ?? m.current_state) as MachineState,
  }));
  const known         = resolved.filter((m) => MACHINE_DATA[m.machine_id]);
  const avgOEE        = known.length
    ? known.reduce((s, m) => s + (MACHINE_DATA[m.machine_id]?.oee ?? 0), 0) / known.length
    : 0;
  const totalParts    = Object.values(MACHINE_DATA).reduce((s, m) => s + m.parts, 0);
  const runningCount  = resolved.filter((m) => m.current_state === "running").length;
  const openDowntime  = (downtimeEvents ?? []).filter((e) => !e.ended_at);
  const totalDownSec  = (downtimeEvents ?? [])
    .filter((e) => e.duration_seconds != null)
    .reduce((s, e) => s + (e.duration_seconds ?? 0), 0);
  const qualityRate   = production
    ? ((production.actual_qty - production.rejected_qty) / Math.max(production.actual_qty, 1)) * 100
    : null;

  const oeeCol = oeeColor(avgOEE);

  return (
    <div className="max-w-[1280px] mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-lg font-semibold text-text-primary leading-tight">
              {factory?.name ?? industry.factoryName}
            </h1>
            <Link
              href="/dashboard/industry-select"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-2xs font-bold border transition-colors hover:opacity-80"
              style={{ background: industry.color + "12", color: industry.color, borderColor: industry.color + "30" }}
            >
              <span>{industry.emoji}</span>
              <span>{industry.name}</span>
              <Settings2 size={10} className="opacity-60" />
            </Link>
          </div>
          <p className="font-mono text-xs text-text-tertiary">Shift 2 · Floor Overview</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <a
              href="/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-2xs font-semibold border transition-colors hover:bg-bg-subtle"
              style={{ borderColor: T.border, color: T.secondary }}
            >
              <Settings2 size={11} />
              Admin Console
            </a>
          )}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <div className="absolute inset-0 rounded-full bg-success animate-ping opacity-30" />
            </div>
            <span className="font-mono text-xs text-text-secondary uppercase tracking-widest">Live</span>
            <span className="font-mono text-xs text-text-disabled tabular-nums" suppressHydrationWarning>
              {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        </div>
      </div>

      {/* ── Industry KPI Row ── */}
      <IndustryKPIRow industry={industry} />

      {/* ── Industry Production + Insights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <IndustryProductionCard industry={industry} />
        </div>
        <div className="lg:col-span-3">
          <IndustryInsightPanel industry={industry} />
        </div>
      </div>

      {/* ── Industry Machine Grid ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-text-primary">{industry.term.machine} Floor</h2>
          <span className="font-mono text-2xs rounded-full px-2 py-0.5" style={{ background: industry.color + "12", color: industry.color }}>
            {industry.name}
          </span>
        </div>
        <IndustryMachineGrid industry={industry} />
      </div>

      {/* ── Shift Intelligence Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        {/* Shift target projection */}
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-2xs text-text-disabled uppercase tracking-widest">Shift Target</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: T.brandDim }}>
              <Target size={13} style={{ color: T.brand }} />
            </div>
          </div>
          {production ? (
            <>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-mono text-xl font-black tabular-nums" style={{ color: T.brand }}>
                  {production.actual_qty}
                </span>
                <span className="font-mono text-xs text-text-disabled">/ {production.planned_qty} target</span>
              </div>
              <div className="w-full h-2 rounded-full bg-bg-muted overflow-hidden mb-2">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min((production.actual_qty / production.planned_qty) * 100, 100)}%`,
                    background: production.actual_qty >= production.planned_qty * production.elapsed_pct
                      ? T.success : T.warning,
                  }}
                />
              </div>
              <p className="font-mono text-2xs" style={{
                color: production.actual_qty >= production.planned_qty * production.elapsed_pct
                  ? T.success : T.warning,
              }}>
                {production.actual_qty >= production.planned_qty * production.elapsed_pct
                  ? "▲ On track to hit target"
                  : `▼ ${Math.round(production.planned_qty * production.elapsed_pct - production.actual_qty)} units behind pace`}
              </p>
            </>
          ) : (
            <p className="font-mono text-xs text-text-disabled">No active order</p>
          )}
        </div>

        {/* Floor bottleneck */}
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-2xs text-text-disabled uppercase tracking-widest">Floor Constraint</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: T.dangerDim }}>
              <Zap size={13} style={{ color: T.danger }} />
            </div>
          </div>
          {(() => {
            const bottleneck = known.reduce((worst, m) =>
              (MACHINE_DATA[m.machine_id]?.oee ?? 1) < (MACHINE_DATA[worst.machine_id]?.oee ?? 1) ? m : worst,
              known[0]
            );
            if (!bottleneck) return <p className="font-mono text-xs text-text-disabled">No data</p>;
            const d = MACHINE_DATA[bottleneck.machine_id];
            const lowestMetric = d.availability <= d.performance && d.availability <= d.quality
              ? { name: "Availability", v: d.availability }
              : d.performance <= d.quality
                ? { name: "Performance", v: d.performance }
                : { name: "Quality",     v: d.quality };
            return (
              <>
                <p className="font-sans text-xs font-bold text-text-primary truncate">{bottleneck.name}</p>
                <div className="flex items-baseline gap-1.5 mt-1 mb-2">
                  <span className="font-mono text-xl font-black tabular-nums" style={{ color: oeeColor(d.oee) }}>
                    {(d.oee * 100).toFixed(0)}%
                  </span>
                  <span className="font-mono text-xs text-text-disabled">OEE</span>
                </div>
                <p className="font-mono text-2xs text-danger">
                  ▼ Low {lowestMetric.name}: {(lowestMetric.v * 100).toFixed(0)}%
                </p>
              </>
            );
          })()}
        </div>

        {/* Throughput velocity */}
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-2xs text-text-disabled uppercase tracking-widest">Parts / Hour</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: T.successDim }}>
              <Clock size={13} style={{ color: T.success }} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-mono text-xl font-black tabular-nums" style={{ color: T.success }}>
              {production ? Math.round(production.actual_qty / Math.max(production.elapsed_pct * 8, 0.5)) : "—"}
            </span>
            <span className="font-mono text-xs text-text-disabled">actual</span>
            <span className="font-mono text-xs text-text-disabled">/ 130 target</span>
          </div>
          <div className="w-full h-2 rounded-full bg-bg-muted overflow-hidden mb-2">
            {production && (
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min((Math.round(production.actual_qty / Math.max(production.elapsed_pct * 8, 0.5)) / 130) * 100, 100)}%`,
                  background: T.success,
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-1">
            <ArrowUpRight size={11} style={{ color: T.success }} />
            <p className="font-mono text-2xs text-success">+4 pts/hr vs yesterday</p>
          </div>
        </div>
      </div>

      {/* ── OEE Trend + Machine Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* OEE Trend */}
        <div className="lg:col-span-3 bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-text-primary">OEE Trend — 24h</h2>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xs text-text-disabled uppercase tracking-widest">Shifts: I·II·III</span>
              <span className="font-mono text-sm font-black tabular-nums" style={{ color: oeeCol }}>
                {avgOEE > 0 ? `${(avgOEE * 100).toFixed(1)}%` : "—"} avg
              </span>
            </div>
          </div>
          <ReactECharts option={trendOption(avgOEE || 0.72)} style={{ height: 170 }} opts={{ renderer: "svg" }} />
        </div>

        {/* OEE Component bars */}
        {known.length > 0 && (
          <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-text-primary">A·P·Q Breakdown</h2>
              <div className="flex items-center gap-3">
                {[
                  { label: "A", color: T.brand },
                  { label: "P", color: T.warning },
                  { label: "Q", color: T.success },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="font-mono text-2xs text-text-tertiary">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <ReactECharts option={oeeBreakdownOption(known)} style={{ height: 170 }} opts={{ renderer: "svg" }} />
          </div>
        )}
      </div>

      {/* ── Machine Cards ── */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-3">
          Machine Floor
          <span className="font-mono text-xs text-text-disabled font-normal ml-2 tabular-nums">
            {runningCount}/{resolved.length} running
          </span>
        </h2>
        {statusLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[0,1,2,3].map((i) => <div key={i} className="h-44 rounded-xl bg-bg-subtle animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {resolved.map((m) => <MachineCard key={m.machine_id} machine={m} />)}
            {resolved.length === 0 && (
              <div className="col-span-4 py-10 text-center bg-white rounded-xl shadow-card">
                <p className="font-mono text-xs text-text-disabled">No machines connected</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── OEE Waterfall + AI Insights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* OEE Loss Waterfall */}
        <div className="lg:col-span-3 bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-text-primary">OEE Loss Waterfall</h2>
            <span className="font-mono text-2xs text-text-disabled">Shift 2 · 480 min scheduled</span>
          </div>
          <p className="font-mono text-2xs text-text-disabled mb-2">
            <span style={{ color: T.success }}>287 min</span> productive of 480 available
            &nbsp;·&nbsp;OEE <span style={{ color: T.brand }}>59.8%</span>
          </p>
          <ReactECharts option={oeeWaterfallOption()} style={{ height: 185 }} opts={{ renderer: "svg" }} />
          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border flex-wrap">
            {[
              { label: "Planned Stops",  v: "55 min", color: T.warning },
              { label: "Unplanned Down", v: "82 min", color: T.danger  },
              { label: "Perf Loss",      v: "38 min", color: "#B86A00" },
              { label: "Quality Loss",   v: "18 min", color: T.brand   },
            ].map(({ label, v, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                <span className="font-mono text-2xs text-text-disabled">{label}:</span>
                <span className="font-mono text-2xs font-bold" style={{ color }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights — industry-specific */}
        <div className="lg:col-span-2">
          <IndustryInsightPanel industry={industry} />
        </div>
      </div>

      {/* ── Production + Downtime Log ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8">

        {/* Current production */}
        <div className="lg:col-span-2">
          {prodLoading ? <LoadingCard rows={2} /> : (
            <div className="bg-white rounded-xl p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-text-primary">Current Shift Production</h2>
                {qualityRate !== null && (
                  <span
                    className="font-mono text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{
                      background: qualityRate >= 97 ? T.successDim : qualityRate >= 90 ? T.warningDim : T.dangerDim,
                      color:      qualityRate >= 97 ? T.success     : qualityRate >= 90 ? T.warning    : T.danger,
                    }}
                  >
                    {qualityRate.toFixed(1)}% quality
                  </span>
                )}
              </div>
              {production ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-mono text-2xs text-text-disabled truncate">{production.order_number}</p>
                      <p className="text-base font-bold text-text-primary truncate mt-0.5">{production.product_code}</p>
                    </div>
                    {production.estimated_completion_at && (
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-lg font-black text-brand tabular-nums">
                          {formatTime(production.estimated_completion_at)}
                        </p>
                        <p className="font-mono text-2xs text-text-tertiary uppercase tracking-widest">Est. done</p>
                      </div>
                    )}
                  </div>
                  <ProductionProgress
                    actual={production.actual_qty}
                    planned={production.planned_qty}
                    label="Units produced"
                  />
                  <div className="grid grid-cols-3 gap-6 pt-4 border-t border-border">
                    {[
                      { label: "Good",    v: (production.actual_qty - production.rejected_qty).toLocaleString(), color: T.success },
                      { label: "Reject",  v: production.rejected_qty.toLocaleString(),                           color: T.danger },
                      { label: "Elapsed", v: `${(production.elapsed_pct * 100).toFixed(0)}%`,                   color: T.brand },
                    ].map(({ label, v, color }) => (
                      <div key={label}>
                        <p className="font-mono text-2xl font-black leading-none tabular-nums" style={{ color }}>{v}</p>
                        <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mt-1.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="font-mono text-xs text-text-disabled">No active production order</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Downtime log */}
        <div>
          {downtimeLoading ? <LoadingCard rows={3} /> : (
            <div className="bg-white rounded-xl p-5 shadow-card h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-text-primary">Downtime Events</h2>
                {totalDownSec > 0 && (
                  <span className="font-mono text-xs text-warning font-bold">{formatDuration(totalDownSec)} lost</span>
                )}
              </div>
              <div className="flex gap-6 mb-5 pb-4 border-b border-border">
                <div>
                  <p className="font-mono text-3xl font-black leading-none tabular-nums"
                     style={{ color: openDowntime.length > 0 ? T.danger : T.success }}>
                    {openDowntime.length}
                  </p>
                  <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mt-1.5">Open</p>
                </div>
                <div>
                  <p className="font-mono text-3xl font-black leading-none tabular-nums text-text-secondary">
                    {(downtimeEvents ?? []).length - openDowntime.length}
                  </p>
                  <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mt-1.5">Closed</p>
                </div>
              </div>
              {openDowntime.length === 0 ? (
                <div className="flex flex-col items-center py-4 gap-2">
                  <CheckCircle2 size={20} style={{ color: T.success }} />
                  <p className="font-mono text-xs text-text-disabled">No active events</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {openDowntime.slice(0, 4).map((e) => (
                    <div key={e.id} className="flex items-start gap-2.5 group">
                      <div className="w-1.5 h-1.5 rounded-full bg-danger shrink-0 mt-1.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-2xs text-danger font-bold uppercase tracking-widest">
                          {e.category}
                        </p>
                        <p className="font-sans text-xs text-text-secondary truncate">{e.reason ?? "Uncategorized"}</p>
                      </div>
                      <p className="font-mono text-2xs text-text-disabled shrink-0">{formatTime(e.started_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
