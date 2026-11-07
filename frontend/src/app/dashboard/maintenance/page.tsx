"use client";

import { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Wrench, Plus, Clock, CheckCircle2, AlertTriangle, Calendar, ChevronDown, ChevronUp } from "lucide-react";

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

type MWOStatus = "open" | "in_progress" | "pending_parts" | "complete";
type MWOType = "corrective" | "preventive";
type MWOPriority = "critical" | "high" | "medium" | "low";

interface MaintenanceWO {
  id: string;
  machine: string;
  type: MWOType;
  priority: MWOPriority;
  status: MWOStatus;
  description: string;
  linkedDowntime?: string;
  assignedTo: string;
  createdAt: string;
  dueDate: string;
  closedAt?: string;
  estimatedHours: number;
  actualHours?: number;
  partsRequired?: string[];
  notes?: string;
}

const STATUS_LABEL: Record<MWOStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  pending_parts: "Pending Parts",
  complete: "Complete",
};

const STATUS_COLOR: Record<MWOStatus, { bg: string; color: string }> = {
  open: { bg: T.dangerDim, color: T.danger },
  in_progress: { bg: T.warningDim, color: T.warning },
  pending_parts: { bg: T.brandDim, color: T.brand },
  complete: { bg: T.successDim, color: T.success },
};

const PRIORITY_COLOR: Record<MWOPriority, { bg: string; color: string }> = {
  critical: { bg: T.dangerDim, color: T.danger },
  high: { bg: T.warningDim, color: T.warning },
  medium: { bg: T.brandDim, color: T.brand },
  low: { bg: T.neutralDim, color: T.neutral },
};

const TYPE_COLOR: Record<MWOType, { bg: string; color: string; label: string }> = {
  corrective: { bg: T.dangerDim, color: T.danger, label: "CM" },
  preventive: { bg: T.successDim, color: T.success, label: "PM" },
};

const INITIAL_MWOS: MaintenanceWO[] = [
  {
    id: "MWO-2026-021",
    machine: "Welding Robot #1",
    type: "corrective",
    priority: "critical",
    status: "in_progress",
    description: "Torch actuator bearing seized — urgent replacement required. Machine offline since 10:02.",
    linkedDowntime: "DT-001",
    assignedTo: "Rajan Mehta",
    createdAt: "2026-11-06T10:05:00Z",
    dueDate: "2026-11-06T14:00:00Z",
    estimatedHours: 2.5,
    partsRequired: ["Bearing SKF 6204-2RS", "Torch actuator seal kit"],
    notes: "Parts sourced from stores. Cooldown required before disassembly.",
  },
  {
    id: "MWO-2026-020",
    machine: "CNC Lathe #1",
    type: "preventive",
    priority: "high",
    status: "open",
    description: "Scheduled 500-hour PM — spindle lubrication, chuck jaw inspection, coolant filter replacement.",
    assignedTo: "Rajan Mehta",
    createdAt: "2026-11-06T08:00:00Z",
    dueDate: "2026-11-06T16:00:00Z",
    estimatedHours: 3.0,
    partsRequired: ["Spindle grease cartridge", "Coolant filter element", "Way lube oil 5L"],
  },
  {
    id: "MWO-2026-019",
    machine: "Press Machine #1",
    type: "corrective",
    priority: "high",
    status: "pending_parts",
    description: "Feed roller replacement — excessive wear causing wire feed jams (3 occurrences this week).",
    linkedDowntime: "DT-010",
    assignedTo: "Sunil Patil",
    createdAt: "2026-11-05T17:30:00Z",
    dueDate: "2026-11-07T09:00:00Z",
    estimatedHours: 1.5,
    partsRequired: ["Feed roller pair PFR-204", "Tension spring set"],
    notes: "Waiting on part delivery — ETA 07 Nov morning.",
  },
  {
    id: "MWO-2026-018",
    machine: "QC Station #1",
    type: "preventive",
    priority: "medium",
    status: "open",
    description: "Calibration check — height gauge, bore gauge, CMM probes. Certificate renewal due.",
    assignedTo: "Priya Sharma",
    createdAt: "2026-11-06T07:00:00Z",
    dueDate: "2026-11-08T17:00:00Z",
    estimatedHours: 1.0,
  },
  {
    id: "MWO-2026-017",
    machine: "Welding Robot #1",
    type: "corrective",
    priority: "medium",
    status: "complete",
    description: "Wire feed jam — cleaned feed path, replaced worn guide tube.",
    linkedDowntime: "DT-010",
    assignedTo: "Rajan Mehta",
    createdAt: "2026-11-06T06:25:00Z",
    dueDate: "2026-11-06T07:00:00Z",
    closedAt: "2026-11-06T06:50:00Z",
    estimatedHours: 0.5,
    actualHours: 0.4,
    notes: "Quick fix. Recommend feed roller replacement before next shift.",
  },
  {
    id: "MWO-2026-016",
    machine: "Press Machine #1",
    type: "preventive",
    priority: "low",
    status: "complete",
    description: "Monthly hydraulic oil level check and filter inspection.",
    assignedTo: "Sunil Patil",
    createdAt: "2026-11-01T08:00:00Z",
    dueDate: "2026-11-01T10:00:00Z",
    closedAt: "2026-11-01T09:30:00Z",
    estimatedHours: 1.0,
    actualHours: 1.0,
  },
  {
    id: "MWO-2026-015",
    machine: "CNC Lathe #1",
    type: "corrective",
    priority: "high",
    status: "complete",
    description: "Replace broken tool holder — tooling clamp snapped mid-shift.",
    linkedDowntime: "DT-006",
    assignedTo: "Rajan Mehta",
    createdAt: "2026-11-04T11:00:00Z",
    dueDate: "2026-11-04T12:00:00Z",
    closedAt: "2026-11-04T11:45:00Z",
    estimatedHours: 0.75,
    actualHours: 0.75,
  },
];

