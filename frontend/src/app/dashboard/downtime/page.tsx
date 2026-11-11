"use client";

import { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { useDowntimePareto, useDowntimeEvents, useFactoryMachines } from "@/hooks/api";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { downtimeApi } from "@/lib/api";

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

const MACHINE_NAMES: Record<string, string> = {
  "mach-cnc-001":   "CNC Lathe #1",
  "mach-press-001": "Press Machine #1",
  "mach-weld-001":  "Welding Robot #1",
  "mach-qc-001":    "QC Station #1",
};

const MACHINE_ORDER = ["mach-cnc-001","mach-press-001","mach-weld-001","mach-qc-001"];

const CAT_PREFIX: Record<string, { label: string; color: string; bg: string }> = {
  ME: { label: "Mechanical",   color: T.danger,  bg: T.dangerDim  },
  MA: { label: "Maintenance",  color: T.warning, bg: T.warningDim },
  OP: { label: "Operator",     color: T.neutral, bg: T.neutralDim },
  EL: { label: "Electrical",   color: T.brand,   bg: T.brandDim   },
  CH: { label: "Consumable",   color: "#7B5EA7", bg: "#F3EEFF"    },
};

const MTTR_STATS = [
  { machine:"mach-cnc-001",   events:3, totalMin:46, mttrMin:27, mtbfMin:94  },
  { machine:"mach-press-001", events:3, totalMin:60, mttrMin:20, mtbfMin:110 },
  { machine:"mach-weld-001",  events:3, totalMin:66, mttrMin:48, mtbfMin:72  },
  { machine:"mach-qc-001",    events:2, totalMin:8,  mttrMin:4,  mtbfMin:240 },
];

const SHIFT_START_ISO = "2026-11-04T06:00:00Z";
const SHIFT_DURATION_MIN = 480;

function toShiftMin(iso: string): number {
  return Math.round((new Date(iso).getTime() - new Date(SHIFT_START_ISO).getTime()) / 60000);
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "Open";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function mttrColor(min: number) {
  if (min > 30) return T.danger;
  if (min > 15) return T.warning;
  return T.success;
}

function mttrStatus(min: number): { label: string; color: string; bg: string } {
  if (min > 30) return { label: "Critical", color: T.danger,  bg: T.dangerDim  };
  if (min > 15) return { label: "Watch",    color: T.warning, bg: T.warningDim };
  return               { label: "OK",       color: T.success, bg: T.successDim };
}

const DT_CATEGORIES = ["ME", "MA", "OP", "EL", "CH"];

function LogDowntimeModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { data: machines } = useFactoryMachines();
  const [machineId, setMachineId] = useState("");
  const [category, setCategory] = useState("ME");
  const [reason, setReason] = useState("");
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [endedAt, setEndedAt] = useState("");
  const [isPlanned, setIsPlanned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!machineId) { setError("Select a machine"); return; }
    setSaving(true); setError(null);
    try {
      if (!IS_MOCK) {
        await downtimeApi.create(machineId, {
          category,
          reason: reason || null,
          started_at: new Date(startedAt).toISOString(),
          ended_at: endedAt ? new Date(endedAt).toISOString() : undefined,
          is_planned: isPlanned,
        });
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="rounded-2xl border w-full max-w-lg mx-4 p-6 space-y-4"
        style={{ background: T.bg, borderColor: T.border }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold" style={{ color: T.text }}>Log Downtime Event</h2>
          <button onClick={onClose} className="font-mono text-xs" style={{ color: T.muted }}>✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="font-mono text-xs uppercase tracking-widest block mb-1" style={{ color: T.muted }}>Machine</label>
            <select
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              className="w-full text-sm rounded-lg border px-3 py-2 focus:outline-none"
              style={{ borderColor: T.border, color: T.text, background: T.bgSubtle }}
            >
              <option value="">Select machine…</option>
              {(machines ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
              {IS_MOCK && Object.entries(MACHINE_NAMES).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-widest block mb-1" style={{ color: T.muted }}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm rounded-lg border px-3 py-2 focus:outline-none"
              style={{ borderColor: T.border, color: T.text, background: T.bgSubtle }}
            >
              {DT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CAT_PREFIX[c]?.label ?? c} ({c})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-widest block mb-1" style={{ color: T.muted }}>Type</label>
            <select
              value={isPlanned ? "planned" : "unplanned"}
              onChange={(e) => setIsPlanned(e.target.value === "planned")}
              className="w-full text-sm rounded-lg border px-3 py-2 focus:outline-none"
              style={{ borderColor: T.border, color: T.text, background: T.bgSubtle }}
            >
              <option value="unplanned">Unplanned</option>
              <option value="planned">Planned</option>
            </select>
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-widest block mb-1" style={{ color: T.muted }}>Started At</label>
            <input
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              className="w-full text-sm rounded-lg border px-3 py-2 focus:outline-none"
              style={{ borderColor: T.border, color: T.text, background: T.bgSubtle }}
            />
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-widest block mb-1" style={{ color: T.muted }}>Ended At (optional)</label>
            <input
              type="datetime-local"
              value={endedAt}
              onChange={(e) => setEndedAt(e.target.value)}
              className="w-full text-sm rounded-lg border px-3 py-2 focus:outline-none"
              style={{ borderColor: T.border, color: T.text, background: T.bgSubtle }}
            />
          </div>

          <div className="col-span-2">
            <label className="font-mono text-xs uppercase tracking-widest block mb-1" style={{ color: T.muted }}>Reason / Notes</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the fault or reason…"
              className="w-full text-sm rounded-lg border px-3 py-2 focus:outline-none"
              style={{ borderColor: T.border, color: T.text, background: T.bgSubtle }}
            />
          </div>
        </div>

        {error && <p className="font-mono text-xs" style={{ color: T.danger }}>{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl font-mono text-xs font-semibold text-white transition-opacity"
            style={{ background: T.brand, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : "Log Downtime"}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-mono text-xs border transition-colors"
            style={{ borderColor: T.border, color: T.muted }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DowntimePage() {
  const { data: paretoData, isLoading: paretoLoading } = useDowntimePareto();
  const { data: events, isLoading: eventsLoading }     = useDowntimeEvents();
  const [machineFilter, setMachineFilter]              = useState<string>("");
  const [showLogModal, setShowLogModal]                = useState(false);

  const totalSeconds  = paretoData?.total_duration_s ?? 0;
  const eventCount    = events?.length ?? 0;
  const openCount     = events?.filter((e) => !e.ended_at).length ?? 0;

  const paretoOption = useMemo(() => {
    const items      = paretoData?.items ?? [];
    const sorted     = [...items].sort((a, b) => b.duration_s - a.duration_s);
    const categories = sorted.map((i) => i.category);
    const durations  = sorted.map((i) => Math.round(i.duration_s / 60));
    let cum = 0;
    const cumPcts = sorted.map((i) => { cum += i.pct * 100; return +cum.toFixed(1); });

    return {
      grid: { left: 48, right: 60, top: 16, bottom: 40 },
      legend: {
        data: ["Duration (min)", "Cumulative %"],
        textStyle: { color: T.muted, fontFamily: "IBM Plex Mono", fontSize: 10 },
        bottom: 0, icon: "circle", itemWidth: 8, itemHeight: 8,
      },
      xAxis: {
        type: "category" as const, data: categories,
        axisLabel: { color: T.muted, fontFamily: "IBM Plex Mono", fontSize: 10 },
        axisLine: { lineStyle: { color: T.border } }, axisTick: { show: false },
      },
      yAxis: [
        {
          type: "value" as const, name: "Duration (min)",
          nameTextStyle: { color: T.muted, fontFamily: "IBM Plex Mono", fontSize: 9 },
          axisLabel: { color: T.muted, fontFamily: "IBM Plex Mono", fontSize: 10 },
          splitLine: { lineStyle: { color: T.grid, type: "dashed" } },
          axisLine: { show: false }, axisTick: { show: false },
        },
        {
          type: "value" as const, name: "Cumulative %", min: 0, max: 100,
          nameTextStyle: { color: T.muted, fontFamily: "IBM Plex Mono", fontSize: 9 },
          axisLabel: { color: T.muted, fontFamily: "IBM Plex Mono", fontSize: 10, formatter: (v: number) => `${v}%` },
          splitLine: { show: false }, axisLine: { show: false }, axisTick: { show: false },
        },
      ],
      series: [
        {
          name: "Duration (min)", type: "bar" as const, data: durations, yAxisIndex: 0,
          itemStyle: { color: T.danger + "CC", borderRadius: [4, 4, 0, 0] }, barMaxWidth: 40,
        },
        {
          name: "Cumulative %", type: "line" as const, data: cumPcts, yAxisIndex: 1,
          smooth: 0.3, lineStyle: { color: T.brand, width: 2 },
          itemStyle: { color: T.brand }, symbol: "circle", symbolSize: 5,
        },
      ],
      tooltip: {
        trigger: "axis" as const, backgroundColor: T.bg, borderColor: T.border,
        borderWidth: 1, borderRadius: 8,
        textStyle: { color: T.text, fontFamily: "IBM Plex Mono", fontSize: 11 },
      },
      animation: false,
    };
  }, [paretoData]);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (!machineFilter) return events;
    return events.filter((e) => e.machine_id === machineFilter);
  }, [events, machineFilter]);

  const swimLaneEvents = useMemo(() => {
    const byMachine: Record<string, typeof events> = {};
    MACHINE_ORDER.forEach((m) => { byMachine[m] = []; });
    (events ?? []).forEach((e) => {
      if (byMachine[e.machine_id]) byMachine[e.machine_id]!.push(e);
    });
    return byMachine;
  }, [events]);

  const hourMarkers = Array.from({ length: 9 }, (_, i) => `${String(6 + i).padStart(2,"0")}:00`);

  return (
    <div className="max-w-[1280px] mx-auto space-y-5">

      {showLogModal && (
        <LogDowntimeModal onClose={() => setShowLogModal(false)} onSaved={() => setShowLogModal(false)} />
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Downtime Analysis</h1>
          <p className="font-mono text-xs text-text-tertiary mt-0.5">Pareto · timeline · MTTR/MTBF · event log</p>
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-semibold text-white shrink-0 transition-opacity hover:opacity-90"
          style={{ background: T.danger }}
        >
          + Log Downtime
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Downtime",    value: formatDuration(totalSeconds),  color: T.danger  },
          { label: "Open Events",       value: openCount.toString(),          color: openCount > 0 ? T.danger : T.success },
          { label: "Events This Shift", value: eventCount.toString(),         color: T.text    },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-card">
            <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mb-2">{label}</p>
            <p className="font-mono text-3xl font-black tabular-nums leading-none" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-xs font-bold text-text-primary">Machine Timeline — Shift 1 (06:00–14:00)</h2>
          <p className="font-mono text-2xs text-text-disabled mt-0.5">Red = unplanned &nbsp;·&nbsp; Amber = planned</p>
        </div>
        <div className="px-5 py-4">
          <div className="flex">
            <div className="w-36 shrink-0" />
            <div className="flex-1 relative">
              <div className="flex justify-between mb-1">
                {hourMarkers.map((h) => (
                  <span key={h} className="font-mono text-2xs text-text-disabled" style={{ width: "12.5%" }}>{h}</span>
                ))}
              </div>
              <div className="absolute top-6 left-0 right-0 flex">
                {hourMarkers.slice(0,-1).map((_, i) => (
                  <div key={i} className="border-l border-border" style={{ width: "12.5%", height: 200 }} />
                ))}
                <div className="border-l border-border" style={{ height: 200 }} />
              </div>
            </div>
          </div>
          {eventsLoading ? (
            <div className="h-48 bg-bg-subtle animate-pulse rounded-lg" />
          ) : (
            <div className="space-y-2">
              {MACHINE_ORDER.map((machineId) => {
                const machineEvents = swimLaneEvents[machineId] ?? [];
                return (
                  <div key={machineId} className="flex items-center gap-0">
                    <div className="w-36 shrink-0 pr-3">
                      <p className="font-sans text-xs font-semibold text-text-primary truncate">{MACHINE_NAMES[machineId]}</p>
                    </div>
                    <div className="flex-1 relative rounded-md overflow-hidden" style={{ height: 36, background: T.bgMuted }}>
                      {machineEvents.map((ev) => {
                        const startMin  = Math.max(0, toShiftMin(ev.started_at));
                        const durMin    = ev.duration_seconds != null
                          ? Math.round(ev.duration_seconds / 60)
                          : Math.min(60, SHIFT_DURATION_MIN - startMin);
                        const leftPct  = (startMin / SHIFT_DURATION_MIN) * 100;
                        const widthPct = Math.max(0.5, (durMin / SHIFT_DURATION_MIN) * 100);
                        const color    = ev.is_planned ? T.warning : T.danger;
                        return (
                          <div
                            key={ev.id}
                            className="absolute top-1 bottom-1 rounded"
                            title={`${ev.category}${ev.reason ? ": " + ev.reason : ""} (${durMin}min)`}
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              background: color + "CC",
                              outline: ev.ended_at == null ? `2px solid ${color}` : "none",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl p-5 shadow-card">
          <h2 className="text-sm font-semibold text-text-primary mb-0.5">Downtime Pareto — Current Shift</h2>
          <p className="font-mono text-2xs text-text-disabled mb-3">By category · cumulative %</p>
          {paretoLoading ? <LoadingCard rows={3} /> : (
            <ReactECharts option={paretoOption} style={{ height: 240 }} opts={{ renderer: "svg" }} />
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-xs font-bold text-text-primary">MTTR / MTBF by Machine</h2>
          </div>
          <div>
            <div className="grid grid-cols-[1fr_3rem_4rem_4rem_4rem_5rem] gap-2 px-4 py-2.5 bg-bg-subtle border-b border-border">
              {["Machine","Evts","Down","MTTR","MTBF","Status"].map((h) => (
                <span key={h} className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{h}</span>
              ))}
            </div>
            {MTTR_STATS.map((s) => {
              const st = mttrStatus(s.mttrMin);
              return (
                <div key={s.machine} className="grid grid-cols-[1fr_3rem_4rem_4rem_4rem_5rem] gap-2 items-center px-4 py-3 border-b border-border last:border-0 hover:bg-bg-subtle transition-colors">
                  <span className="font-sans text-xs font-semibold text-text-primary truncate">{MACHINE_NAMES[s.machine]}</span>
                  <span className="font-mono text-xs text-text-secondary tabular-nums">{s.events}</span>
                  <span className="font-mono text-xs text-text-secondary tabular-nums">{s.totalMin}m</span>
                  <span className="font-mono text-xs font-bold tabular-nums" style={{ color: mttrColor(s.mttrMin) }}>{s.mttrMin}m</span>
                  <span className="font-mono text-xs text-text-secondary tabular-nums">{s.mtbfMin}m</span>
                  <span className="inline-flex font-mono text-2xs font-bold rounded-full px-2 py-0.5 w-fit" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-bold text-text-primary">Downtime Events</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-bg-subtle border border-border rounded-lg p-0.5">
              <button
                onClick={() => setMachineFilter("")}
                className="font-mono text-xs px-3 py-1 rounded-md transition-all"
                style={machineFilter === "" ? { background: T.brand, color: "#fff", fontWeight: 700 } : { color: T.muted }}
              >All</button>
              {MACHINE_ORDER.map((id) => (
                <button
                  key={id}
                  onClick={() => setMachineFilter(id)}
                  className="font-mono text-xs px-3 py-1 rounded-md transition-all"
                  style={machineFilter === id ? { background: T.brand, color: "#fff", fontWeight: 700 } : { color: T.muted }}
                >
                  {MACHINE_NAMES[id].split(" ").slice(-1)[0].replace("#","")}
                </button>
              ))}
            </div>
          </div>
        </div>
        {eventsLoading ? (
          <div className="h-48 bg-bg-subtle animate-pulse" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-subtle border-b border-border">
                  {["","Machine","Category","Started","Duration","Planned","Reason"].map((col,i) => (
                    <th key={i} className="text-left font-mono text-2xs text-text-disabled px-5 py-2.5 uppercase tracking-widest whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => {
                  const isOpen = !event.ended_at;
                  const prefix = event.category?.split("-")[0] ?? "";
                  const catCfg = CAT_PREFIX[prefix];
                  return (
                    <tr key={event.id} className="border-t border-border hover:bg-bg-subtle transition-colors">
                      <td className="px-5 py-3 w-8">
                        {isOpen && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: T.danger }} />
                            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: T.danger }} />
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-sans text-xs font-semibold text-text-primary whitespace-nowrap">
                        {MACHINE_NAMES[event.machine_id] ?? event.machine_id}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md"
                          style={catCfg ? { background: catCfg.bg, color: catCfg.color } : { background: T.bgMuted, color: T.muted }}
                        >
                          {event.category}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-text-secondary whitespace-nowrap">{formatTime(event.started_at)}</td>
                      <td className="px-5 py-3">
                        {isOpen ? (
                          <span className="font-mono text-xs font-bold rounded-full px-2 py-0.5" style={{ background: T.dangerDim, color: T.danger }}>Open</span>
                        ) : (
                          <span className="font-mono text-xs text-text-secondary">{formatDuration(event.duration_seconds)}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs" style={{ color: event.is_planned ? T.warning : T.muted }}>
                          {event.is_planned ? "Planned" : "Unplanned"}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-sans text-xs text-text-secondary max-w-xs truncate">{event.reason ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl px-5 py-4 shadow-card">
        <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mb-3">Category Legend</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CAT_PREFIX).map(([prefix, cfg]) => (
            <span
              key={prefix}
              className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold rounded-full px-3 py-1"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              <span className="font-black">{prefix}</span>
              <span className="opacity-70">—</span>
              {cfg.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-text-disabled px-3 py-1">
            e.g. ME-01 = Mechanical fault type 1
          </span>
        </div>
      </div>

    </div>
  );
}
