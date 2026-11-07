"use client";

import ReactECharts from "echarts-for-react";
import { useState } from "react";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

const PRODUCTS = ["ENG-MNT-V2", "BRK-ASY-X4", "SHAFT-V7", "FRAME-STL-02", "ARM-WELD-C3"];
const PERIODS = ["Today", "This Week", "Last Week", "This Month"];

interface WaterfallStep {
  label: string;
  value: number;
  type: "start" | "loss" | "end";
  category: string;
}

const MOCK_WATERFALL: WaterfallStep[] = [
  { label: "Input Qty", value: 1000, type: "start", category: "start" },
  { label: "Setup Scrap", value: -18, type: "loss", category: "process" },
  { label: "Machine Rework", value: -32, type: "loss", category: "machine" },
  { label: "OOL Measurement", value: -24, type: "loss", category: "quality" },
  { label: "Weld Defect", value: -15, type: "loss", category: "quality" },
  { label: "Assembly Error", value: -11, type: "loss", category: "process" },
  { label: "Incoming Material", value: -8, type: "loss", category: "material" },
  { label: "Final Yield", value: 892, type: "end", category: "end" },
];

const SCRAP_CATEGORIES = [
  { name: "Machine / Tool", value: 32, color: "#F05230" },
  { name: "Quality / Measurement", value: 39, color: "#CC1800" },
  { name: "Process / Operator", value: 29, color: "#A85E00" },
  { name: "Material / Incoming", value: 8, color: "#6B7280" },
];

const TREND_DAYS = ["Nov 1", "Nov 2", "Nov 3", "Nov 4", "Nov 5", "Nov 6"];
const YIELD_TREND: Record<string, number[]> = {
  "ENG-MNT-V2": [94.1, 93.8, 95.2, 92.6, 94.8, 89.2],
  "BRK-ASY-X4":  [91.0, 92.3, 90.4, 93.1, 91.7, 90.5],
  "SHAFT-V7":    [97.3, 96.8, 97.1, 96.5, 97.4, 97.0],
  "FRAME-STL-02":[88.2, 89.5, 87.8, 90.1, 88.6, 88.9],
  "ARM-WELD-C3": [93.6, 94.2, 92.8, 93.9, 94.1, 93.2],
};

const MACHINE_SCRAP = [
  { machine: "CNC-001", pcs: 23, pct: 2.3, top: "Bore OOL (11pcs)" },
  { machine: "PRESS-002", pcs: 15, pct: 1.5, top: "Burr / Edge (8pcs)" },
  { machine: "WELD-003", pcs: 32, pct: 3.2, top: "Weld Porosity (19pcs)" },
  { machine: "QC-004", pcs: 4, pct: 0.4, top: "Final Inspection (4pcs)" },
  { machine: "ASSY-005", pcs: 11, pct: 1.1, top: "Fitment Error (7pcs)" },
];

