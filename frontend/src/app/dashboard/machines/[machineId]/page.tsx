"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { MachineStateChip } from "@/components/ui/MachineStateChip";
import { OEEGauge } from "@/components/ui/OEEGauge";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { createMachineStatusStream } from "@/lib/sse";
import {
  useMachineStatus,
  useMachineOEEHourly,
  useMachineDowntime,
  useCurrentProduction,
  useFactory,
} from "@/hooks/api";
import {
  MOCK_MACHINES,
  MOCK_MACHINE_UNITS_PER_HOUR,
  MOCK_MACHINE_OEE_HOURLY,
} from "@/lib/mock-data";
import type { MachineState } from "@/types/api";
import { ArrowLeft, Cpu, Tag, Radio, GitBranch, CheckCircle2 } from "lucide-react";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

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

const HOUR_LABELS = ["06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00"];

const MOCK_STATE_SEGMENTS = [
  { start: 0,    end: 135,  state: "running" as MachineState },
  { start: 135,  end: 162,  state: "fault"   as MachineState },
  { start: 162,  end: 242,  state: "running" as MachineState },
  { start: 242,  end: 262,  state: "idle"    as MachineState },
  { start: 262,  end: 362,  state: "running" as MachineState },
  { start: 362,  end: 362,  state: "fault"   as MachineState },
  { start: 362,  end: 480,  state: "running" as MachineState },
];

