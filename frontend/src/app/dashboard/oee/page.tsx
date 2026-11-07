"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { OEEGauge } from "@/components/ui/OEEGauge";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useOEE7Day, useOEEPerMachine } from "@/hooks/api";
import { MOCK_MACHINE_OEE_HOURLY } from "@/lib/mock-data";
import { TrendingUp, TrendingDown, Award, AlertCircle } from "lucide-react";

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
  axis:      "#B0C4CE",
};

const MTTR_MOCK: Record<string, number> = {
  "mach-cnc-001":   27,
  "mach-press-001": 20,
  "mach-weld-001":  48,
  "mach-qc-001":     8,
};

function oeeColor(v: number) {
  if (v >= 0.85) return T.success;
  if (v >= 0.65) return T.brand;
  if (v >= 0.50) return T.warning;
  return T.danger;
}

function oeeLabel(v: number) {
  if (v >= 0.85) return "World Class";
  if (v >= 0.65) return "Good";
  if (v >= 0.50) return "Fair";
  return "Poor";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export default function OEEPage() {
  const { data: trend7Day, isLoading: trendLoading }         = useOEE7Day();
  const { data: perMachine, isLoading: perMachineLoading }   = useOEEPerMachine();

  const floorOEE = useMemo(() => {
    if (!perMachine || perMachine.length === 0) return 0;
    return perMachine.reduce((s, m) => s + (m.oee.oee ?? 0), 0) / perMachine.length;
  }, [perMachine]);

  const bestMachine  = useMemo(() => perMachine?.reduce((b, m) => ((m.oee.oee ?? 0) > (b.oee.oee ?? 0) ? m : b), perMachine[0]), [perMachine]);
  const worstMachine = useMemo(() => perMachine?.reduce((w, m) => ((m.oee.oee ?? 0) < (w.oee.oee ?? 0) ? m : w), perMachine[0]), [perMachine]);

  const avg7DayOEE = useMemo(() => {
    const days = trend7Day ?? [];
    if (!days.length) return 0;
    return days.reduce((s, d) => s + (d.oee ?? 0), 0) / days.length;
  }, [trend7Day]);

  const bandCounts = useMemo(() => {
    const days = trend7Day ?? [];
    return {
      worldClass: days.filter(d => (d.oee ?? 0) >= 0.85).length,
      good:       days.filter(d => (d.oee ?? 0) >= 0.65 && (d.oee ?? 0) < 0.85).length,
      fair:       days.filter(d => (d.oee ?? 0) >= 0.50 && (d.oee ?? 0) < 0.65).length,
      poor:       days.filter(d => (d.oee ?? 0) <  0.50).length,
      total:      days.length,
    };
  }, [trend7Day]);

  const trendOption = useMemo(() => {
    const labels      = (trend7Day ?? []).map(d => formatDate(d.period_start));
    const oeeVals     = (trend7Day ?? []).map(d => Number(((d.oee ?? 0) * 100).toFixed(1)));
    const availVals   = (trend7Day ?? []).map(d => Number((d.availability * 100).toFixed(1)));
    const perfVals    = (trend7Day ?? []).map(d => Number(((d.performance ?? 0) * 100).toFixed(1)));

    return {
      backgroundColor: "transparent",
      grid: { left: 48, right: 16, top: 24, bottom: 44 },
      legend: {
        data: ["OEE", "Availability", "Performance"],
        bottom: 0,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: T.muted, fontFamily: "IBM Plex Mono", fontSize: 11 },
      },
      xAxis: {
        type: "category" as const,
        data: labels,
        axisLabel: { color: T.muted, fontFamily: "IBM Plex Mono", fontSize: 10 },
        axisLine: { lineStyle: { color: T.border } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value" as const,
        min: 0, max: 100,
        axisLabel: { color: T.muted, fontFamily: "IBM Plex Mono", fontSize: 10, formatter: (v: number) => `${v}%` },
        splitLine: { lineStyle: { color: T.grid, type: "dashed" } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series: [
        {
          name: "OEE", type: "line" as const, data: oeeVals, smooth: 0.4,
          lineStyle: { color: T.brand, width: 2.5, shadowColor: T.brand + "30", shadowBlur: 6 },
          itemStyle: { color: T.brand },
          areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: T.brand + "22" }, { offset: 1, color: T.brand + "00" }] } },
          symbol: "circle", symbolSize: 5,
          markLine: {
            silent: true, symbol: "none",
            data: [{ yAxis: 85, lineStyle: { color: T.success, type: "dashed", width: 1.5 }, label: { formatter: "Target 85%", fontSize: 10, color: T.success, fontFamily: "IBM Plex Mono" } }],
          },
        },
        {
          name: "Availability", type: "line" as const, data: availVals, smooth: 0.4,
          lineStyle: { color: T.success, width: 1.5 },
          itemStyle: { color: T.success },
          symbol: "circle", symbolSize: 4,
        },
        {
          name: "Performance", type: "line" as const, data: perfVals, smooth: 0.4,
          lineStyle: { color: T.warning, width: 1.5 },
          itemStyle: { color: T.warning },
          symbol: "circle", symbolSize: 4,
        },
      ],
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: T.bg, borderColor: T.border, borderRadius: 8,
        textStyle: { color: T.text, fontFamily: "IBM Plex Mono", fontSize: 11 },
      },
    };
  }, [trend7Day]);

  const hourlyStackOption = useMemo(() => {
    const hours = MOCK_MACHINE_OEE_HOURLY.map((_, i) => `${String(6 + i).padStart(2, "0")}:00`);
    const prodTime  = MOCK_MACHINE_OEE_HOURLY.map(h => +((h.oee ?? 0) * 100).toFixed(1));
    const perfLoss  = MOCK_MACHINE_OEE_HOURLY.map(h => +((h.availability * (1 - (h.performance ?? 0))) * 100).toFixed(1));
    const qualLoss  = MOCK_MACHINE_OEE_HOURLY.map(h => +((h.availability * (h.performance ?? 0) * (1 - (h.quality ?? 0))) * 100).toFixed(1));
    const availLoss = MOCK_MACHINE_OEE_HOURLY.map(h => +((1 - h.availability) * 100).toFixed(1));

    return {
      backgroundColor: "transparent",
      grid: { left: 48, right: 16, top: 12, bottom: 36 },
      xAxis: {
        type: "category" as const, data: hours,
        axisLabel: { color: T.muted, fontFamily: "IBM Plex Mono", fontSize: 10 },
        axisLine: { lineStyle: { color: T.border } }, axisTick: { show: false },
      },
      yAxis: {
        type: "value" as const, min: 0, max: 100,
        axisLabel: { color: T.muted, fontFamily: "IBM Plex Mono", fontSize: 10, formatter: (v: number) => `${v}%` },
        splitLine: { lineStyle: { color: T.grid, type: "dashed" } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      legend: {
        data: ["Productive Time", "Quality Loss", "Perf Loss", "Avail Loss"],
        bottom: 0, icon: "rect", itemWidth: 10, itemHeight: 8,
        textStyle: { color: T.muted, fontFamily: "IBM Plex Mono", fontSize: 10 },
      },
      series: [
        { name: "Productive Time", type: "bar" as const, stack: "oee", data: prodTime,  itemStyle: { color: T.success },  barMaxWidth: 40 },
        { name: "Quality Loss",    type: "bar" as const, stack: "oee", data: qualLoss,  itemStyle: { color: T.brand + "AA" }, barMaxWidth: 40 },
        { name: "Perf Loss",       type: "bar" as const, stack: "oee", data: perfLoss,  itemStyle: { color: T.warning + "AA" }, barMaxWidth: 40 },
        { name: "Avail Loss",      type: "bar" as const, stack: "oee", data: availLoss, itemStyle: { color: T.danger + "AA" },  barMaxWidth: 40 },
      ],
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: T.bg, borderColor: T.border, borderRadius: 8,
        textStyle: { color: T.text, fontFamily: "IBM Plex Mono", fontSize: 11 },
      },
    };
  }, []);

  const kpiCards = useMemo(() => [
    {
      label: "Floor OEE",
      value: `${(floorOEE * 100).toFixed(1)}%`,
      sub: oeeLabel(floorOEE),
      color: oeeColor(floorOEE),
      bg: oeeColor(floorOEE) + "15",
      icon: Award,
    },
    {
      label: "Best Machine",
      value: bestMachine ? `${((bestMachine.oee.oee ?? 0) * 100).toFixed(0)}%` : "—",
      sub: bestMachine?.name ?? "—",
      color: T.success,
      bg: T.successDim,
      icon: TrendingUp,
    },
    {
      label: "Worst Machine",
      value: worstMachine ? `${((worstMachine.oee.oee ?? 0) * 100).toFixed(0)}%` : "—",
      sub: worstMachine?.name ?? "—",
      color: T.danger,
      bg: T.dangerDim,
      icon: AlertCircle,
    },
    {
      label: "7-Day Avg OEE",
      value: `${(avg7DayOEE * 100).toFixed(1)}%`,
      sub: avg7DayOEE >= 0.85 ? "▲ On target" : `▼ ${((0.85 - avg7DayOEE) * 100).toFixed(1)}pp below target`,
      color: avg7DayOEE >= 0.85 ? T.success : T.warning,
      bg: avg7DayOEE >= 0.85 ? T.successDim : T.warningDim,
      icon: TrendingDown,
    },
  ], [floorOEE, bestMachine, worstMachine, avg7DayOEE]);

  const OEE_BANDS = [
    { label: "World Class", threshold: "≥ 85%",  color: T.success, count: bandCounts.worldClass },
    { label: "Good",        threshold: "65–84%", color: T.brand,   count: bandCounts.good },
    { label: "Fair",        threshold: "50–64%", color: T.warning,  count: bandCounts.fair },
    { label: "Poor",        threshold: "< 50%",  color: T.danger,   count: bandCounts.poor },
  ];

  return (
    <div className="max-w-[1280px] mx-auto space-y-5 pb-10">

      <div>
        <h1 className="text-lg font-semibold text-text-primary">OEE Deep Dive</h1>
        <p className="font-mono text-xs text-text-tertiary mt-0.5">7-day trend · machine comparison · performance targets</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map(({ label, value, sub, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-card flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                <Icon size={13} style={{ color }} />
              </div>
            </div>
            <span className="font-mono text-2xl font-black leading-none tabular-nums" style={{ color }}>{value}</span>
            <span className="font-mono text-2xs text-text-disabled">{sub}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl p-5 shadow-card">
          <h2 className="text-sm font-semibold text-text-primary mb-1">7-Day OEE Trend</h2>
          <p className="font-mono text-2xs text-text-disabled mb-3">OEE · Availability · Performance vs 85% target</p>
          {trendLoading ? <LoadingCard rows={4} /> : (
            <ReactECharts option={trendOption} style={{ height: 250 }} opts={{ renderer: "svg" }} />
          )}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-card">
          <h2 className="text-sm font-semibold text-text-primary mb-4">OEE Band Distribution</h2>
          <div className="space-y-3">
            {OEE_BANDS.map(({ label, threshold, color, count }) => {
              const pct = bandCounts.total > 0 ? (count / bandCounts.total) * 100 : 0;
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                      <span className="font-sans text-xs text-text-secondary">{label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-text-disabled">{threshold}</span>
                      <span className="font-mono text-xs font-bold" style={{ color }}>{count}d</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-border">
            <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mb-2">Shift Target</p>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-black" style={{ color: T.success }}>85%</span>
              <span className="font-mono text-xs text-text-disabled">OEE world class</span>
            </div>
            <p className="font-mono text-2xs mt-1" style={{ color: avg7DayOEE >= 0.85 ? T.success : T.warning }}>
              {avg7DayOEE >= 0.85 ? `▲ On target (${(avg7DayOEE * 100).toFixed(1)}% avg)` : `▼ ${((0.85 - avg7DayOEE) * 100).toFixed(1)}pp below target`}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-xs font-bold text-text-primary">Machine OEE Comparison — Current Shift</h2>
        </div>
        {perMachineLoading ? <LoadingCard rows={3} /> : (
          <div>
            <div className="grid grid-cols-[1fr_6rem_8rem_5rem_5rem_5rem_5rem_6rem] gap-3 px-5 py-2.5 bg-bg-subtle border-b border-border">
              {["Machine","Status","OEE","Avail","Perf","Quality","MTTR","vs Target"].map(h => (
                <span key={h} className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{h}</span>
              ))}
            </div>
            {(perMachine ?? []).map(m => {
              const oeeVal  = m.oee.oee ?? 0;
              const avail   = m.oee.availability ?? 0;
              const perf    = m.oee.performance ?? 0;
              const qual    = m.oee.quality ?? 0;
              const color   = oeeColor(oeeVal);
              const delta   = oeeVal - 0.85;
              const mttr    = MTTR_MOCK[m.machine_id] ?? 0;
              return (
                <div key={m.machine_id} className="grid grid-cols-[1fr_6rem_8rem_5rem_5rem_5rem_5rem_6rem] gap-3 items-center px-5 py-3.5 border-b border-border last:border-0 hover:bg-bg-subtle transition-colors">
                  <div className="min-w-0">
                    <p className="font-sans text-xs font-bold text-text-primary truncate">{m.name}</p>
                    <p className="font-mono text-2xs text-text-disabled">{m.machine_id}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-2xs rounded-full px-2 py-0.5 w-fit" style={{ background: color + "18", color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                    {oeeLabel(oeeVal)}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-2 rounded-full bg-bg-muted overflow-hidden shrink-0">
                      <div className="h-full rounded-full" style={{ width: `${oeeVal * 100}%`, backgroundColor: color }} />
                    </div>
                    <span className="font-mono text-xs font-bold tabular-nums" style={{ color }}>{(oeeVal * 100).toFixed(0)}%</span>
                  </div>
                  <span className="font-mono text-xs text-text-secondary tabular-nums">{(avail * 100).toFixed(0)}%</span>
                  <span className="font-mono text-xs text-text-secondary tabular-nums">{(perf * 100).toFixed(0)}%</span>
                  <span className="font-mono text-xs text-text-secondary tabular-nums">{(qual * 100).toFixed(0)}%</span>
                  <span className="font-mono text-xs text-text-secondary tabular-nums">{mttr} min</span>
                  <span className="font-mono text-xs font-bold tabular-nums" style={{ color: delta >= 0 ? T.success : T.danger }}>
                    {delta >= 0 ? "▲" : "▼"} {Math.abs(delta * 100).toFixed(0)}pp
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-5 shadow-card">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Hourly OEE Breakdown — Today</h2>
        <p className="font-mono text-2xs text-text-disabled mb-3">Stacked loss components: availability / performance / quality / productive time</p>
        <ReactECharts option={hourlyStackOption} style={{ height: 220 }} opts={{ renderer: "svg" }} />
      </div>

      {!perMachineLoading && perMachine && perMachine.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-3">OEE Gauges — Current Shift</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {perMachine.map(m => (
              <div key={m.machine_id} className="bg-white rounded-xl p-4 shadow-card flex flex-col items-center gap-1">
                <OEEGauge value={m.oee.oee ?? 0} label={m.name.split(" ").slice(0,2).join(" ")} size={120} />
                <div className="grid grid-cols-3 gap-2 w-full mt-1 pt-2 border-t border-border">
                  {[
                    { l: "A", v: m.oee.availability, c: T.brand },
                    { l: "P", v: m.oee.performance,  c: T.warning },
                    { l: "Q", v: m.oee.quality,       c: T.success },
                  ].map(({ l, v, c }) => (
                    <div key={l} className="text-center">
                      <p className="font-mono text-xs font-bold" style={{ color: c }}>{((v ?? 0) * 100).toFixed(0)}%</p>
                      <p className="font-mono text-2xs text-text-disabled">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