export default function YieldPage() {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS[0]);

  const totalInput = 1000;
  const totalOutput = 892;
  const totalScrap = totalInput - totalOutput;
  const yieldPct = ((totalOutput / totalInput) * 100).toFixed(1);
  const scrapPct = (100 - parseFloat(yieldPct)).toFixed(1);
  const reworkPct = "3.2";

  const waterfallData = (() => {
    let running = 0;
    return MOCK_WATERFALL.map(step => {
      if (step.type === "start") { running = step.value; return { name: step.label, value: [0, step.value], itemStyle: { color: "#2563EB" } }; }
      if (step.type === "end") return { name: step.label, value: [0, step.value], itemStyle: { color: "#1A7A40" } };
      const base = running + step.value;
      running = base;
      return { name: step.label, value: [base, running - step.value], itemStyle: { color: "#CC1800" } };
    });
  })();

  const waterfallOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      formatter: (params: { name: string; value: [number, number] }[]) => {
        const p = params[0];
        const diff = p.value[1] - p.value[0];
        return `<span style="color:#E5E7EB">${p.name}: <b>${diff > 0 ? "+" : ""}${diff}</b> pcs</span>`;
      },
      backgroundColor: "#0D1B2A", borderColor: "#1E3A5F", textStyle: { color: "#E5E7EB", fontSize: 11 },
    },
    grid: { left: 56, right: 20, top: 20, bottom: 60 },
    xAxis: { type: "category", data: MOCK_WATERFALL.map(s => s.label), axisLabel: { rotate: 25, color: "#6B7280", fontSize: 10 }, axisLine: { lineStyle: { color: "#1E3A5F" } } },
    yAxis: { type: "value", axisLabel: { color: "#6B7280", fontSize: 10 }, splitLine: { lineStyle: { color: "#1E3A5F", type: "dashed" } } },
    series: [{ type: "bar", data: waterfallData, barWidth: "55%", label: { show: true, position: "top", color: "#9CA3AF", fontSize: 9, formatter: (p: { value: [number, number] }) => { const d = p.value[1] - p.value[0]; return d !== 0 ? `${d > 0 ? "" : ""}${d}` : ""; } } }],
  };

  const trendOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", backgroundColor: "#0D1B2A", borderColor: "#1E3A5F", textStyle: { color: "#E5E7EB", fontSize: 11 } },
    legend: { bottom: 0, textStyle: { color: "#9CA3AF", fontSize: 9 }, itemHeight: 8 },
    grid: { left: 48, right: 12, top: 12, bottom: 48 },
    xAxis: { type: "category", data: TREND_DAYS, axisLabel: { color: "#6B7280", fontSize: 10 }, axisLine: { lineStyle: { color: "#1E3A5F" } } },
    yAxis: { type: "value", min: 85, axisLabel: { color: "#6B7280", fontSize: 10, formatter: (v: number) => `${v}%` }, splitLine: { lineStyle: { color: "#1E3A5F", type: "dashed" } } },
    series: PRODUCTS.map((p, i) => ({
      name: p,
      type: "line",
      data: YIELD_TREND[p],
      symbol: "circle", symbolSize: 4,
      lineStyle: { width: p === selectedProduct ? 2 : 1, opacity: p === selectedProduct ? 1 : 0.4 },
      itemStyle: { color: ["#F05230", "#2563EB", "#1A7A40", "#A85E00", "#7C3AED"][i] },
    })),
  };

  const donutOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "item", formatter: "{b}: {c} pcs ({d}%)", backgroundColor: "#0D1B2A", borderColor: "#1E3A5F", textStyle: { color: "#E5E7EB", fontSize: 11 } },
    series: [{
      type: "pie", radius: ["50%", "78%"], center: ["50%", "50%"],
      label: { show: false },
      data: SCRAP_CATEGORIES.map(c => ({ name: c.name, value: c.value, itemStyle: { color: c.color } })),
    }],
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary">Yield & Loss Analysis</h1>
          <p className="font-sans text-xs text-text-tertiary mt-0.5">Yield waterfall, scrap tree, loss root-cause, and product-level trends</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
            className="font-mono text-xs bg-surface border border-border rounded-lg px-3 py-1.5 text-text-primary focus:border-brand focus:outline-none">
            {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
            className="font-mono text-xs bg-surface border border-border rounded-lg px-3 py-1.5 text-text-primary focus:border-brand focus:outline-none">
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "First Pass Yield", value: `${yieldPct}%`, sub: `${totalOutput} / ${totalInput} pcs`, color: parseFloat(yieldPct) >= 95 ? "text-success" : parseFloat(yieldPct) >= 90 ? "text-warning" : "text-danger" },
          { label: "Scrap Rate", value: `${scrapPct}%`, sub: `${totalScrap} pcs scrapped`, color: parseFloat(scrapPct) <= 3 ? "text-success" : parseFloat(scrapPct) <= 6 ? "text-warning" : "text-danger" },
          { label: "Rework Rate", value: `${reworkPct}%`, sub: "32 pcs reworked", color: parseFloat(reworkPct) <= 2 ? "text-success" : "text-warning" },
          { label: "Cost of Scrap", value: "₹18,640", sub: `${selectedPeriod.toLowerCase()}`, color: "text-text-primary" },
        ].map(k => (
          <div key={k.label} className="bg-surface border border-border rounded-xl p-3">
            <p className="font-mono text-2xs text-text-tertiary uppercase tracking-widest mb-1">{k.label}</p>
            <p className={`font-mono text-lg font-bold ${k.color}`}>{k.value}</p>
            <p className="font-sans text-2xs text-text-tertiary">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Waterfall chart */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-4">
          <p className="font-heading text-xs font-semibold text-text-secondary uppercase tracking-widest mb-3">Yield Waterfall — {selectedProduct} · {selectedPeriod}</p>
          <ReactECharts option={waterfallOption} style={{ height: 260 }} opts={{ renderer: "svg" }} />
          <div className="flex gap-4 mt-2">
            {[{ label: "Input", color: "#2563EB" }, { label: "Loss", color: "#CC1800" }, { label: "Yield", color: "#1A7A40" }].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: l.color }} />
                <span className="font-mono text-2xs text-text-tertiary">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrap by category donut */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="font-heading text-xs font-semibold text-text-secondary uppercase tracking-widest mb-3">Scrap by Root Cause</p>
          <ReactECharts option={donutOption} style={{ height: 180 }} opts={{ renderer: "svg" }} />
          <div className="mt-3 space-y-2">
            {SCRAP_CATEGORIES.map(c => (
              <div key={c.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
                  <span className="font-sans text-xs text-text-secondary truncate">{c.name}</span>
                </div>
                <span className="font-mono text-xs font-bold text-text-primary shrink-0">{c.value}pcs</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Yield trend */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="font-heading text-xs font-semibold text-text-secondary uppercase tracking-widest mb-3">Yield Trend — All Products (7 days)</p>
          <ReactECharts option={trendOption} style={{ height: 220 }} opts={{ renderer: "svg" }} />
        </div>

        {/* Machine scrap table */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="font-heading text-xs font-semibold text-text-secondary uppercase tracking-widest mb-3">Scrap by Machine</p>
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border">
                {["Machine", "Scrap Pcs", "Rate", "Top Defect"].map(h => (
                  <th key={h} className="text-left text-text-tertiary font-medium pb-2 pr-3 uppercase tracking-widest text-2xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MACHINE_SCRAP.sort((a, b) => b.pcs - a.pcs).map(m => (
                <tr key={m.machine} className="hover:bg-bg/40">
                  <td className="py-2 pr-3 text-text-primary font-semibold">{m.machine}</td>
                  <td className={`py-2 pr-3 font-bold ${m.pcs > 20 ? "text-danger" : m.pcs > 10 ? "text-warning" : "text-success"}`}>{m.pcs}</td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden min-w-[40px]">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(m.pct / 5 * 100, 100)}%`, background: m.pct > 3 ? "#CC1800" : m.pct > 1.5 ? "#A85E00" : "#1A7A40" }} />
                      </div>
                      <span className={`text-2xs ${m.pct > 3 ? "text-danger" : m.pct > 1.5 ? "text-warning" : "text-success"}`}>{m.pct}%</span>
                    </div>
                  </td>
                  <td className="py-2 text-text-tertiary text-2xs">{m.top}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-text-tertiary">Total scrap this {selectedPeriod.toLowerCase()}</span>
              <span className="font-bold text-danger">{MACHINE_SCRAP.reduce((s, m) => s + m.pcs, 0)} pcs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
