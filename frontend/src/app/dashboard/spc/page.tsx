"use client";

import { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

const PARAMETERS = [
  { id: "wall_thickness", label: "Wall Thickness", unit: "mm", nominal: 3.0, usl: 3.3, lsl: 2.7, target: 3.0 },
  { id: "tensile_strength", label: "Tensile Strength", unit: "MPa", nominal: 450, usl: 480, lsl: 420, target: 450 },
  { id: "surface_roughness", label: "Surface Roughness", unit: "Ra μm", nominal: 1.6, usl: 2.2, lsl: 0.8, target: 1.6 },
  { id: "bore_diameter", label: "Bore Diameter", unit: "mm", nominal: 25.0, usl: 25.05, lsl: 24.95, target: 25.0 },
  { id: "torque_nm", label: "Assembly Torque", unit: "Nm", nominal: 42, usl: 46, lsl: 38, target: 42 },
];

const MACHINES = [
  { id: "CNC-001", label: "CNC-001" },
  { id: "PRESS-002", label: "PRESS-002" },
  { id: "WELD-003", label: "WELD-003" },
  { id: "QC-004", label: "QC-004" },
];

function generateMeasurements(nominal: number, usl: number, lsl: number, n = 25, seed = 42) {
  const sigma = (usl - lsl) / 8;
  const measurements: number[] = [];
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const u = (s >>> 0) / 0xffffffff;
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const v = (s >>> 0) / 0xffffffff;
    const z = Math.sqrt(-2 * Math.log(u + 0.0001)) * Math.cos(2 * Math.PI * v);
    measurements.push(parseFloat((nominal + z * sigma).toFixed(4)));
  }
  return measurements;
}

function subgroupMeans(vals: number[], n = 5) {
  const groups: number[] = [];
  for (let i = 0; i < vals.length - n + 1; i += n) {
    const slice = vals.slice(i, i + n);
    groups.push(parseFloat((slice.reduce((a, b) => a + b, 0) / n).toFixed(4)));
  }
  return groups;
}

function stats(vals: number[]) {
  const n = vals.length;
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance);
  return { mean, std, n };
}

function cpkCalc(vals: number[], usl: number, lsl: number) {
  const { mean, std } = stats(vals);
  if (std === 0) return { cpk: 999, cp: 999, mean, std };
  const cpu = (usl - mean) / (3 * std);
  const cpl = (mean - lsl) / (3 * std);
  const cpk = Math.min(cpu, cpl);
  const cp = (usl - lsl) / (6 * std);
  return { cpk, cp, mean, std };
}

function CapabilityGauge({ cpk }: { cpk: number }) {
  const color = cpk >= 1.67 ? "#1A7A40" : cpk >= 1.33 ? "#2563EB" : cpk >= 1.0 ? "#A85E00" : "#CC1800";
  const label = cpk >= 1.67 ? "Excellent" : cpk >= 1.33 ? "Capable" : cpk >= 1.0 ? "Marginal" : "Incapable";
  const pct = Math.min(cpk / 2, 1);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 88 88" className="w-20 h-20">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#E5E7EB" strokeWidth="8" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 44 44)" />
        <text x="44" y="40" textAnchor="middle" fontSize="13" fontWeight="700" fill={color} fontFamily="'IBM Plex Mono'">{cpk.toFixed(2)}</text>
        <text x="44" y="54" textAnchor="middle" fontSize="8" fill="#6B7280" fontFamily="'IBM Plex Sans'">Cpk</text>
      </svg>
      <span className="text-2xs font-mono uppercase tracking-widest" style={{ color }}>{label}</span>
    </div>
  );
}