const PM_SCHEDULE = [
  { machine: "CNC Lathe #1", task: "500-hr Spindle PM", interval: "500h", lastDone: "2026-09-10", nextDue: "2026-11-06", overdue: true },
  { machine: "Press Machine #1", task: "Monthly Hydraulic Check", interval: "Monthly", lastDone: "2026-11-01", nextDue: "2026-12-01", overdue: false },
  { machine: "Welding Robot #1", task: "Wire Feed Assembly Service", interval: "250h", lastDone: "2026-10-15", nextDue: "2026-11-15", overdue: false },
  { machine: "Welding Robot #1", task: "Torch Consumables Check", interval: "Weekly", lastDone: "2026-10-30", nextDue: "2026-11-06", overdue: true },
  { machine: "QC Station #1", task: "CMM Calibration", interval: "Quarterly", lastDone: "2026-08-01", nextDue: "2026-11-01", overdue: true },
  { machine: "All Machines", task: "Annual Safety Inspection", interval: "Annual", lastDone: "2026-01-15", nextDue: "2027-01-15", overdue: false },
];

function mwoByStatusChart(mwos: MaintenanceWO[]) {
  const counts: Record<MWOStatus, number> = { open: 0, in_progress: 0, pending_parts: 0, complete: 0 };
  mwos.forEach(m => { counts[m.status] = (counts[m.status] ?? 0) + 1; });
  return {
    backgroundColor: "transparent",
    tooltip: { trigger: "item", formatter: "{b}: {c}" },
    series: [{
      type: "pie",
      radius: ["50%", "72%"],
      data: [
        { value: counts.open, name: "Open", itemStyle: { color: T.danger } },
        { value: counts.in_progress, name: "In Progress", itemStyle: { color: T.warning } },
        { value: counts.pending_parts, name: "Pending Parts", itemStyle: { color: T.brand } },
        { value: counts.complete, name: "Complete", itemStyle: { color: T.success } },
      ],
      label: { show: false },
    }],
  };
}

