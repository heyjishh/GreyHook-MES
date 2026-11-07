"use client";

import { useState } from "react";
import ReactECharts from "echarts-for-react";
import { FileText, Download, Clock, CheckCircle2, TrendingUp, TrendingDown, Minus } from "lucide-react";

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

function trendIcon(delta: number) {
  if (delta > 0) return <TrendingUp size={12} style={{ color: T.success }} />;
  if (delta < 0) return <TrendingDown size={12} style={{ color: T.danger }} />;
  return <Minus size={12} style={{ color: T.muted }} />;
}

const SHIFT_REPORT = {
  shift: "Shift 2",
  date: "2024-11-06",
  timeRange: "16:00 – 00:00",
  supervisor: "Arjun Nair",
  oee: 71.4,
  oee_prev: 68.9,
  availability: 83.0,
  availability_prev: 80.5,
  performance: 86.0,
  performance_prev: 85.7,
  quality: 92.4,
  quality_prev: 95.1,
  partsProduced: 621,
  partsProduced_prev: 598,
  partsTarget: 980,
  rejected: 47,
  rejected_prev: 29,
  downtime_min: 82,
  downtime_prev: 94,
  incidents: 1,
};

const MACHINE_PERF = [
  { id:"M-01", name:"AP-ENGINE-MOUNT-V2", oee:77, avail:87, perf:89, qual:95, parts:198, rej:9 },
  { id:"M-02", name:"AP-FRAME-WELD-01",   oee:59, avail:72, perf:82, qual:88, parts:142, rej:17 },
  { id:"M-03", name:"AP-PRESS-FORM-03",   oee:44, avail:61, perf:72, qual:72, parts:90,  rej:14 },
  { id:"M-04", name:"AP-ASSEM-LINE-A",    oee:87, avail:92, perf:94, qual:98, parts:191, rej:7 },
];

const DOWNTIME_LOG = [
  { machine:"M-03", start:"17:14", dur:28, reason:"Tooling failure",        cat:"Unplanned" },
  { machine:"M-02", start:"19:38", dur:15, reason:"Material shortage",      cat:"Unplanned" },
  { machine:"M-03", start:"19:00", dur:30, reason:"Dinner break",           cat:"Planned" },
  { machine:"M-01", start:"22:10", dur:9,  reason:"Quality inspection hold",cat:"Unplanned" },
];

const PAST_REPORTS = [
  { id:"SR-2024-089", shift:"Shift 1", date:"2024-11-06", oee:"78.2",  status:"generated" },
  { id:"SR-2024-088", shift:"Shift 3", date:"2024-11-05", oee:"64.1",  status:"generated" },
  { id:"SR-2024-087", shift:"Shift 2", date:"2024-11-05", oee:"69.8",  status:"generated" },
  { id:"SR-2024-086", shift:"Shift 1", date:"2024-11-05", oee:"81.3",  status:"generated" },
  { id:"SR-2024-085", shift:"Shift 3", date:"2024-11-04", oee:"58.4",  status:"generated" },
];

