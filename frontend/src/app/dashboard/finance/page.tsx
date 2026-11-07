"use client";

import ReactECharts from "echarts-for-react";
import { PLANTS } from "@/lib/enterprise-config";
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  BarChart3,
  Target,
  Zap,
  AlertTriangle,
  Factory,
} from "lucide-react";

const PLANT_FINANCE = [
  {
    id: "plant-chennai",
    revenue: 68,
    cost: 41,
    margin: 39.7,
    costUnit: "₹661/part",
    oee: 72.4,
    oeeTarget: 85,
    gap: 8.4,
    oeePerL: 0.68,
    monthCosts: [38, 40, 39, 42, 41, 41],
    monthBudgets: [36, 37, 38, 38, 39, 38],
  },
  {
    id: "plant-hyderabad",
    revenue: 92,
    cost: 44,
    margin: 52.2,
    costUnit: "₹37/1000 tabs",
    oee: 88.1,
    oeeTarget: 90,
    gap: 1.1,
    oeePerL: 0.58,
    monthCosts: [42, 43, 44, 44, 43, 44],
    monthBudgets: [44, 44, 44, 44, 44, 44],
  },
  {
    id: "plant-bangalore",
    revenue: 54,
    cost: 32,
    margin: 40.7,
    costUnit: "₹664/PCB",
    oee: 79.6,
    oeeTarget: 82,
    gap: 2.8,
    oeePerL: 1.17,
    monthCosts: [30, 31, 32, 33, 32, 32],
    monthBudgets: [30, 30, 31, 31, 31, 31],
  },
  {
    id: "plant-pune",
    revenue: 38,
    cost: 28,
    margin: 26.3,
    costUnit: "₹226/m",
    oee: 65.8,
    oeeTarget: 75,
    gap: 16.3,
    oeePerL: 1.78,
    monthCosts: [24, 26, 27, 28, 29, 28],
    monthBudgets: [22, 22, 23, 24, 24, 24],
  },
];

const MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];

function costTrendOption() {
  const colors = ["#F05230", "#1A7A40", "#0057CC", "#7C3AED"];
  const series = PLANT_FINANCE.map((p, i) => {
    const plant = PLANTS.find((pl) => pl.id === p.id)!;
    return {
      name: plant.name.replace("Sunrise ", ""),
      type: "bar",
      stack: undefined,
      data: p.monthCosts,
      itemStyle: { color: colors[i], borderRadius: [3, 3, 0, 0] },
      barMaxWidth: 24,
    };
  });
  const budgetSeries = {
    name: "Budget",
    type: "line",
    data: PLANT_FINANCE[0].monthBudgets.map((_, i) =>
      PLANT_FINANCE.reduce((s, p) => s + p.monthBudgets[i], 0)
    ),
    lineStyle: { color: "#A85E00", type: "dashed", width: 2 },
    itemStyle: { color: "#A85E00" },
    symbol: "diamond",
    symbolSize: 6,
  };
  return {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", formatter: (params: any[]) => {
      let s = `<b>${params[0].name}</b><br/>`;
      params.forEach((p: any) => { s += `${p.marker}${p.seriesName}: ₹${p.value}L<br/>`; });
      return s;
    }},
    legend: { bottom: 0, textStyle: { fontFamily: "IBM Plex Mono", fontSize: 10, color: "#6A8A9A" } },
    grid: { top: 12, right: 12, bottom: 48, left: 48, containLabel: false },
    xAxis: { type: "category", data: MONTHS, axisLabel: { fontFamily: "IBM Plex Mono", fontSize: 10, color: "#6A8A9A" }, axisLine: { lineStyle: { color: "#E8E4DF" } } },
    yAxis: { type: "value", axisLabel: { fontFamily: "IBM Plex Mono", fontSize: 10, color: "#6A8A9A", formatter: "₹{value}L" }, splitLine: { lineStyle: { color: "#F4F0EC" } } },
    series: [...series, budgetSeries],
  };
}

function donutOption() {
  const data = [
    { name: "Materials",   value: 52, itemStyle: { color: "#F05230" } },
    { name: "Labor",       value: 24, itemStyle: { color: "#0057CC" } },
    { name: "Energy",      value: 11, itemStyle: { color: "#1A7A40" } },
    { name: "Overhead",    value: 8,  itemStyle: { color: "#A85E00" } },
    { name: "Maintenance", value: 5,  itemStyle: { color: "#7C3AED" } },
  ];
  const totalCr = 1.84;
  return {
    backgroundColor: "transparent",
    tooltip: { formatter: (p: any) => `${p.name}: ${p.value}% (₹${((totalCr * p.value) / 100).toFixed(2)}Cr)` },
    legend: {
      orient: "horizontal",
      bottom: 0,
      left: "center",
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontFamily: "IBM Plex Mono", fontSize: 9, color: "#6A8A9A" },
    },
    series: [{
      type: "pie",
      radius: ["44%", "70%"],
      center: ["50%", "44%"],
      data,
      label: { show: false },
      emphasis: { label: { show: false } },
    }],
    graphic: [{
      type: "text",
      left: "center",
      top: "35%",
      style: { text: "₹1.84Cr", fill: "#001C2E", fontSize: 13, fontWeight: "bold", fontFamily: "IBM Plex Mono" },
    }, {
      type: "text",
      left: "center",
      top: "47%",
      style: { text: "total cost", fill: "#6A8A9A", fontSize: 9, fontFamily: "IBM Plex Mono" },
    }],
  };
}