function mttrChart() {
  return {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 100, right: 20, top: 10, bottom: 20 },
    xAxis: { type: "value", axisLabel: { color: T.muted, fontSize: 10, fontFamily: "IBM Plex Mono", formatter: (v: number) => `${v}h` }, splitLine: { lineStyle: { color: T.grid } }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: "category", data: ["CNC Lathe #1", "Press Machine #1", "Welding Robot #1", "QC Station #1"], axisLabel: { color: T.text, fontSize: 10, fontFamily: "IBM Plex Mono" }, axisLine: { show: false }, axisTick: { show: false } },
    series: [
      { name: "CM Avg", type: "bar", data: [0.75, 1.5, 2.0, 0], itemStyle: { color: T.danger, borderRadius: [0, 4, 4, 0] }, barMaxWidth: 14 },
      { name: "PM Avg", type: "bar", data: [3.0, 1.0, 0, 1.0], itemStyle: { color: T.success, borderRadius: [0, 4, 4, 0] }, barMaxWidth: 14 },
    ],
    legend: { top: "auto", bottom: 0, textStyle: { color: T.muted, fontSize: 10 } },
  };
}

export default function MaintenancePage() {
  const [mwos, setMwos] = useState<MaintenanceWO[]>(INITIAL_MWOS);
  const [activeTab, setActiveTab] = useState<"active" | "complete" | "pm_schedule">("active");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function advance(id: string) {
    setMwos(prev => prev.map(m => {
      if (m.id !== id) return m;
      const next: Record<MWOStatus, MWOStatus> = { open: "in_progress", in_progress: "complete", pending_parts: "complete", complete: "complete" };
      return { ...m, status: next[m.status], ...(next[m.status] === "complete" ? { closedAt: new Date().toISOString(), actualHours: m.estimatedHours } : {}) };
    }));
  }

  const openCount = useMemo(() => mwos.filter(m => m.status === "open").length, [mwos]);
  const inProgressCount = useMemo(() => mwos.filter(m => m.status === "in_progress").length, [mwos]);
  const pendingCount = useMemo(() => mwos.filter(m => m.status === "pending_parts").length, [mwos]);
  const overdueCount = useMemo(() => PM_SCHEDULE.filter(p => p.overdue).length, []);

  const filtered = useMemo(() => {
    if (activeTab === "active") return mwos.filter(m => m.status !== "complete");
    if (activeTab === "complete") return mwos.filter(m => m.status === "complete");
    return [];
  }, [mwos, activeTab]);

  return (
    <div style={{ background: T.bgSubtle, minHeight: "100vh" }} className="p-6 font-sans">

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 style={{ color: T.text, fontFamily: "Familjen Grotesk, sans-serif", fontSize: 24 }} className="font-bold">Maintenance Work Orders</h1>
          <p style={{ color: T.muted, fontSize: 13 }} className="mt-1">Corrective & preventive maintenance · PM schedule · MTTR tracking</p>
        </div>
        <button style={{ background: T.brand, color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, border: "none", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> New MWO
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Open", value: openCount, color: T.danger },
          { label: "In Progress", value: inProgressCount, color: T.warning },
          { label: "Pending Parts", value: pendingCount, color: T.brand },
          { label: "PM Overdue", value: overdueCount, color: T.danger },
        ].map(k => (
          <div key={k.label} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="p-5 shadow-sm">
            <p style={{ color: T.muted, fontSize: 11, letterSpacing: "0.08em" }} className="font-sans uppercase font-medium mb-1">{k.label}</p>
            <p style={{ color: k.color, fontSize: 32 }} className="font-mono font-black tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        <div className="lg:col-span-3">

          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="shadow-sm overflow-hidden">
            <div style={{ borderBottom: `1px solid ${T.border}`, padding: "0 16px" }} className="flex gap-1">
              {([
                { key: "active", label: `Active (${openCount + inProgressCount + pendingCount})` },
                { key: "complete", label: "Complete" },
                { key: "pm_schedule", label: `PM Schedule (${overdueCount} overdue)` },
              ] as const).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  style={{ padding: "12px 14px", fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400, color: activeTab === tab.key ? T.brand : T.muted, borderBottom: activeTab === tab.key ? `2px solid ${T.brand}` : "2px solid transparent", background: "none", border: "none", borderBottomStyle: "solid", whiteSpace: "nowrap" }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "pm_schedule" ? (
              <div className="overflow-x-auto">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["Machine", "PM Task", "Interval", "Last Done", "Next Due", "Status"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: T.muted, fontSize: 10, letterSpacing: "0.06em", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PM_SCHEDULE.map((pm, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${T.grid}`, background: pm.overdue ? T.dangerDim : "transparent" }}>
                        <td style={{ padding: "9px 12px", color: T.text, fontWeight: 600 }}>{pm.machine}</td>
                        <td style={{ padding: "9px 12px", color: T.text }}>{pm.task}</td>
                        <td style={{ padding: "9px 12px", color: T.muted, fontFamily: "IBM Plex Mono" }}>{pm.interval}</td>
                        <td style={{ padding: "9px 12px", color: T.muted, fontFamily: "IBM Plex Mono" }}>{pm.lastDone}</td>
                        <td style={{ padding: "9px 12px", fontFamily: "IBM Plex Mono", color: pm.overdue ? T.danger : T.text, fontWeight: pm.overdue ? 700 : 400 }}>{pm.nextDue}</td>
                        <td style={{ padding: "9px 12px" }}>
                          {pm.overdue
                            ? <span style={{ background: T.dangerDim, color: T.danger, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>OVERDUE</span>
                            : <span style={{ background: T.successDim, color: T.success, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>OK</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: T.border }}>
                {filtered.length === 0 && (
                  <div style={{ padding: 32, textAlign: "center", color: T.muted, fontSize: 13 }}>No work orders in this view.</div>
                )}
                {filtered.map(mwo => {
                  const stColor = STATUS_COLOR[mwo.status];
                  const prColor = PRIORITY_COLOR[mwo.priority];
                  const tyColor = TYPE_COLOR[mwo.type];
                  const isExpanded = expandedId === mwo.id;
                  const isOverdue = new Date(mwo.dueDate) < new Date() && mwo.status !== "complete";

                  return (
                    <div key={mwo.id}>
                      <div style={{ padding: "14px 16px" }}>
                        <div className="flex items-start gap-3">
                          <div style={{ background: tyColor.bg, color: tyColor.color, borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700, minWidth: 32, textAlign: "center", flexShrink: 0 }}>{tyColor.label}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span style={{ color: T.text, fontFamily: "IBM Plex Mono", fontSize: 12, fontWeight: 600 }}>{mwo.id}</span>
                              <span style={{ background: prColor.bg, color: prColor.color, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{mwo.priority}</span>
                              <span style={{ background: stColor.bg, color: stColor.color, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 600 }}>{STATUS_LABEL[mwo.status]}</span>
                              {isOverdue && <span style={{ background: T.dangerDim, color: T.danger, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>OVERDUE</span>}
                            </div>
                            <p style={{ color: T.muted, fontSize: 11, marginBottom: 2 }}>{mwo.machine} · {mwo.assignedTo} · Due: {new Date(mwo.dueDate).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                            <p style={{ color: T.text, fontSize: 13 }}>{mwo.description.length > 90 ? mwo.description.slice(0, 90) + "…" : mwo.description}</p>
                          </div>
                          <div className="flex gap-2 items-start flex-shrink-0">
                            {mwo.status !== "complete" && (
                              <button onClick={() => advance(mwo.id)}
                                style={{ background: T.brandDim, color: T.brand, border: `1px solid ${T.brand}`, borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600 }}>
                                {mwo.status === "open" ? "Start →" : "Complete ✓"}
                              </button>
                            )}
                            <button onClick={() => setExpandedId(isExpanded ? null : mwo.id)}
                              style={{ background: "none", border: "none", color: T.muted, padding: "5px" }}>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ background: T.bgSubtle, borderTop: `1px solid ${T.border}`, padding: "14px 16px 16px 60px" }}>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            {[
                              { label: "Est. Hours", value: `${mwo.estimatedHours}h` },
                              { label: "Actual Hours", value: mwo.actualHours ? `${mwo.actualHours}h` : "—" },
                              { label: "Linked Downtime", value: mwo.linkedDowntime ?? "—" },
                              { label: "Closed At", value: mwo.closedAt ? new Date(mwo.closedAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—" },
                            ].map(d => (
                              <div key={d.label}>
                                <p style={{ color: T.muted, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>{d.label}</p>
                                <p style={{ color: T.text, fontSize: 13, fontFamily: "IBM Plex Mono", fontWeight: 600, marginTop: 2 }}>{d.value}</p>
                              </div>
                            ))}
                          </div>
                          {mwo.partsRequired && mwo.partsRequired.length > 0 && (
                            <div className="mb-3">
                              <p style={{ color: T.muted, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Parts Required</p>
                              <div className="flex flex-wrap gap-2">
                                {mwo.partsRequired.map(p => (
                                  <span key={p} style={{ background: T.bgMuted, color: T.text, border: `1px solid ${T.border}`, borderRadius: 4, padding: "3px 8px", fontSize: 11, fontFamily: "IBM Plex Mono" }}>{p}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {mwo.notes && (
                            <div style={{ background: T.warningDim, borderRadius: 6, padding: "8px 10px", fontSize: 12, color: T.warning, border: `1px solid ${T.warning}30` }}>
                              <span style={{ fontWeight: 600 }}>Note: </span>{mwo.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">

          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="p-4 shadow-sm">
            <p style={{ color: T.text, fontSize: 13, fontWeight: 600, fontFamily: "Familjen Grotesk, sans-serif", marginBottom: 4 }}>MWO Status Mix</p>
            <ReactECharts option={mwoByStatusChart(mwos)} style={{ height: 160 }} />
            <div className="space-y-1 mt-2">
              {([["open", "Open"], ["in_progress", "In Progress"], ["pending_parts", "Pending Parts"], ["complete", "Complete"]] as const).map(([k, l]) => (
                <div key={k} className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: STATUS_COLOR[k].color }} />
                    <span style={{ color: T.muted, fontSize: 11 }}>{l}</span>
                  </div>
                  <span style={{ color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono" }}>{mwos.filter(m => m.status === k).length}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="p-4 shadow-sm">
            <p style={{ color: T.text, fontSize: 13, fontWeight: 600, fontFamily: "Familjen Grotesk, sans-serif", marginBottom: 4 }}>Avg Repair Time by Machine</p>
            <p style={{ color: T.muted, fontSize: 11, marginBottom: 8 }}>CM vs PM (hours)</p>
            <ReactECharts option={mttrChart()} style={{ height: 180 }} />
          </div>

          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="p-4 shadow-sm">
            <p style={{ color: T.text, fontSize: 13, fontWeight: 600, fontFamily: "Familjen Grotesk, sans-serif", marginBottom: 10 }}>This Month</p>
            {[
              { label: "CM Work Orders", value: mwos.filter(m => m.type === "corrective").length, color: T.danger },
              { label: "PM Work Orders", value: mwos.filter(m => m.type === "preventive").length, color: T.success },
              { label: "Completed", value: mwos.filter(m => m.status === "complete").length, color: T.success },
              { label: "Avg Actual Hours", value: "0.9h", color: T.text },
            ].map(s => (
              <div key={s.label} className="flex justify-between items-center mb-2">
                <span style={{ color: T.muted, fontSize: 12 }}>{s.label}</span>
                <span style={{ color: s.color, fontSize: 13, fontFamily: "IBM Plex Mono", fontWeight: 700 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