export default function SPCPage() {
  const [selectedParam, setSelectedParam] = useState(PARAMETERS[0].id);
  const [selectedMachine, setSelectedMachine] = useState(MACHINES[0].id);
  const [view, setView] = useState<"xbar" | "histogram" | "individuals">("xbar");

  const param = PARAMETERS.find(p => p.id === selectedParam)!;

  const rawVals = useMemo(() =>
    generateMeasurements(param.nominal, param.usl, param.lsl, 50, selectedMachine.charCodeAt(0) + selectedParam.charCodeAt(0)),
    [selectedParam, selectedMachine]
  );

  const means = useMemo(() => subgroupMeans(rawVals, 5), [rawVals]);
  const { mean, std } = useMemo(() => stats(rawVals), [rawVals]);
  const ucl = mean + 3 * std;
  const lcl = mean - 3 * std;
  const { cpk, cp } = cpkCalc(rawVals, param.usl, param.lsl);

  const violationsXbar = means.map((v, i) => v > ucl || v < lcl ? i : -1).filter(i => i >= 0);

  const xbarOption = {
    backgroundColor: "transparent",
    grid: { left: 56, right: 20, top: 32, bottom: 40 },
    tooltip: { trigger: "axis", backgroundColor: "#0D1B2A", borderColor: "#1E3A5F", textStyle: { color: "#E5E7EB", fontSize: 11 } },
    xAxis: { type: "category", data: means.map((_, i) => `SG${i + 1}`), axisLine: { lineStyle: { color: "#1E3A5F" } }, axisLabel: { color: "#6B7280", fontSize: 10 } },
    yAxis: { type: "value", axisLabel: { color: "#6B7280", fontSize: 10, formatter: (v: number) => v.toFixed(3) }, splitLine: { lineStyle: { color: "#1E3A5F", type: "dashed" } } },
    series: [
      { name: "X-bar", type: "line", data: means, symbol: "circle", symbolSize: 7,
        itemStyle: { color: (p: { dataIndex: number }) => violationsXbar.includes(p.dataIndex) ? "#CC1800" : "#2563EB" },
        lineStyle: { color: "#2563EB", width: 1.5 } },
      { name: "UCL", type: "line", data: Array(means.length).fill(parseFloat(ucl.toFixed(4))), symbol: "none", lineStyle: { color: "#CC1800", type: "dashed", width: 1 }, z: 0 },
      { name: "Mean", type: "line", data: Array(means.length).fill(parseFloat(mean.toFixed(4))), symbol: "none", lineStyle: { color: "#1A7A40", type: "solid", width: 1.5 }, z: 0 },
      { name: "LCL", type: "line", data: Array(means.length).fill(parseFloat(lcl.toFixed(4))), symbol: "none", lineStyle: { color: "#CC1800", type: "dashed", width: 1 }, z: 0 },
      { name: "USL", type: "line", data: Array(means.length).fill(param.usl), symbol: "none", lineStyle: { color: "#A85E00", type: "dotted", width: 1 }, z: 0 },
      { name: "LSL", type: "line", data: Array(means.length).fill(param.lsl), symbol: "none", lineStyle: { color: "#A85E00", type: "dotted", width: 1 }, z: 0 },
    ],
    legend: { bottom: 0, textStyle: { color: "#9CA3AF", fontSize: 10 }, itemHeight: 8 },
  };

  const buckets = 15;
  const minV = Math.min(...rawVals);
  const maxV = Math.max(...rawVals);
  const bw = (maxV - minV) / buckets;
  const counts = Array(buckets).fill(0);
  const labels: string[] = [];
  for (let i = 0; i < buckets; i++) {
    labels.push((minV + i * bw).toFixed(3));
    rawVals.forEach(v => { if (v >= minV + i * bw && v < minV + (i + 1) * bw) counts[i]++; });
  }

  const histOption = {
    backgroundColor: "transparent",
    grid: { left: 48, right: 20, top: 20, bottom: 48 },
    tooltip: { trigger: "axis", backgroundColor: "#0D1B2A", borderColor: "#1E3A5F", textStyle: { color: "#E5E7EB", fontSize: 11 } },
    xAxis: { type: "category", data: labels, axisLabel: { rotate: 35, color: "#6B7280", fontSize: 9 }, axisLine: { lineStyle: { color: "#1E3A5F" } } },
    yAxis: { type: "value", axisLabel: { color: "#6B7280", fontSize: 10 }, splitLine: { lineStyle: { color: "#1E3A5F", type: "dashed" } } },
    series: [{
      type: "bar",
      data: counts.map((c, i) => {
        const bStart = minV + i * bw;
        const bEnd = minV + (i + 1) * bw;
        const ool = bStart < param.lsl || bEnd > param.usl;
        return { value: c, itemStyle: { color: ool ? "#CC1800" : "#2563EB" } };
      }),
      barWidth: "90%",
    }],
    markLine: { data: [{ xAxis: param.lsl.toFixed(3) }, { xAxis: param.usl.toFixed(3) }] },
  };

  const individualsOption = {
    backgroundColor: "transparent",
    grid: { left: 56, right: 20, top: 20, bottom: 40 },
    tooltip: { trigger: "axis", backgroundColor: "#0D1B2A", borderColor: "#1E3A5F", textStyle: { color: "#E5E7EB", fontSize: 11 } },
    xAxis: { type: "category", data: rawVals.map((_, i) => `${i + 1}`), axisLine: { lineStyle: { color: "#1E3A5F" } }, axisLabel: { color: "#6B7280", fontSize: 10 } },
    yAxis: { type: "value", axisLabel: { color: "#6B7280", fontSize: 10, formatter: (v: number) => v.toFixed(3) }, splitLine: { lineStyle: { color: "#1E3A5F", type: "dashed" } } },
    series: [
      { name: "Value", type: "scatter", data: rawVals,
        itemStyle: { color: (p: { value: number }) => (p.value > param.usl || p.value < param.lsl) ? "#CC1800" : "#2563EB" },
        symbolSize: 5 },
      { name: "USL", type: "line", data: Array(rawVals.length).fill(param.usl), symbol: "none", lineStyle: { color: "#A85E00", type: "dashed" }, z: 0 },
      { name: "Nominal", type: "line", data: Array(rawVals.length).fill(param.nominal), symbol: "none", lineStyle: { color: "#1A7A40", type: "solid", width: 1 }, z: 0 },
      { name: "LSL", type: "line", data: Array(rawVals.length).fill(param.lsl), symbol: "none", lineStyle: { color: "#A85E00", type: "dashed" }, z: 0 },
    ],
    legend: { bottom: 0, textStyle: { color: "#9CA3AF", fontSize: 10 }, itemHeight: 8 },
  };

  const oolCount = rawVals.filter(v => v > param.usl || v < param.lsl).length;
  const ppm = Math.round((oolCount / rawVals.length) * 1_000_000);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary">SPC — Statistical Process Control</h1>
          <p className="font-sans text-xs text-text-tertiary mt-0.5">Control charts, capability indices (Cpk/Cp), and process performance analysis</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={selectedMachine} onChange={e => setSelectedMachine(e.target.value)}
            className="font-mono text-xs bg-surface border border-border rounded-lg px-3 py-1.5 text-text-primary focus:border-brand focus:outline-none">
            {MACHINES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <select value={selectedParam} onChange={e => setSelectedParam(e.target.value)}
            className="font-mono text-xs bg-surface border border-border rounded-lg px-3 py-1.5 text-text-primary focus:border-brand focus:outline-none">
            {PARAMETERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* Capability summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Cpk", value: cpk.toFixed(3), color: cpk >= 1.33 ? "text-success" : cpk >= 1.0 ? "text-warning" : "text-danger" },
          { label: "Cp", value: cp.toFixed(3), color: "text-text-primary" },
          { label: "Mean", value: `${mean.toFixed(4)} ${param.unit}`, color: "text-text-primary" },
          { label: "Std Dev (σ)", value: `${std.toFixed(4)} ${param.unit}`, color: "text-text-primary" },
          { label: "OOL Count", value: `${oolCount} / ${rawVals.length}`, color: oolCount > 0 ? "text-danger" : "text-success" },
          { label: "Est. PPM", value: ppm.toLocaleString(), color: ppm > 1000 ? "text-danger" : ppm > 100 ? "text-warning" : "text-success" },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-3">
            <p className="font-mono text-2xs text-text-tertiary uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`font-mono text-sm font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Capability gauges for all params */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="font-heading text-xs font-semibold text-text-secondary uppercase tracking-widest mb-4">Process Capability — All Parameters</p>
          <div className="space-y-4">
            {PARAMETERS.map(p => {
              const vals = generateMeasurements(p.nominal, p.usl, p.lsl, 50, selectedMachine.charCodeAt(0) + p.id.charCodeAt(0));
              const { cpk: c } = cpkCalc(vals, p.usl, p.lsl);
              return (
                <div key={p.id} className="flex items-center justify-between gap-2 cursor-pointer hover:bg-bg rounded-lg px-2 py-1 transition-colors"
                  onClick={() => setSelectedParam(p.id)}>
                  <div className="flex-1 min-w-0">
                    <p className={`font-sans text-xs font-medium truncate ${selectedParam === p.id ? "text-brand" : "text-text-primary"}`}>{p.label}</p>
                    <p className="font-mono text-2xs text-text-tertiary">{p.unit}</p>
                  </div>
                  <CapabilityGauge cpk={c} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Main chart area */}
        <div className="lg:col-span-3 bg-surface border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-heading text-sm font-semibold text-text-primary">{param.label}</p>
              <p className="font-mono text-2xs text-text-tertiary">
                Nominal: {param.nominal} {param.unit} · USL: {param.usl} · LSL: {param.lsl}
              </p>
            </div>
            <div className="flex border border-border rounded-lg overflow-hidden">
              {(["xbar", "individuals", "histogram"] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1 font-mono text-2xs uppercase tracking-widest transition-colors ${view === v ? "bg-brand text-white" : "text-text-tertiary hover:text-text-primary"}`}>
                  {v === "xbar" ? "X-Bar" : v === "individuals" ? "Individuals" : "Histogram"}
                </button>
              ))}
            </div>
          </div>

          <ReactECharts
            option={view === "xbar" ? xbarOption : view === "histogram" ? histOption : individualsOption}
            style={{ height: 280 }}
            opts={{ renderer: "svg" }}
          />

          {view === "xbar" && violationsXbar.length > 0 && (
            <div className="flex items-center gap-2 bg-danger/8 border border-danger/20 rounded-lg px-3 py-2">
              <div className="w-2 h-2 rounded-full bg-danger shrink-0" />
              <p className="font-sans text-xs text-danger">
                {violationsXbar.length} subgroup(s) outside control limits — investigate assignable cause (SG {violationsXbar.map(i => i + 1).join(", ")})
              </p>
            </div>
          )}

          {/* Spec summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "LSL", value: param.lsl, unit: param.unit, color: "text-warning" },
              { label: "Target / Nominal", value: param.nominal, unit: param.unit, color: "text-success" },
              { label: "USL", value: param.usl, unit: param.unit, color: "text-warning" },
            ].map(s => (
              <div key={s.label} className="bg-bg rounded-lg p-2 border border-border">
                <p className="font-mono text-2xs text-text-tertiary mb-0.5">{s.label}</p>
                <p className={`font-mono text-sm font-bold ${s.color}`}>{s.value} <span className="text-2xs font-normal">{s.unit}</span></p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Measurement log table */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <p className="font-heading text-xs font-semibold text-text-secondary uppercase tracking-widest mb-3">Recent Measurements — {param.label} ({selectedMachine})</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border">
                {["#", "Value", "Unit", "Status", "Deviation", "Operator", "Timestamp"].map(h => (
                  <th key={h} className="text-left text-text-tertiary font-medium pb-2 pr-4 uppercase tracking-widest text-2xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rawVals.slice(0, 15).map((v, i) => {
                const ool = v > param.usl || v < param.lsl;
                const dev = ((v - param.nominal) / param.nominal * 100).toFixed(3);
                const ops = ["K.Patel", "R.Singh", "A.Kumar", "M.Shah", "D.Verma"];
                const ts = new Date(Date.now() - (rawVals.length - i) * 7 * 60 * 1000);
                return (
                  <tr key={i} className={ool ? "bg-danger/4" : ""}>
                    <td className="py-1.5 pr-4 text-text-tertiary">{i + 1}</td>
                    <td className={`py-1.5 pr-4 font-bold ${ool ? "text-danger" : "text-text-primary"}`}>{v.toFixed(4)}</td>
                    <td className="py-1.5 pr-4 text-text-tertiary">{param.unit}</td>
                    <td className="py-1.5 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-2xs uppercase ${ool ? "bg-danger/12 text-danger" : "bg-success/12 text-success"}`}>
                        {ool ? "OOL" : "OK"}
                      </span>
                    </td>
                    <td className={`py-1.5 pr-4 ${parseFloat(dev) > 0 ? "text-brand" : "text-warning"}`}>{dev}%</td>
                    <td className="py-1.5 pr-4 text-text-secondary">{ops[i % ops.length]}</td>
                    <td className="py-1.5 text-text-tertiary">
                      {ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