function oeeBarOption() {
  const hours = Array.from({ length: 8 }, (_, i) => `${16 + i}:00`);
  const oee   = [68, 72, 69, 73, 71, 70, 75, 71];
  const color = oee.map(v => v >= 85 ? T.success : v >= 70 ? T.brand : v >= 60 ? T.warning : T.danger);
  return {
    grid: { top: 12, bottom: 36, left: 44, right: 12 },
    xAxis: {
      type: "category", data: hours,
      axisLine: { lineStyle: { color: T.border } }, axisTick: { show: false },
      axisLabel: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
    },
    yAxis: {
      type: "value", min: 0, max: 100,
      axisLabel: { formatter: (v: number) => `${v}%`, fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
      splitLine: { lineStyle: { color: T.grid, type: "dashed" } },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [{
      type: "bar", data: oee,
      itemStyle: { borderRadius: [3,3,0,0] },
      colorBy: "data",
      color,
      barMaxWidth: 40,
      markLine: {
        silent: true, symbol: "none",
        data: [{ yAxis: 85, lineStyle: { color: T.success, type: "dashed", width: 1.5 }, label: { formatter: "Target 85%", fontSize: 9, color: T.success, fontFamily: "IBM Plex Mono" } }],
      },
    }],
    tooltip: {
      trigger: "axis", backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 8,
      textStyle: { color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono" },
      formatter: (p: { name: string; value: number }[]) => `${p[0].name}: <b>${p[0].value}%</b> OEE`,
    },
    animation: false,
  };
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");

  const r = SHIFT_REPORT;
  const paceColor = r.partsProduced / r.partsTarget >= 0.7 ? T.success : r.partsProduced / r.partsTarget >= 0.5 ? T.warning : T.danger;

  return (
    <div className="max-w-[1280px] mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Shift Reports</h1>
          <p className="font-mono text-xs text-text-tertiary mt-0.5">Auto-generated · PDF export · historical archive</p>
        </div>
        <div className="flex items-center gap-2">
          {(["current","history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="font-mono text-xs px-4 py-2 rounded-lg transition-all capitalize"
              style={activeTab === t ? { background: T.brand, color: "#fff", fontWeight: 700 } : { background: T.bgSubtle, color: T.muted, border: `1px solid ${T.border}` }}
            >
              {t === "current" ? "Current Shift" : "History"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "current" ? (
        <>
          {/* Report header card */}
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4 flex-wrap" style={{ background: T.bgSubtle }}>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <FileText size={16} style={{ color: T.brand }} />
                  <span className="font-mono text-xs font-bold text-text-primary uppercase tracking-widest">Shift Report</span>
                  <span className="font-mono text-2xs rounded-full px-2 py-0.5" style={{ background: T.successDim, color: T.success }}>Auto-generated</span>
                </div>
                <h2 className="font-sans text-xl font-bold text-text-primary">{r.shift} — {r.date}</h2>
                <div className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1.5 font-mono text-xs text-text-disabled">
                    <Clock size={11} />
                    {r.timeRange} IST
                  </span>
                  <span className="font-mono text-xs text-text-disabled">Supervisor: <span className="text-text-secondary font-semibold">{r.supervisor}</span></span>
                </div>
              </div>
              <button
                className="inline-flex items-center gap-2 font-mono text-xs font-bold rounded-lg px-4 py-2.5 transition-colors shrink-0"
                style={{ background: T.brand, color: "#fff" }}
              >
                <Download size={12} /> Export PDF
              </button>
            </div>

            {/* KPI summary row */}
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border border-b border-border">
              {[
                { label: "Overall OEE",    value: `${r.oee}%`,   delta: r.oee - r.oee_prev,                   unit: "pp" },
                { label: "Availability",   value: `${r.availability}%`, delta: r.availability - r.availability_prev, unit: "pp" },
                { label: "Performance",    value: `${r.performance}%`,  delta: r.performance - r.performance_prev,  unit: "pp" },
                { label: "Quality Rate",   value: `${r.quality}%`,      delta: r.quality - r.quality_prev,          unit: "pp" },
              ].map(({ label, value, delta, unit }) => (
                <div key={label} className="px-5 py-4">
                  <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mb-1.5">{label}</p>
                  <p className="font-mono text-2xl font-black tabular-nums text-text-primary">{value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {trendIcon(delta)}
                    <span className="font-mono text-2xs" style={{ color: delta > 0 ? T.success : delta < 0 ? T.danger : T.muted }}>
                      {delta > 0 ? "+" : ""}{delta.toFixed(1)} {unit} vs prev shift
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Production summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
              {[
                { label: "Parts Produced", value: r.partsProduced.toLocaleString(), sub: `of ${r.partsTarget.toLocaleString()} target`, color: paceColor },
                { label: "Parts Rejected", value: r.rejected.toString(),            sub: `${((r.rejected/(r.partsProduced+r.rejected))*100).toFixed(1)}% reject rate`, color: r.rejected > r.rejected_prev ? T.danger : T.success },
                { label: "Total Downtime", value: `${r.downtime_min} min`,          sub: `${r.downtime_prev - r.downtime_min} min better than prev`, color: r.downtime_min < r.downtime_prev ? T.success : T.danger },
                { label: "Incidents",      value: r.incidents.toString(),           sub: "quality or safety", color: r.incidents === 0 ? T.success : T.warning },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="px-5 py-4">
                  <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mb-1.5">{label}</p>
                  <p className="font-mono text-2xl font-black tabular-nums" style={{ color }}>{value}</p>
                  <p className="font-mono text-2xs text-text-disabled mt-1">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* OEE trend chart */}
          <div className="bg-white rounded-xl p-5 shadow-card">
            <h2 className="text-sm font-semibold text-text-primary mb-0.5">OEE by Hour</h2>
            <p className="font-mono text-2xs text-text-disabled mb-3">Shift 2 · 16:00 – 00:00 · target 85%</p>
            <ReactECharts option={oeeBarOption()} style={{ height: 180 }} opts={{ renderer: "svg" }} />
          </div>

          {/* Machine performance table */}
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h2 className="text-xs font-bold text-text-primary">Machine Performance</h2>
            </div>
            <div>
              <div className="grid grid-cols-[5rem_1fr_5rem_5rem_5rem_5rem_5rem_5rem] gap-3 px-5 py-2.5 bg-bg-subtle border-b border-border">
                {["ID","Machine","OEE","A","P","Q","Parts","Rej"].map((h) => (
                  <span key={h} className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{h}</span>
                ))}
              </div>
              {MACHINE_PERF.map((m) => {
                const oeeColor = m.oee >= 85 ? T.success : m.oee >= 70 ? T.brand : m.oee >= 60 ? T.warning : T.danger;
                return (
                  <div key={m.id} className="grid grid-cols-[5rem_1fr_5rem_5rem_5rem_5rem_5rem_5rem] gap-3 items-center px-5 py-3 border-b border-border last:border-0 hover:bg-bg-subtle transition-colors">
                    <span className="font-mono text-xs font-bold text-text-primary">{m.id}</span>
                    <span className="font-sans text-xs text-text-secondary truncate">{m.name}</span>
                    <span className="font-mono text-xs font-bold" style={{ color: oeeColor }}>{m.oee}%</span>
                    <span className="font-mono text-xs text-text-secondary">{m.avail}%</span>
                    <span className="font-mono text-xs text-text-secondary">{m.perf}%</span>
                    <span className="font-mono text-xs text-text-secondary">{m.qual}%</span>
                    <span className="font-mono text-xs text-text-secondary">{m.parts}</span>
                    <span className="font-mono text-xs" style={{ color: m.rej > 10 ? T.danger : T.muted }}>{m.rej}</span>
                  </div>
                );
              })}
              <div className="grid grid-cols-[5rem_1fr_5rem_5rem_5rem_5rem_5rem_5rem] gap-3 items-center px-5 py-3 bg-bg-subtle">
                <span className="font-mono text-2xs text-text-disabled col-span-2">Floor avg / total</span>
                <span className="font-mono text-xs font-bold text-text-primary">{(MACHINE_PERF.reduce((s,m)=>s+m.oee,0)/MACHINE_PERF.length).toFixed(0)}%</span>
                <span className="font-mono text-xs text-text-disabled">{(MACHINE_PERF.reduce((s,m)=>s+m.avail,0)/MACHINE_PERF.length).toFixed(0)}%</span>
                <span className="font-mono text-xs text-text-disabled">{(MACHINE_PERF.reduce((s,m)=>s+m.perf,0)/MACHINE_PERF.length).toFixed(0)}%</span>
                <span className="font-mono text-xs text-text-disabled">{(MACHINE_PERF.reduce((s,m)=>s+m.qual,0)/MACHINE_PERF.length).toFixed(0)}%</span>
                <span className="font-mono text-xs font-bold text-text-primary">{MACHINE_PERF.reduce((s,m)=>s+m.parts,0)}</span>
                <span className="font-mono text-xs text-text-primary">{MACHINE_PERF.reduce((s,m)=>s+m.rej,0)}</span>
              </div>
            </div>
          </div>

          {/* Downtime log */}
          <div className="bg-white rounded-xl shadow-card overflow-hidden pb-4">
            <div className="px-5 py-3.5 border-b border-border mb-1">
              <h2 className="text-xs font-bold text-text-primary">Downtime Events</h2>
            </div>
            <div className="px-5 space-y-2">
              {DOWNTIME_LOG.map((ev, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div
                    className="w-2.5 h-2.5 rounded-sm mt-1 shrink-0"
                    style={{ background: ev.cat === "Planned" ? T.warning + "90" : T.danger + "90" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-text-primary">{ev.machine}</span>
                      <span className="font-mono text-xs text-text-disabled">{ev.start}</span>
                      <span className="font-mono text-2xs rounded-full px-2 py-0.5" style={{ background: ev.cat === "Planned" ? T.warningDim : T.dangerDim, color: ev.cat === "Planned" ? T.warning : T.danger }}>{ev.cat}</span>
                    </div>
                    <p className="font-sans text-xs text-text-secondary mt-0.5">{ev.reason}</p>
                  </div>
                  <span className="font-mono text-xs text-text-disabled shrink-0">{ev.dur} min</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* History tab */
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-bold text-text-primary">Report Archive</h2>
            <span className="font-mono text-2xs text-text-disabled">Last 30 days · auto-retained</span>
          </div>
          <div>
            <div className="grid grid-cols-[8rem_6rem_8rem_6rem_1fr_8rem] gap-3 px-5 py-2.5 bg-bg-subtle border-b border-border">
              {["Report ID","Shift","Date","OEE","Status",""].map((h) => (
                <span key={h} className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{h}</span>
              ))}
            </div>
            {PAST_REPORTS.map((rep) => (
              <div key={rep.id} className="grid grid-cols-[8rem_6rem_8rem_6rem_1fr_8rem] gap-3 items-center px-5 py-3.5 border-b border-border last:border-0 hover:bg-bg-subtle transition-colors">
                <span className="font-mono text-xs font-bold text-text-primary">{rep.id}</span>
                <span className="font-mono text-xs text-text-secondary">{rep.shift}</span>
                <span className="font-mono text-xs text-text-disabled">{rep.date}</span>
                <span className="font-mono text-xs font-bold" style={{ color: parseFloat(rep.oee) >= 75 ? T.success : parseFloat(rep.oee) >= 65 ? T.warning : T.danger }}>{rep.oee}%</span>
                <span className="inline-flex items-center gap-1.5 font-mono text-2xs" style={{ color: T.success }}>
                  <CheckCircle2 size={10} /> {rep.status}
                </span>
                <button className="inline-flex items-center gap-1.5 font-mono text-2xs font-bold rounded-lg px-2.5 py-1.5 transition-colors" style={{ background: T.bgSubtle, color: T.muted, border: `1px solid ${T.border}` }}>
                  <Download size={10} /> PDF
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