function segmentColor(state: MachineState) {
  return state === "running" ? T.success
    : state === "idle"    ? T.warning
    : state === "fault"   ? T.danger
    : T.disabled;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "open";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function MachineDetailPage() {
  const params    = useParams<{ machineId: string }>();
  const machineId = params.machineId;

  const { data: factory }                                       = useFactory();
  const { data: machineStatus, isLoading: statusLoading }       = useMachineStatus(machineId);
  const { data: oeeData,       isLoading: oeeLoading }          = useMachineOEEHourly(machineId);
  const { data: downtimeData,  isLoading: downtimeLoading }     = useMachineDowntime(machineId);
  const { data: production,    isLoading: prodLoading }         = useCurrentProduction();

  const [liveState, setLiveState] = useState<MachineState | null>(null);
  const streamRef = useRef<ReturnType<typeof createMachineStatusStream> | null>(null);

  const factoryId = IS_MOCK ? "fac-sunrise-001" : factory?.id;

  useEffect(() => {
    if (!factoryId || IS_MOCK) return;
    streamRef.current = createMachineStatusStream(factoryId, (event) => {
      if (event.machine_id === machineId) setLiveState(event.state);
    });
    return () => streamRef.current?.close();
  }, [factoryId, machineId]);

  const mockMachine   = MOCK_MACHINES.find((m) => m.id === machineId) ?? MOCK_MACHINES[0];
  const machineName   = IS_MOCK ? mockMachine.name   : (machineStatus?.name ?? machineId);
  const currentState  = (liveState ?? machineStatus?.current_state ?? (IS_MOCK ? "running" : undefined)) as MachineState | undefined;

  const oeeSource     = IS_MOCK ? MOCK_MACHINE_OEE_HOURLY : (oeeData ?? []);
  const latestOEE     = oeeSource[oeeSource.length - 1];
  const availability  = latestOEE?.availability ?? 0;
  const performance   = latestOEE?.performance  ?? 0;
  const quality       = latestOEE?.quality       ?? 0;
  const oee           = latestOEE?.oee           ?? 0;

  const unitsPerHour  = IS_MOCK ? MOCK_MACHINE_UNITS_PER_HOUR
    : (oeeData ?? []).map((_, i) => Math.round(40 + Math.sin(i) * 5 + i));

  const barChartOption = useMemo(() => ({
    backgroundColor: "transparent",
    grid: { left: 44, right: 16, top: 20, bottom: 36 },
    xAxis: {
      type: "category" as const,
      data: HOUR_LABELS,
      axisLabel: { color: T.muted, fontFamily: "IBM Plex Mono", fontSize: 10 },
      axisLine: { lineStyle: { color: T.border } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: { color: T.muted, fontFamily: "IBM Plex Mono", fontSize: 10 },
      splitLine: { lineStyle: { color: T.grid, type: "dashed" } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: "bar" as const,
      data: unitsPerHour.map((v: number) => ({
        value: v,
        itemStyle: {
          color: v >= 50 ? T.success : v >= 40 ? T.brand : T.danger,
          borderRadius: [3, 3, 0, 0],
        },
      })),
      barMaxWidth: 32,
      markLine: {
        silent: true,
        symbol: "none",
        data: [{ yAxis: 50, lineStyle: { color: T.success, type: "dashed", width: 1.5 }, label: { formatter: "Target 50", fontSize: 9, color: T.success, fontFamily: "IBM Plex Mono" } }],
      },
    }],
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: T.bg, borderColor: T.border, borderRadius: 8,
      textStyle: { color: T.text, fontFamily: "IBM Plex Mono", fontSize: 11 },
      formatter: (p: Array<{ name: string; value: number }>) => `${p[0].name}: <b>${p[0].value}</b> units`,
    },
  }), [unitsPerHour]);

  const oeeTrendOption = useMemo(() => {
    const oeeVals  = oeeSource.map((d) => +((d.oee ?? 0) * 100).toFixed(1));
    const availVals = oeeSource.map((d) => +(d.availability * 100).toFixed(1));
    const perfVals  = oeeSource.map((d) => +((d.performance ?? 0) * 100).toFixed(1));
    return {
      backgroundColor: "transparent",
      grid: { left: 44, right: 16, top: 20, bottom: 36 },
      xAxis: {
        type: "category" as const,
        data: HOUR_LABELS,
        axisLabel: { color: T.muted, fontFamily: "IBM Plex Mono", fontSize: 10 },
        axisLine: { lineStyle: { color: T.border } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value" as const,
        min: 0, max: 100,
        axisLabel: { formatter: (v: number) => `${v}%`, color: T.muted, fontFamily: "IBM Plex Mono", fontSize: 10 },
        splitLine: { lineStyle: { color: T.grid, type: "dashed" } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series: [
        { name: "OEE",         type: "line" as const, data: oeeVals,   smooth: 0.4, lineStyle: { color: T.brand,   width: 2.5 }, itemStyle: { color: T.brand   }, symbol: "circle", symbolSize: 4 },
        { name: "Availability",type: "line" as const, data: availVals, smooth: 0.4, lineStyle: { color: T.success, width: 1.5 }, itemStyle: { color: T.success }, symbol: "circle", symbolSize: 3 },
        { name: "Performance", type: "line" as const, data: perfVals,  smooth: 0.4, lineStyle: { color: T.warning, width: 1.5 }, itemStyle: { color: T.warning }, symbol: "circle", symbolSize: 3 },
      ],
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: T.bg, borderColor: T.border, borderRadius: 8,
        textStyle: { color: T.text, fontFamily: "IBM Plex Mono", fontSize: 11 },
        formatter: (p: Array<{ seriesName: string; value: number }>) =>
          p.map((s) => `${s.seriesName}: <b>${s.value}%</b>`).join("<br/>"),
      },
    };
  }, [oeeSource]);

  const stateSince = IS_MOCK
    ? "06:12"
    : machineStatus?.state_since
      ? formatTime(machineStatus.state_since)
      : "—";

  const protocolLabel = (mockMachine.protocol === "simulated" ? "Simulated" : mockMachine.protocol.toUpperCase());

  const shiftUptime = Math.round(oeeSource.reduce((s, d) => s + d.availability, 0) / oeeSource.length * 100);
  const fpy = production ? +((production.actual_qty - production.rejected_qty) / Math.max(production.actual_qty, 1) * 100).toFixed(1) : 97.4;

  const downtimeEvents = IS_MOCK
    ? (downtimeData ?? []).filter((e) => e.machine_id === machineId || e.machine_id === mockMachine.id)
    : (downtimeData ?? []);

  return (
    <div className="max-w-[1280px] mx-auto space-y-5 pb-10">

      <div className="flex items-start gap-4 flex-wrap">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-text-disabled hover:text-brand transition-colors mt-1"
        >
          <ArrowLeft size={12} /> All Machines
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-sans text-xl font-bold text-text-primary leading-tight">{machineName}</h1>
            {currentState && <MachineStateChip state={currentState} size="lg" />}
          </div>
          <p className="font-mono text-xs text-text-disabled mt-0.5">
            {IS_MOCK ? mockMachine.asset_tag : machineId}
            &nbsp;·&nbsp;State since {stateSince}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card px-5 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 divide-x divide-border">
          {[
            { label: "Machine Type", value: IS_MOCK ? mockMachine.machine_type : (machineStatus?.name ?? "—"), icon: Cpu },
            { label: "Asset Tag",    value: IS_MOCK ? mockMachine.asset_tag    : machineId,                     icon: Tag },
            { label: "Protocol",     value: protocolLabel,                                                       icon: Radio },
            { label: "Line",         value: "Assembly Line 1",                                                   icon: GitBranch },
            { label: "Status",       value: IS_MOCK ? (mockMachine.is_active ? "Active" : "Inactive") : "Active", icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }, i) => (
            <div key={label} className={`${i > 0 ? "pl-4" : ""} min-w-0`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={11} style={{ color: T.muted }} />
                <span className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{label}</span>
              </div>
              <p className="font-mono text-xs font-bold text-text-primary truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {oeeLoading ? (
        <LoadingCard rows={2} />
      ) : (
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">OEE Components — Current Shift</h2>
            <span className="font-mono text-2xs text-text-disabled">Shift 1 · 06:00–14:00</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <OEEGauge value={oee}          label="OEE"          size={120} />
            <OEEGauge value={availability} label="Availability" size={120} />
            <OEEGauge value={performance}  label="Performance"  size={120} />
            <OEEGauge value={quality}      label="Quality"      size={120} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Parts Produced", value: production?.actual_qty ?? 312,                 color: T.brand   },
          { label: "Parts Rejected", value: production?.rejected_qty ?? 8,                 color: T.danger  },
          { label: "FPY",            value: `${fpy}%`,                                     color: T.success },
          { label: "Shift Uptime",   value: `${shiftUptime || 83}%`,                       color: T.text    },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-card">
            <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mb-1.5">{label}</p>
            <p className="font-mono text-2xl font-black tabular-nums leading-none" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-text-primary">Units / Hour</h2>
            <div className="flex items-center gap-3">
              {[
                { label: "≥50", color: T.success },
                { label: "≥40", color: T.brand   },
                { label: "<40", color: T.danger   },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="font-mono text-2xs text-text-disabled">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <ReactECharts option={barChartOption} style={{ height: 190 }} opts={{ renderer: "svg" }} />
        </div>

        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-text-primary">OEE Trend — Shift Hours</h2>
            <div className="flex items-center gap-3">
              {[
                { label: "OEE",  color: T.brand   },
                { label: "Avail",color: T.success  },
                { label: "Perf", color: T.warning  },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="font-mono text-2xs text-text-disabled">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <ReactECharts option={oeeTrendOption} style={{ height: 190 }} opts={{ renderer: "svg" }} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary">State Timeline — 06:00 to 14:00</h2>
          <div className="flex items-center gap-4">
            {(["running","idle","fault"] as MachineState[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: segmentColor(s) }} />
                <span className="font-mono text-2xs text-text-disabled capitalize">{s}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative h-9 rounded-lg overflow-hidden bg-bg-muted">
          {MOCK_STATE_SEGMENTS.map((seg, i) => {
            const totalMin = 480;
            const left  = (seg.start / totalMin) * 100;
            const width = ((seg.end - seg.start) / totalMin) * 100;
            if (width <= 0) return null;
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0"
                title={`${seg.state} · ${seg.end - seg.start} min`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  background: segmentColor(seg.state) + (seg.state === "running" ? "CC" : "AA"),
                  borderRight: "1px solid rgba(255,255,255,0.3)",
                }}
              />
            );
          })}
          <div className="absolute top-0 bottom-0 left-0 right-0 flex items-center justify-between px-2 pointer-events-none">
            {HOUR_LABELS.map((h) => (
              <span key={h} className="font-mono text-2xs text-white/70 leading-none">{h}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-6 mt-2">
          {[
            { label: "Running", mins: 390, color: T.success },
            { label: "Fault",   mins: 62,  color: T.danger  },
            { label: "Idle",    mins: 28,  color: T.warning  },
          ].map(({ label, mins, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold" style={{ color }}>{mins} min</span>
              <span className="font-mono text-2xs text-text-disabled">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {!prodLoading && production && (
          <div className="bg-white rounded-xl shadow-card p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Current Order</h2>
            <div className="space-y-2">
              <p className="font-mono text-xs text-text-disabled">{production.order_number}</p>
              <p className="font-sans text-base font-bold text-text-primary">{production.product_code}</p>
              <div className="flex items-center justify-between text-xs font-mono text-text-secondary">
                <span>{production.actual_qty.toLocaleString()} produced</span>
                <span style={{ color: T.brand }}>{production.planned_qty.toLocaleString()} planned</span>
              </div>
              <div className="w-full h-2 rounded-full bg-bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min((production.actual_qty / production.planned_qty) * 100, 100)}%`,
                    background: T.brand,
                  }}
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-2xs text-text-disabled">
                  Good: <span style={{ color: T.success }} className="font-bold">{(production.actual_qty - production.rejected_qty).toLocaleString()}</span>
                  &nbsp; Rej: <span style={{ color: T.danger }} className="font-bold">{production.rejected_qty}</span>
                </span>
                {production.estimated_completion_at && (
                  <span className="font-mono text-2xs text-text-disabled">
                    Done ~{formatTime(production.estimated_completion_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={`${!prodLoading && production ? "lg:col-span-2" : "lg:col-span-3"} bg-white rounded-xl shadow-card overflow-hidden`}>
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-bold text-text-primary">Downtime Events</h2>
            <span className="font-mono text-2xs text-text-disabled">
              {downtimeLoading ? "…" : `${downtimeEvents.length} events`}
            </span>
          </div>
          {downtimeLoading ? (
            <div className="h-40 animate-pulse bg-bg-subtle" />
          ) : downtimeEvents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-bg-subtle">
                    {["Category","Started","Duration","Planned","Status","Reason"].map((h) => (
                      <th key={h} className="text-left font-mono text-2xs text-text-disabled px-5 py-2.5 uppercase tracking-widest whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {downtimeEvents.map((ev) => {
                    const isOpen = ev.ended_at == null;
                    return (
                      <tr key={ev.id} className="border-t border-border hover:bg-bg-subtle transition-colors">
                        <td className="px-5 py-3">
                          <span
                            className="font-mono text-xs font-bold px-2 py-0.5 rounded-md"
                            style={ev.is_planned
                              ? { background: T.warningDim, color: T.warning }
                              : { background: T.dangerDim,  color: T.danger  }}
                          >
                            {ev.category}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-text-secondary whitespace-nowrap">
                          {formatDateTime(ev.started_at)}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-text-secondary whitespace-nowrap">
                          {formatDuration(ev.duration_seconds)}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs" style={{ color: ev.is_planned ? T.warning : T.muted }}>
                          {ev.is_planned ? "Yes" : "No"}
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 font-mono text-2xs font-semibold"
                            style={{ color: isOpen ? T.danger : T.success }}>
                            {isOpen && (
                              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: T.danger }} />
                            )}
                            {isOpen ? "Open" : "Closed"}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-sans text-xs text-text-secondary max-w-xs truncate">
                          {ev.reason ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="font-sans text-sm text-text-secondary px-5 py-4">No downtime events recorded</p>
          )}
        </div>
      </div>
    </div>
  );
}