function budgetBarOption() {
  const plantNames = PLANT_FINANCE.map((p) => PLANTS.find((pl) => pl.id === p.id)!.name.replace("Sunrise ", "").replace("Electronics BLR", "BLR").replace("Pharma Hyd", "Hyd").replace("Textiles Pune", "Pune"));
  const variances = PLANT_FINANCE.map((p) => (((p.cost - (p.monthBudgets[5] * 1)) / (p.monthBudgets[5] * 1)) * 100).toFixed(1));
  return {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", formatter: (params: any[]) => {
      const p0 = params[0], p1 = params[1];
      const v = variances[p0.dataIndex];
      return `<b>${p0.name}</b><br/>${p0.marker}Budget: ₹${p0.value}L<br/>${p1.marker}Actual: ₹${p1.value}L<br/>Variance: ${Number(v) > 0 ? "+" : ""}${v}%`;
    }},
    legend: { bottom: 0, textStyle: { fontFamily: "IBM Plex Mono", fontSize: 10, color: "#6A8A9A" } },
    grid: { top: 24, right: 12, bottom: 48, left: 40 },
    xAxis: { type: "category", data: plantNames, axisLabel: { fontFamily: "IBM Plex Mono", fontSize: 9, color: "#6A8A9A" }, axisLine: { lineStyle: { color: "#E8E4DF" } } },
    yAxis: { type: "value", axisLabel: { fontFamily: "IBM Plex Mono", fontSize: 10, color: "#6A8A9A", formatter: "₹{value}L" }, splitLine: { lineStyle: { color: "#F4F0EC" } } },
    series: [
      {
        name: "Budget",
        type: "bar",
        data: PLANT_FINANCE.map((p) => p.monthBudgets[5]),
        itemStyle: { color: "#E8E4DF", borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 32,
        label: { show: false },
      },
      {
        name: "Actual",
        type: "bar",
        data: PLANT_FINANCE.map((p) => p.cost),
        itemStyle: { color: "#F05230", borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 32,
        label: {
          show: true,
          position: "top",
          formatter: (p: any) => `${Number(variances[p.dataIndex]) > 0 ? "+" : ""}${variances[p.dataIndex]}%`,
          fontFamily: "IBM Plex Mono",
          fontSize: 9,
          color: (p: any) => Number(variances[p.dataIndex]) > 0 ? "#CC1800" : "#1A7A40",
        },
      },
    ],
  };
}

function marginColor(pct: number) {
  if (pct >= 40) return { color: "#1A7A40", bg: "#E8F5EC" };
  if (pct >= 30) return { color: "#A85E00", bg: "#FEF0D6" };
  return { color: "#CC1800", bg: "#FDE8E4" };
}

