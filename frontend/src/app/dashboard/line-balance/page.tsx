"use client";

import { useState } from "react";
import {
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  User,
  Settings,
  RefreshCw,
  ArrowRight,
  Layers,
} from "lucide-react";
import ReactECharts from "echarts-for-react";
import { cn } from "@/lib/utils";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

type StationStatus = "bottleneck" | "overloaded" | "balanced" | "underloaded" | "idle";

interface WorkElement {
  task: string;
  timeS: number;
  valueAdded: boolean;
}

interface Station {
  id: string;
  name: string;
  operator: string;
  cycleTimeS: number;
  taktTimeS: number;
  status: StationStatus;
  utilization: number;
  elements: WorkElement[];
}

interface LineConfig {
  id: string;
  name: string;
  product: string;
  shift: string;
  demandPerShift: number;
  shiftMins: number;
  plannedDowntimeMins: number;
  stations: Station[];
}

function computeTakt(shift: number, downtime: number, demand: number) {
  return Math.round(((shift - downtime) * 60) / demand);
}

const LINES: LineConfig[] = [
  {
    id: "L1",
    name: "Assembly Line 1",
    product: "Brake Disc BD-700",
    shift: "Morning (6:00–14:00)",
    demandPerShift: 100,
    shiftMins: 480,
    plannedDowntimeMins: 30,
    stations: (() => {
      const takt = computeTakt(480, 30, 100);
      const rng = lcg(0x1a2b3c4d);
      const st = (base: number, spread: number) => Math.round(base + (rng() - 0.5) * spread);
      return [
        {
          id: "S1", name: "Sub-assy Prep", operator: "Rajan M.", cycleTimeS: st(240, 20), taktTimeS: takt,
          status: "balanced" as StationStatus, utilization: 84,
          elements: [
            { task: "Retrieve hub casting from bin", timeS: 30, valueAdded: false },
            { task: "Inspect casting visually (100%)", timeS: 60, valueAdded: true },
            { task: "Press bearing into hub bore", timeS: 90, valueAdded: true },
            { task: "Transfer to conveyor", timeS: 20, valueAdded: false },
          ],
        },
        {
          id: "S2", name: "Disc Mount & Bolt", operator: "Priya L.", cycleTimeS: st(310, 15), taktTimeS: takt,
          status: "overloaded" as StationStatus, utilization: 108,
          elements: [
            { task: "Pick raw disc from pallet", timeS: 25, valueAdded: false },
            { task: "Align disc on hub fixture", timeS: 40, valueAdded: true },
            { task: "Torque 5 bolts to 85 Nm", timeS: 120, valueAdded: true },
            { task: "Re-torque confirmation", timeS: 60, valueAdded: true },
            { task: "Mark & move to S3", timeS: 25, valueAdded: false },
          ],
        },
        {
          id: "S3", name: "Runout Check", operator: "Suresh K.", cycleTimeS: st(265, 10), taktTimeS: takt,
          status: "balanced" as StationStatus, utilization: 93,
          elements: [
            { task: "Mount on runout check stand", timeS: 30, valueAdded: false },
            { task: "Dial indicator setup", timeS: 20, valueAdded: false },
            { task: "Rotate & read runout (3 pts)", timeS: 90, valueAdded: true },
            { task: "Record reading in MES", timeS: 40, valueAdded: false },
            { task: "Transfer OK / NG split", timeS: 25, valueAdded: false },
          ],
        },
        {
          id: "S4", name: "Surface Finish", operator: "Amit K.", cycleTimeS: st(190, 20), taktTimeS: takt,
          status: "underloaded" as StationStatus, utilization: 67,
          elements: [
            { task: "Degrease disc faces", timeS: 50, valueAdded: true },
            { task: "Apply protective coating", timeS: 80, valueAdded: true },
            { task: "Air-dry 60s", timeS: 60, valueAdded: false },
          ],
        },
        {
          id: "S5", name: "Final Inspection", operator: "Meera V.", cycleTimeS: st(285, 10), taktTimeS: takt,
          status: "balanced" as StationStatus, utilization: 100,
          elements: [
            { task: "Check part number label", timeS: 20, valueAdded: false },
            { task: "Hardness test sample", timeS: 60, valueAdded: true },
            { task: "CMM spot-check (5% sample)", timeS: 90, valueAdded: true },
            { task: "Pack and palletize", timeS: 60, valueAdded: true },
            { task: "Scan to MES FG store", timeS: 20, valueAdded: false },
          ],
        },
      ];
    })(),
  },
  {
    id: "L2",
    name: "CNC Line — Shaft",
    product: "Shaft Assembly SH-4400",
    shift: "Morning (6:00–14:00)",
    demandPerShift: 50,
    shiftMins: 480,
    plannedDowntimeMins: 30,
    stations: (() => {
      const takt = computeTakt(480, 30, 50);
      const rng = lcg(0xdeadbeef);
      const st = (base: number, spread: number) => Math.round(base + (rng() - 0.5) * spread);
      return [
        {
          id: "CS1", name: "Bar Cut & Face", operator: "Rajan M.", cycleTimeS: st(480, 30), taktTimeS: takt,
          status: "bottleneck" as StationStatus, utilization: 134,
          elements: [
            { task: "Load bar stock in saw", timeS: 30, valueAdded: false },
            { task: "Cut to length", timeS: 120, valueAdded: true },
            { task: "Face both ends on CNC lathe", timeS: 240, valueAdded: true },
            { task: "Transfer to CS2", timeS: 30, valueAdded: false },
          ],
        },
        {
          id: "CS2", name: "Turning OD", operator: "Suresh K.", cycleTimeS: st(300, 20), taktTimeS: takt,
          status: "balanced" as StationStatus, utilization: 83,
          elements: [
            { task: "Chuck and align workpiece", timeS: 60, valueAdded: false },
            { task: "Rough turn OD", timeS: 120, valueAdded: true },
            { task: "Finish turn OD", timeS: 90, valueAdded: true },
            { task: "Un-chuck and move", timeS: 30, valueAdded: false },
          ],
        },
        {
          id: "CS3", name: "Keyway & Thread", operator: "Priya L.", cycleTimeS: st(280, 15), taktTimeS: takt,
          status: "balanced" as StationStatus, utilization: 78,
          elements: [
            { task: "Mill keyway", timeS: 150, valueAdded: true },
            { task: "Thread M24 × 1.5", timeS: 90, valueAdded: true },
            { task: "Deburr", timeS: 20, valueAdded: true },
            { task: "Transfer", timeS: 20, valueAdded: false },
          ],
        },
        {
          id: "CS4", name: "Grind & Check", operator: "Amit K.", cycleTimeS: st(340, 20), taktTimeS: takt,
          status: "overloaded" as StationStatus, utilization: 94,
          elements: [
            { task: "Centerless grind OD", timeS: 180, valueAdded: true },
            { task: "CMM dimensional check", timeS: 90, valueAdded: true },
            { task: "Re-grind if NG (10% rate)", timeS: 50, valueAdded: true },
            { task: "Pack & label", timeS: 30, valueAdded: false },
          ],
        },
      ];
    })(),
  },
];

