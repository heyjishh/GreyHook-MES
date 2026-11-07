"use client";

import { useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  Zap,
  TrendingDown,
  TrendingUp,
  Leaf,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

function lcg(seed: number) {
  let s = seed;
  return () => { s = (1664525 * s + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };
}

const MACHINES = [
  { id: "MC-01", name: "CNC Lathe #1",     area: "Machining", nominalKW: 18.5, idleKW: 3.2 },
  { id: "MC-02", name: "CNC Lathe #2",     area: "Machining", nominalKW: 18.5, idleKW: 3.1 },
  { id: "MC-04", name: "Boring Centre",    area: "Machining", nominalKW: 22.0, idleKW: 4.0 },
  { id: "PR-01", name: "50T Hydraulic Press",area: "Assembly",  nominalKW: 11.0, idleKW: 1.5 },
  { id: "HP-07", name: "Hydraulic Mould Press",area: "Moulding", nominalKW: 35.0, idleKW: 5.0 },
  { id: "CM-01", name: "CMM",             area: "QC Lab",    nominalKW: 2.5,  idleKW: 0.8 },
];

function genMachineData(machineId: string) {
  const seed = machineId.charCodeAt(0) + machineId.charCodeAt(machineId.length - 1) * 7;
  const rng = lcg(seed);
  const m = MACHINES.find((x) => x.id === machineId)!;
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const kw = hours.map((h) => {
    const isShift = h >= 7 && h <= 19;
    const base = isShift ? m.nominalKW * (0.6 + rng() * 0.4) : m.idleKW * (0.8 + rng() * 0.4);
    return +base.toFixed(2);
  });
  const kwh = kw.reduce((a, b) => a + b, 0).toFixed(1);
  const idleKwh = kw.slice(0, 7).concat(kw.slice(20)).reduce((a, b) => a + b, 0).toFixed(1);
  const peakKw = Math.max(...kw).toFixed(1);
  const co2 = +(+kwh * 0.233).toFixed(1);
  const cost = +(+kwh * 8.4).toFixed(0);
  return { kw, kwh: +kwh, idleKwh: +idleKwh, peakKw: +peakKw, co2, cost };
}

const WEEKLY_TREND = {
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  plant: [1240, 1310, 1280, 1350, 1290, 620, 310],
  target: [1200, 1200, 1200, 1200, 1200, 600, 300],
};

export default function EnergyPage() {
  const [selectedMachine, setSelectedMachine] = useState<string>("MC-04");
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  const machineData = MACHINES.map((m) => ({
    ...m,
    ...genMachineData(m.id),
  }));

  const totalKwh   = machineData.reduce((a, m) => a + m.kwh, 0);
  const totalCo2   = machineData.reduce((a, m) => a + m.co2, 0);
  const totalCost  = machineData.reduce((a, m) => a + m.cost, 0);
  const totalIdle  = machineData.reduce((a, m) => a + m.idleKwh, 0);
  const idlePct    = Math.round((totalIdle / totalKwh) * 100);

  const sel = machineData.find((m) => m.id === selectedMachine)!;
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

  const profileOption = {
    animation: false,
    tooltip: { trigger: "axis", formatter: (p: { name: string; value: number }[]) => `${p[0].name}<br/>${p[0].value} kW` },
    xAxis: { type: "category", data: hours, axisLabel: { fontSize: 9, interval: 2 } },
    yAxis: { type: "value", name: "kW", axisLabel: { fontSize: 9 } },
    series: [{
      type: "line",
      data: sel.kw,
      areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(240,82,48,0.25)" }, { offset: 1, color: "rgba(240,82,48,0)" }] } },
      lineStyle: { color: "#F05230", width: 2 },
      symbol: "none",
      markLine: {
        silent: true,
        data: [{ yAxis: sel.nominalKW, name: "Rated" }],
        lineStyle: { color: "#A85E00", type: "dashed", width: 1 },
        label: { formatter: "Rated {c} kW", fontSize: 9 },
      },
    }],
    grid: { left: 46, right: 20, top: 30, bottom: 30 },
  };

  const weeklyOption = {
    animation: false,
    tooltip: { trigger: "axis" },
    legend: { data: ["Actual kWh", "Target"], textStyle: { fontSize: 10 } },
    xAxis: { type: "category", data: WEEKLY_TREND.days, axisLabel: { fontSize: 10 } },
    yAxis: { type: "value", name: "kWh", axisLabel: { fontSize: 10 } },
    series: [
      {
        name: "Actual kWh",
        type: "bar",
        data: WEEKLY_TREND.plant,
        itemStyle: {
          color: (params: { dataIndex: number }) => WEEKLY_TREND.plant[params.dataIndex] > WEEKLY_TREND.target[params.dataIndex] ? "#CC1800" : "#1A7A40",
          borderRadius: [3, 3, 0, 0],
        },
        barMaxWidth: 36,
      },
      {
        name: "Target",
        type: "line",
        data: WEEKLY_TREND.target,
        lineStyle: { color: "#A85E00", type: "dashed", width: 1.5 },
        symbol: "none",
      },
    ],
    grid: { left: 50, right: 20, top: 36, bottom: 24 },
  };

  const areaOption = {
    animation: false,
    tooltip: { trigger: "item" },
    series: [{
      type: "pie",
      radius: ["52%", "78%"],
      data: [
        { name: "Machining", value: machineData.filter(m => m.area === "Machining").reduce((a, m) => a + m.kwh, 0), itemStyle: { color: "#F05230" } },
        { name: "Assembly",  value: machineData.filter(m => m.area === "Assembly").reduce((a, m) => a + m.kwh, 0),  itemStyle: { color: "#0077FF" } },
        { name: "Moulding",  value: machineData.filter(m => m.area === "Moulding").reduce((a, m) => a + m.kwh, 0),  itemStyle: { color: "#A855F7" } },
        { name: "QC Lab",    value: machineData.filter(m => m.area === "QC Lab").reduce((a, m) => a + m.kwh, 0),    itemStyle: { color: "#1A7A40" } },
      ],
      label: { fontSize: 10 },
    }],
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-lg font-bold text-text-primary">Energy Monitoring</h1>
            <p className="font-sans text-xs text-text-secondary mt-0.5">
              Machine-level kWh consumption · idle detection · CO₂ footprint · cost tracking
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-surface border border-border">
            {(["today", "week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1 rounded-md font-sans text-xs font-medium capitalize transition-colors",
                  period === p ? "bg-brand text-white" : "text-text-secondary hover:text-text-primary"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-5">
        {/* KPI tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Consumption", value: `${totalKwh.toFixed(0)} kWh`, sub: "today", icon: Zap, color: "text-brand", trend: "+3% vs yesterday", up: true },
            { label: "Idle Energy",        value: `${totalIdle.toFixed(0)} kWh`, sub: `${idlePct}% of total`, icon: Clock, color: "text-warning", trend: "High — investigate", up: true },
            { label: "CO₂ Footprint",      value: `${totalCo2.toFixed(0)} kg`, sub: "today (0.233 kg/kWh)", icon: Leaf, color: "text-success", trend: "-8% vs target", up: false },
            { label: "Energy Cost",        value: `₹${totalCost.toLocaleString()}`, sub: "today (₹8.4/kWh)", icon: TrendingDown, color: "text-text-secondary", trend: "On budget", up: false },
          ].map(({ label, value, sub, icon: Icon, color, trend, up }) => (
            <div key={label} className="p-4 rounded-xl bg-surface border border-border">
              <div className="flex items-start justify-between mb-2">
                <Icon size={16} className={color} />
                <span className={cn("flex items-center gap-0.5 font-mono text-2xs", up ? "text-warning" : "text-success")}>
                  {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                  {trend}
                </span>
              </div>
              <div className="font-mono text-xl font-bold text-text-primary">{value}</div>
              <div className="font-sans text-xs text-text-secondary mt-0.5">{label}</div>
              <div className="font-mono text-2xs text-text-disabled">{sub}</div>
            </div>
          ))}
        </div>

        {/* Alert strip */}
        {idlePct > 20 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-warning/5 border border-warning/20">
            <AlertTriangle size={13} className="text-warning shrink-0" />
            <p className="font-sans text-xs text-text-secondary">
              <strong className="text-warning">Idle energy alert:</strong> {idlePct}% of today's consumption is during idle/off-shift periods. Consider auto-standby mode on MC-01, MC-02.
            </p>
          </div>
        )}

        {/* Machine table + profile side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-bg overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <span className="font-sans text-xs font-semibold text-text-primary">Machine Breakdown</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-2xs font-mono text-text-disabled uppercase border-b border-border">
                    <th className="text-left py-2 px-4 font-medium">Machine</th>
                    <th className="text-right py-2 px-3 font-medium">kWh</th>
                    <th className="text-right py-2 px-3 font-medium">Peak kW</th>
                    <th className="text-right py-2 px-3 font-medium">Idle kWh</th>
                    <th className="text-right py-2 px-3 font-medium">CO₂ kg</th>
                  </tr>
                </thead>
                <tbody>
                  {machineData.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMachine(m.id)}
                      className={cn(
                        "text-xs font-sans border-b border-border last:border-0 cursor-pointer transition-colors",
                        selectedMachine === m.id ? "bg-brand/5" : "hover:bg-surface"
                      )}
                    >
                      <td className="py-2 px-4">
                        <div className="font-semibold text-text-primary">{m.name}</div>
                        <div className="font-mono text-2xs text-text-disabled">{m.area}</div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-text-primary">{m.kwh}</td>
                      <td className="py-2 px-3 text-right font-mono text-text-secondary">{m.peakKw}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        <span className={m.idleKwh / m.kwh > 0.25 ? "text-warning" : "text-text-secondary"}>
                          {m.idleKwh}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-text-secondary">{m.co2}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-bg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-sans text-xs font-semibold text-text-primary">
                24-hr Profile — {sel.name}
              </span>
              <div className="flex items-center gap-2 font-mono text-2xs text-text-disabled">
                <span>Rated: {sel.nominalKW} kW</span>
                <span>·</span>
                <span>Idle: {sel.idleKW} kW</span>
              </div>
            </div>
            <ReactECharts option={profileOption} style={{ height: 160 }} />
          </div>
        </div>

        {/* Weekly trend + area breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-xl border border-border bg-bg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-sans text-xs font-semibold text-text-primary">Weekly Plant Consumption vs Target</span>
            </div>
            <ReactECharts option={weeklyOption} style={{ height: 160 }} />
          </div>
          <div className="rounded-xl border border-border bg-bg p-4">
            <div className="mb-3">
              <span className="font-sans text-xs font-semibold text-text-primary">By Area (today)</span>
            </div>
            <ReactECharts option={areaOption} style={{ height: 160 }} />
          </div>
        </div>

        {/* CO2 target card */}
        <div className="rounded-xl border border-success/20 bg-success/3 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Leaf size={14} className="text-success" />
            <span className="font-sans text-xs font-semibold text-success">Sustainability Targets — 2026</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Energy Intensity Target", value: "4.2 kWh/pc", actual: "4.6 kWh/pc", onTrack: false },
              { label: "CO₂ Reduction YTD",       value: "−15% target", actual: "−11.2%",    onTrack: false },
              { label: "Idle Energy Target",       value: "< 18%",       actual: `${idlePct}%`, onTrack: idlePct < 18 },
            ].map(({ label, value, actual, onTrack }) => (
              <div key={label} className="p-3 rounded-lg bg-bg border border-border">
                <div className="font-sans text-2xs text-text-disabled mb-1">{label}</div>
                <div className="font-mono text-xs font-bold text-text-primary">{value}</div>
                <div className={cn("flex items-center gap-1 font-mono text-2xs mt-1", onTrack ? "text-success" : "text-warning")}>
                  {onTrack ? <CheckCircle2 size={9} /> : <AlertTriangle size={9} />}
                  Actual: {actual}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