export default function FinancePage() {
  const totalRevenue = PLANT_FINANCE.reduce((s, p) => s + p.revenue, 0);
  const totalCost    = PLANT_FINANCE.reduce((s, p) => s + p.cost, 0);
  const fleetMargin  = (((totalRevenue - totalCost) / totalRevenue) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-bg-subtle px-6 py-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
            <IndianRupee size={16} className="text-brand" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Finance &amp; Cost Intelligence</h1>
        </div>
        <p className="font-sans text-sm text-text-secondary ml-11">Production cost · OEE-adjusted P&amp;L · Budget vs Actual</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Production Cost (Month)",
            value: "₹1.84 Cr",
            sub: "Nov 2026",
            icon: <IndianRupee size={14} className="text-brand" />,
            color: "#001C2E",
          },
          {
            label: "Cost per Good Unit (avg)",
            value: "₹847",
            sub: "fleet-wide",
            icon: <BarChart3 size={14} className="text-brand" />,
            color: "#001C2E",
          },
          {
            label: "Budget Variance",
            value: "−₹12.4L",
            sub: "over budget",
            icon: <TrendingDown size={14} className="text-danger" />,
            color: "#CC1800",
          },
          {
            label: "OEE Savings Opportunity",
            value: "₹28.6L",
            sub: "if fleet hits 85% OEE",
            icon: <Zap size={14} className="text-success" />,
            color: "#1A7A40",
          },
        ].map((tile) => (
          <div key={tile.label} className="bg-white rounded-xl border border-border shadow-card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              {tile.icon}
              <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{tile.label}</p>
            </div>
            <p className="font-mono text-3xl font-bold" style={{ color: tile.color }}>{tile.value}</p>
            <p className="font-sans text-xs text-text-tertiary mt-0.5">{tile.sub}</p>
          </div>
        ))}
      </div>

      {/* Cost Trend + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-brand" />
            <h2 className="font-mono text-xs font-bold text-text-primary uppercase tracking-widest">Monthly Cost by Plant (₹L)</h2>
          </div>
          <ReactECharts option={costTrendOption()} style={{ height: 240 }} />
        </div>
        <div className="bg-white rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-brand" />
            <h2 className="font-mono text-xs font-bold text-text-primary uppercase tracking-widest">Cost Breakdown</h2>
          </div>
          <ReactECharts option={donutOption()} style={{ height: 240 }} />
        </div>
      </div>

      {/* P&L Table */}
      <div className="bg-white rounded-xl border border-border shadow-card mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Factory size={14} className="text-brand" />
            <h2 className="font-mono text-xs font-bold text-text-primary uppercase tracking-widest">Plant P&amp;L Summary — Nov 2026</h2>
          </div>
          <div className="font-mono text-2xs text-text-disabled">
            Fleet margin: <span className="font-bold text-text-primary">{fleetMargin}%</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-bg-subtle">
                {["Plant", "Industry", "Revenue", "Prod. Cost", "Gross Margin", "Cost / Unit", "OEE", "Cost Gap"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-mono text-2xs text-text-disabled uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLANT_FINANCE.map((pf) => {
                const plant = PLANTS.find((p) => p.id === pf.id)!;
                const mc = marginColor(pf.margin);
                return (
                  <tr key={pf.id} className="border-b border-border last:border-0 hover:bg-bg-subtle transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span style={{ color: plant.industryColor }}>{plant.industryEmoji}</span>
                        <div>
                          <p className="font-sans text-xs font-semibold text-text-primary whitespace-nowrap">{plant.name.replace("Sunrise ", "")}</p>
                          <p className="font-mono text-2xs text-text-disabled">{plant.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-2xs px-1.5 py-0.5 rounded" style={{ color: plant.industryColor, background: plant.industryColor + "15" }}>{plant.industry}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-text-primary">₹{pf.revenue}L</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">₹{pf.cost}L</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded" style={{ color: mc.color, background: mc.bg }}>{pf.margin}%</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary whitespace-nowrap">{pf.costUnit}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(pf.oee / 100) * 100}%`, background: pf.oee >= 85 ? "#1A7A40" : pf.oee >= 70 ? "#A85E00" : "#CC1800" }} />
                        </div>
                        <span className="font-mono text-xs font-bold" style={{ color: pf.oee >= 85 ? "#1A7A40" : pf.oee >= 70 ? "#A85E00" : "#CC1800" }}>{pf.oee}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {pf.gap > 5 && <AlertTriangle size={11} className="text-danger" />}
                        <span className="font-mono text-xs font-bold text-danger">₹{pf.gap}L</span>
                      </div>
                      <p className="font-mono text-2xs text-text-disabled">₹{pf.oeePerL}L / 1% OEE</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Budget vs Actual + OEE-to-Cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-brand" />
            <h2 className="font-mono text-xs font-bold text-text-primary uppercase tracking-widest">Budget vs Actual — Nov 2026</h2>
          </div>
          <ReactECharts option={budgetBarOption()} style={{ height: 220 }} />
        </div>

        <div className="bg-white rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-success" />
            <h2 className="font-mono text-xs font-bold text-text-primary uppercase tracking-widest">OEE → Cost Savings Potential</h2>
          </div>
          <div className="space-y-4">
            {PLANT_FINANCE.map((pf) => {
              const plant = PLANTS.find((p) => p.id === pf.id)!;
              const oeeGap = pf.oeeTarget - pf.oee;
              const savingsPotential = (oeeGap * pf.oeePerL).toFixed(1);
              return (
                <div key={pf.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: plant.industryColor }}>{plant.industryEmoji}</span>
                      <span className="font-sans text-xs font-medium text-text-primary">{plant.name.replace("Sunrise ", "").replace("Electronics BLR", "BLR").replace("Textiles Pune", "Pune").replace("Pharma Hyd", "Hyd")}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-success">₹{savingsPotential}L</span>
                      <span className="font-mono text-2xs text-text-disabled"> potential</span>
                    </div>
                  </div>
                  <div className="relative h-3 rounded-full bg-bg-muted overflow-hidden">
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(pf.oeeTarget / 100) * 100}%`, background: plant.industryColor + "30" }} />
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(pf.oee / 100) * 100}%`, background: plant.industryColor }} />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="font-mono text-2xs text-text-disabled">Current {pf.oee}%</span>
                    <span className="font-mono text-2xs text-text-secondary">Target {pf.oeeTarget}% (+{oeeGap.toFixed(1)}pp)</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-success/5 border border-success/20">
            <p className="font-sans text-xs text-success font-semibold">
              Fleet-wide target OEE of 85% = <span className="font-mono font-bold">₹28.6L/month</span> savings opportunity
            </p>
            <p className="font-mono text-2xs text-text-secondary mt-0.5">Pune alone: ₹16.3L if OEE improves 65.8% → 75%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
