"use client";

import { useState } from "react";
import { PLANTS, ENTERPRISE_SUMMARY, type PlantConfig } from "@/lib/enterprise-config";
import ReactECharts from "echarts-for-react";
import {
  Factory, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Minus, ArrowRight, Globe, Zap, Shield, Clock, Building2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function lcg(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

const STATUS_CONFIG = {
  running: { label: "Running", color: "#1A7A40", bg: "#E8F5EC", dot: "bg-success" },
  partial:  { label: "Partial", color: "#A85E00", bg: "#FEF0D6", dot: "bg-warning" },
  stopped:  { label: "Stopped", color: "#CC1800", bg: "#FDE8E4", dot: "bg-danger"  },
};

function PlantCard({ plant, rank }: { plant: PlantConfig; rank: number }) {
  const st = STATUS_CONFIG[plant.status];
  const oeeGap = plant.oeeTarget - plant.oee;
  const outputPct = Math.round((plant.outputToday / plant.outputTarget) * 100);

  const rng = lcg(plant.id.charCodeAt(5) * 7);
  const sparkData = Array.from({ length: 12 }, () => 60 + rng() * 30);

  const sparkOpt = {
    grid: { top: 0, bottom: 0, left: 0, right: 0 },
    xAxis: { type: "category" as const, show: false, data: sparkData.map((_, i) => i) },
    yAxis: { type: "value" as const, show: false },
    series: [{
      type: "line",
      data: sparkData,
      smooth: true,
      symbol: "none",
      lineStyle: { color: plant.industryColor, width: 1.5 },
      areaStyle: { color: plant.industryColor + "22" },
    }],
  };

  return (
    <div className="bg-white border border-border rounded-xl p-5 flex flex-col gap-4 hover:shadow-card transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xl"
               style={{ background: plant.industryColor + "18" }}>
            {plant.industryEmoji}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-2xs text-muted font-semibold">#{rank}</span>
              <span className="font-heading text-sm font-bold text-text">{plant.name}</span>
            </div>
            <span className="font-mono text-2xs text-muted">{plant.location} · {plant.industry}</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-mono font-semibold"
              style={{ background: st.bg, color: st.color }}>
          <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />
          {st.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col">
          <span className="font-mono text-2xs text-muted mb-0.5">OEE</span>
          <span className="font-heading text-lg font-bold text-text">{plant.oee}%</span>
          <span className="font-mono text-2xs" style={{ color: oeeGap > 5 ? "#CC1800" : "#1A7A40" }}>
            {oeeGap > 0 ? `${oeeGap.toFixed(1)}% gap` : "On target"}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="font-mono text-2xs text-muted mb-0.5">Output</span>
          <span className="font-heading text-lg font-bold text-text">{outputPct}%</span>
          <span className="font-mono text-2xs text-muted">{plant.outputToday.toLocaleString()} {plant.unit}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-mono text-2xs text-muted mb-0.5">Alerts</span>
          <span className="font-heading text-lg font-bold" style={{ color: plant.openAlerts > 2 ? "#CC1800" : plant.openAlerts > 0 ? "#A85E00" : "#1A7A40" }}>
            {plant.openAlerts}
          </span>
          <span className="font-mono text-2xs text-muted">open</span>
        </div>
      </div>

      <div className="h-12">
        <ReactECharts option={sparkOpt} style={{ height: "100%", width: "100%" }} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-2xs text-muted">Rev at risk:</span>
        <span className="font-mono text-2xs font-bold text-danger">{plant.revenueAtRisk}</span>
        <span className="font-mono text-2xs text-muted ml-auto">{plant.machinesOnline}/{plant.machines} machines</span>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border">
        <span className="font-mono text-2xs text-muted">{plant.shift}</span>
        <Link href={`/dashboard?plant=${plant.id}`}
              className="inline-flex items-center gap-1 font-mono text-2xs text-brand hover:opacity-80 transition-opacity">
          View plant <ArrowRight size={10} />
        </Link>
      </div>
    </div>
  );
}

function EnterpriseOEEChart() {
  const weeks = ["W1", "W2", "W3", "W4", "W5", "W6"];
  const series = PLANTS.map(p => ({
    name: p.name,
    type: "line" as const,
    data: p.oeeWeekTrend,
    smooth: true,
    symbol: "circle",
    symbolSize: 5,
    lineStyle: { color: p.industryColor, width: 2 },
    itemStyle: { color: p.industryColor },
  }));

  const opt = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", textStyle: { fontSize: 11, fontFamily: "IBM Plex Mono" } },
    legend: {
      bottom: 0, textStyle: { fontSize: 10, fontFamily: "IBM Plex Mono" }, itemWidth: 12, itemHeight: 2,
    },
    grid: { top: 12, bottom: 50, left: 40, right: 16 },
    xAxis: { type: "category", data: weeks, axisLabel: { fontSize: 10, fontFamily: "IBM Plex Mono" }, axisLine: { lineStyle: { color: "#E8E4DF" } } },
    yAxis: { type: "value", min: 55, max: 100, axisLabel: { fontSize: 10, fontFamily: "IBM Plex Mono", formatter: "{value}%" }, splitLine: { lineStyle: { color: "#F4F0EC" } } },
    series,
  };

  return <ReactECharts option={opt} style={{ height: "280px", width: "100%" }} />;
}

function RevenueRiskWaterfall() {
  const data = PLANTS.map(p => ({
    name: p.name.replace("Sunrise ", ""),
    value: parseFloat(p.revenueAtRisk.replace("₹", "").replace("L", "")),
    color: p.industryColor,
  }));

  const opt = {
    backgroundColor: "transparent",
    tooltip: { formatter: (p: { name: string; value: number }) => `${p.name}: ₹${p.value}L at risk`, textStyle: { fontSize: 11, fontFamily: "IBM Plex Mono" } },
    grid: { top: 8, bottom: 60, left: 8, right: 8 },
    xAxis: { type: "category", data: data.map(d => d.name), axisLabel: { fontSize: 9, fontFamily: "IBM Plex Mono", rotate: 15 } },
    yAxis: { type: "value", axisLabel: { fontSize: 10, fontFamily: "IBM Plex Mono", formatter: "₹{value}L" }, splitLine: { lineStyle: { color: "#F4F0EC" } } },
    series: [{
      type: "bar",
      data: data.map(d => ({ value: d.value, itemStyle: { color: d.color, borderRadius: [3, 3, 0, 0] } })),
      barWidth: "40%",
    }],
  };

  return <ReactECharts option={opt} style={{ height: "200px", width: "100%" }} />;
}

function GlobalKPIBand() {
  const totalRev = PLANTS.reduce((s, p) => s + parseFloat(p.revenueAtRisk.replace("₹", "").replace("L", "")), 0);
  const machineUtil = Math.round((ENTERPRISE_SUMMARY.machinesOnline / ENTERPRISE_SUMMARY.totalMachines) * 100);
  const avgAvail = Math.round(PLANTS.reduce((s, p) => s + p.availability, 0) / PLANTS.length);
  const avgQuality = +(PLANTS.reduce((s, p) => s + p.quality, 0) / PLANTS.length).toFixed(1);

  const kpis = [
    { label: "Avg Enterprise OEE", value: `${ENTERPRISE_SUMMARY.avgOEE}%`, sub: "across 4 plants", trend: "up", icon: TrendingUp },
    { label: "Total Revenue at Risk", value: `₹${totalRev.toFixed(1)}L`, sub: "today", trend: "down", icon: AlertTriangle },
    { label: "Machine Utilisation", value: `${machineUtil}%`, sub: `${ENTERPRISE_SUMMARY.machinesOnline}/${ENTERPRISE_SUMMARY.totalMachines} online`, trend: "neutral", icon: Zap },
    { label: "Avg Availability", value: `${avgAvail}%`, sub: "fleet-wide", trend: "up", icon: Clock },
    { label: "Avg Quality Rate", value: `${avgQuality}%`, sub: "all plants", trend: "up", icon: Shield },
    { label: "Open Alerts", value: `${ENTERPRISE_SUMMARY.totalAlerts}`, sub: "critical items", trend: ENTERPRISE_SUMMARY.totalAlerts > 5 ? "down" : "neutral", icon: AlertTriangle },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map(kpi => {
        const Icon = kpi.icon;
        return (
          <div key={kpi.label} className="bg-white border border-border rounded-xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={12} className="text-muted" />
              <span className="font-mono text-2xs text-muted">{kpi.label}</span>
            </div>
            <span className="font-heading text-xl font-bold text-text">{kpi.value}</span>
            <div className="flex items-center gap-1">
              {kpi.trend === "up" && <TrendingUp size={10} className="text-success" />}
              {kpi.trend === "down" && <TrendingDown size={10} className="text-danger" />}
              {kpi.trend === "neutral" && <Minus size={10} className="text-muted" />}
              <span className="font-mono text-2xs text-muted">{kpi.sub}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function EnterprisePage() {
  const [sortBy, setSortBy] = useState<"oee" | "output" | "alerts" | "revenue">("oee");

  const sorted = [...PLANTS].sort((a, b) => {
    switch (sortBy) {
      case "oee": return b.oee - a.oee;
      case "output": return (b.outputToday / b.outputTarget) - (a.outputToday / a.outputTarget);
      case "alerts": return b.openAlerts - a.openAlerts;
      case "revenue": return parseFloat(b.revenueAtRisk.replace("₹","").replace("L","")) - parseFloat(a.revenueAtRisk.replace("₹","").replace("L",""));
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe size={16} className="text-brand" />
            <span className="font-mono text-2xs text-brand font-semibold uppercase tracking-widest">Enterprise</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-text">{ENTERPRISE_SUMMARY.companyName}</h1>
          <p className="font-mono text-xs text-muted mt-0.5">{ENTERPRISE_SUMMARY.plants} plants · {ENTERPRISE_SUMMARY.totalMachines} machines · Multi-industry operations</p>
        </div>
        <div className="flex items-center gap-2">
          <Building2 size={13} className="text-muted" />
          <span className="font-mono text-xs text-muted">Command Center</span>
        </div>
      </div>

      <GlobalKPIBand />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-sm font-bold text-text">OEE Trend — All Plants</h2>
            <span className="font-mono text-2xs text-muted">Last 6 weeks</span>
          </div>
          <EnterpriseOEEChart />
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-sm font-bold text-text">Revenue at Risk</h2>
            <span className="font-mono text-2xs text-muted">Today</span>
          </div>
          <RevenueRiskWaterfall />
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="font-mono text-2xs text-muted">Total</span>
            <span className="font-mono text-sm font-bold text-danger">
              ₹{PLANTS.reduce((s, p) => s + parseFloat(p.revenueAtRisk.replace("₹","").replace("L","")), 0).toFixed(1)}L
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h2 className="font-heading text-sm font-bold text-text">Plant Status</h2>
          <div className="flex items-center gap-1 bg-bgMuted rounded-lg p-1">
            {(["oee", "output", "alerts", "revenue"] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                className={cn(
                  "px-3 py-1 rounded-md font-mono text-2xs capitalize transition-all",
                  sortBy === s ? "bg-white text-text shadow-sm font-semibold" : "text-muted hover:text-text"
                )}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {sorted.map((plant, i) => <PlantCard key={plant.id} plant={plant} rank={i + 1} />)}
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-sm font-bold text-text">Enterprise Health Indicators</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-sans">
            <thead>
              <tr className="border-b border-border">
                {["Plant", "Industry", "OEE", "Avail", "Perf", "Quality", "Target Gap", "Status", "Certifications"].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-mono text-2xs text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLANTS.map((p) => {
                const gap = p.oeeTarget - p.oee;
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-bgSubtle transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span>{p.industryEmoji}</span>
                        <span className="font-semibold text-text">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-2xs text-muted">{p.industry}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold" style={{ color: p.oee >= p.oeeTarget * 0.95 ? "#1A7A40" : p.oee >= p.oeeTarget * 0.85 ? "#A85E00" : "#CC1800" }}>
                        {p.oee}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-2xs">{p.availability}%</td>
                    <td className="py-2.5 px-3 font-mono text-2xs">{p.performance}%</td>
                    <td className="py-2.5 px-3 font-mono text-2xs">{p.quality}%</td>
                    <td className="py-2.5 px-3">
                      <span className={cn("font-mono text-2xs font-semibold", gap > 5 ? "text-danger" : gap > 0 ? "text-warning" : "text-success")}>
                        {gap > 0 ? `−${gap.toFixed(1)}%` : "✓"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-2xs font-semibold"
                            style={{ background: STATUS_CONFIG[p.status].bg, color: STATUS_CONFIG[p.status].color }}>
                        {STATUS_CONFIG[p.status].label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {p.certifications.slice(0, 2).map(c => (
                          <span key={c} className="px-1.5 py-0.5 bg-bgMuted rounded font-mono text-2xs text-muted">{c}</span>
                        ))}
                        {p.certifications.length > 2 && (
                          <span className="px-1.5 py-0.5 bg-bgMuted rounded font-mono text-2xs text-muted">+{p.certifications.length - 2}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Plant Benchmarking", href: "/dashboard/plant-benchmarking", emoji: "🏆", desc: "League table & ranking" },
          { label: "Global Compliance", href: "/dashboard/global-compliance", emoji: "🛡", desc: "Cross-plant certifications" },
          { label: "Recipe Library", href: "/dashboard/recipe-library", emoji: "📋", desc: "Global process standards" },
          { label: "Enterprise Scheduling", href: "/dashboard/enterprise-scheduling", emoji: "🗓", desc: "Cross-plant order routing" },
        ].map(card => (
          <Link key={card.href} href={card.href}
                className="bg-white border border-border rounded-xl p-4 flex flex-col gap-2 hover:border-brand/40 hover:shadow-card transition-all group">
            <span className="text-2xl">{card.emoji}</span>
            <span className="font-heading text-sm font-bold text-text group-hover:text-brand transition-colors">{card.label}</span>
            <span className="font-mono text-2xs text-muted">{card.desc}</span>
            <ArrowRight size={12} className="text-muted group-hover:text-brand transition-colors mt-auto" />
          </Link>
        ))}
      </div>
    </div>
  );
}