const STATUS_CONFIG: Record<StationStatus, { label: string; color: string; barColor: string }> = {
  bottleneck:  { label: "Bottleneck",   color: "text-danger border-danger/30 bg-danger/10",    barColor: "#CC1800" },
  overloaded:  { label: "Overloaded",   color: "text-danger border-danger/30 bg-danger/10",    barColor: "#CC1800" },
  balanced:    { label: "Balanced",     color: "text-success border-success/30 bg-success/10", barColor: "#1A7A40" },
  underloaded: { label: "Underloaded",  color: "text-warning border-warning/30 bg-warning/10", barColor: "#A85E00" },
  idle:        { label: "Idle",         color: "text-text-disabled border-border bg-surface",  barColor: "#6B7E99" },
};

export default function LineBalancePage() {
  const [selectedLine, setSelectedLine] = useState<string>("L1");
  const [selectedStation, setSelectedStation] = useState<string | null>(null);

  const line = LINES.find((l) => l.id === selectedLine) ?? LINES[0];
  const takt = computeTakt(line.shiftMins, line.plannedDowntimeMins, line.demandPerShift);
  const station = selectedStation ? line.stations.find((s) => s.id === selectedStation) : null;

  const bottleneckTime = Math.max(...line.stations.map((s) => s.cycleTimeS));
  const lineEfficiency = Math.round((line.stations.reduce((a, s) => a + s.cycleTimeS, 0) / (line.stations.length * takt)) * 100);
  const balanceLoss = Math.round(((line.stations.length * takt - line.stations.reduce((a, s) => a + s.cycleTimeS, 0)) / (line.stations.length * takt)) * 100);

  const chartOpts = {
    animation: false,
    grid: { left: 70, right: 24, top: 24, bottom: 50 },
    xAxis: {
      type: "category" as const,
      data: line.stations.map((s) => s.name),
      axisLabel: { fontSize: 9, color: "#6B7E99", rotate: 20, interval: 0 },
      axisLine: { lineStyle: { color: "#2A3A54" } },
    },
    yAxis: {
      type: "value" as const,
      name: "seconds",
      nameTextStyle: { fontSize: 9, color: "#6B7E99" },
      axisLabel: { fontSize: 9, color: "#6B7E99" },
      splitLine: { lineStyle: { color: "#1E2D45" } },
    },
    series: [
      {
        name: "Cycle Time",
        type: "bar" as const,
        data: line.stations.map((s) => ({
          value: s.cycleTimeS,
          itemStyle: { color: STATUS_CONFIG[s.status].barColor, borderRadius: [3, 3, 0, 0] },
        })),
        barWidth: "55%",
      },
      {
        name: "Takt Time",
        type: "line" as const,
        data: line.stations.map(() => takt),
        lineStyle: { color: "#F05230", type: "dashed" as const, width: 2 },
        symbol: "none",
        label: { show: false },
      },
    ],
    legend: { data: ["Cycle Time", "Takt Time"], textStyle: { color: "#9AB0CC", fontSize: 10 }, bottom: 0 },
    tooltip: { trigger: "axis" as const },
  };

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-lg font-bold text-text-primary">Line Balance / Takt Time</h1>
            <p className="font-sans text-xs text-text-secondary mt-0.5">
              Cycle time per station vs takt time — bottleneck identification and operator balance
            </p>
          </div>
          <select
            className="shrink-0 px-2 py-1.5 bg-surface border border-border rounded-lg font-mono text-xs text-text-primary focus:outline-none focus:border-brand"
            value={selectedLine}
            onChange={(e) => { setSelectedLine(e.target.value); setSelectedStation(null); }}
          >
            {LINES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-4 max-w-3xl">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Takt Time", value: `${takt}s`, sub: `${line.demandPerShift} pcs/shift`, color: "text-brand" },
              { label: "Bottleneck", value: `${bottleneckTime}s`, sub: line.stations.find((s) => s.cycleTimeS === bottleneckTime)?.name ?? "", color: bottleneckTime > takt ? "text-danger" : "text-success" },
              { label: "Line Efficiency", value: `${lineEfficiency}%`, sub: "cycle time / takt", color: lineEfficiency >= 85 ? "text-success" : lineEfficiency >= 70 ? "text-warning" : "text-danger" },
              { label: "Balance Loss", value: `${balanceLoss}%`, sub: "idle time / available", color: balanceLoss <= 10 ? "text-success" : balanceLoss <= 20 ? "text-warning" : "text-danger" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="p-3 rounded-lg bg-surface border border-border">
                <div className="font-mono text-2xs text-text-disabled">{label}</div>
                <div className={cn("font-heading text-lg font-bold mt-0.5", color)}>{value}</div>
                <div className="font-sans text-2xs text-text-disabled truncate">{sub}</div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="p-3 rounded-lg bg-surface border border-border">
            <div className="font-sans text-2xs text-text-disabled uppercase tracking-widest mb-1">Cycle Time vs Takt Time (s)</div>
            <ReactECharts option={chartOpts} style={{ height: 180 }} />
          </div>

          {/* Station grid */}
          <div>
            <div className="font-sans text-2xs text-text-disabled uppercase tracking-widest mb-2">Station Details</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {line.stations.map((s) => {
                const cfg = STATUS_CONFIG[s.status];
                const pct = Math.min(100, (s.cycleTimeS / takt) * 100);
                const isSelected = selectedStation === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStation(isSelected ? null : s.id)}
                    className={cn(
                      "text-left p-3 rounded-lg border transition-all",
                      isSelected ? "bg-brand/5 border-brand/30" : "bg-surface border-border hover:border-border-hover"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-sans text-xs font-bold text-text-primary">{s.name}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <User size={9} className="text-text-disabled" />
                          <span className="font-mono text-2xs text-text-disabled">{s.operator}</span>
                        </div>
                      </div>
                      <span className={cn("px-1.5 py-0.5 rounded text-2xs border font-medium", cfg.color)}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-text-primary">{s.cycleTimeS}s</span>
                      <span className="font-mono text-2xs text-text-disabled">{s.utilization}% util.</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-elevated overflow-hidden relative">
                      <div
                        className={cn("h-full rounded-full transition-all", s.cycleTimeS > takt ? "bg-danger" : "bg-success")}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                      {/* Takt marker */}
                      <div className="absolute top-0 bottom-0 w-0.5 bg-brand/70" style={{ left: "100%" }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-2xs text-text-disabled">{s.elements.length} work elements</span>
                      <span className={cn("font-mono text-2xs font-medium", s.cycleTimeS > takt ? "text-danger" : "text-success")}>
                        {s.cycleTimeS > takt ? `+${s.cycleTimeS - takt}s over takt` : `${takt - s.cycleTimeS}s spare`}
                      </span>
                    </div>

                    {/* Expanded elements */}
                    {isSelected && (
                      <div className="mt-3 space-y-1 border-t border-border pt-2" onClick={(e) => e.stopPropagation()}>
                        {s.elements.map((el, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", el.valueAdded ? "bg-success" : "bg-surface-elevated border border-border")} />
                            <span className="font-sans text-2xs text-text-secondary flex-1 truncate">{el.task}</span>
                            <span className="font-mono text-2xs text-text-disabled shrink-0">{el.timeS}s</span>
                          </div>
                        ))}
                        <div className="pt-1 mt-1 border-t border-border flex items-center justify-between">
                          <span className="font-mono text-2xs text-text-disabled">VA: {s.elements.filter((e) => e.valueAdded).reduce((a, e) => a + e.timeS, 0)}s</span>
                          <span className="font-mono text-2xs text-text-disabled">NVA: {s.elements.filter((e) => !e.valueAdded).reduce((a, e) => a + e.timeS, 0)}s</span>
                          <span className="font-mono text-2xs text-brand">
                            {Math.round((s.elements.filter((e) => e.valueAdded).reduce((a, e) => a + e.timeS, 0) / s.cycleTimeS) * 100)}% VA ratio
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Improvement suggestions */}
          {line.stations.some((s) => s.status === "bottleneck" || s.status === "overloaded") && (
            <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={12} className="text-warning" />
                <span className="font-sans text-xs font-bold text-warning">Improvement Opportunities</span>
              </div>
              <div className="space-y-1">
                {line.stations
                  .filter((s) => s.status === "bottleneck" || s.status === "overloaded")
                  .map((s) => (
                    <div key={s.id} className="font-sans text-xs text-text-secondary">
                      · <strong>{s.name}</strong>: {s.cycleTimeS - takt}s over takt — consider off-loading NVA tasks or splitting the station.
                    </div>
                  ))}
                {line.stations
                  .filter((s) => s.status === "underloaded")
                  .map((s) => (
                    <div key={s.id} className="font-sans text-xs text-text-secondary">
                      · <strong>{s.name}</strong>: {takt - s.cycleTimeS}s idle capacity — candidate to absorb work from overloaded stations.
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
