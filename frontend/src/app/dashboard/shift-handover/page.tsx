"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Clock, TrendingUp, TrendingDown, FileText, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { shiftHandoverApi, type ShiftHandoverSchema } from "@/lib/api";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

interface ShiftLog {
  id: string;
  shift: "A" | "B" | "C";
  date: string;
  supervisor: string;
  fromTime: string;
  toTime: string;
  production: { target: number; actual: number; fpy: number };
  oee: number;
  downtime: number;
  openNCRs: number;
  status: "submitted" | "acknowledged" | "pending";
  notes: string;
  issues: { severity: "high" | "medium" | "low"; description: string; action: string; resolved: boolean }[];
  handoverItems: { category: string; item: string; from: string; to?: string }[];
}

const MOCK_LOGS: ShiftLog[] = [
  {
    id: "SH-2026-11-06-B",
    shift: "B", date: "2026-11-06", supervisor: "Ravi Singh",
    fromTime: "14:00", toTime: "22:00",
    production: { target: 500, actual: 468, fpy: 96.4 },
    oee: 72.3, downtime: 48, openNCRs: 2,
    status: "acknowledged",
    notes: "CNC-001 had a spindle vibration alarm at 16:30. Maintenance cleared by 17:10. Press-002 running smoothly. Welding robot calibration completed before shift start.",
    issues: [
      { severity: "high", description: "CNC-001 spindle vibration alarm — bearings checked, no abnormality found", action: "Increased lubrication interval, monitor next shift", resolved: true },
      { severity: "medium", description: "SHAFT-V7 lot SV-20261105-003 had 4 OOL measurements on bore diameter", action: "Quarantined lot, NCR #NCR-2026-00142 raised, QE reviewing", resolved: false },
      { severity: "low", description: "Coolant level low on CNC-001", action: "Topped up during downtime window", resolved: true },
    ],
    handoverItems: [
      { category: "Open Orders", item: "PO-2026-11-003 (SHAFT-V7 ×80) — 55% complete, estimated 3h remaining", from: "Ravi Singh" },
      { category: "Quality Hold", item: "Lot SV-20261105-003 on quarantine shelf B-7, awaiting QE disposition", from: "Ravi Singh" },
      { category: "Maintenance", item: "WELD-003 PM due in 2h — grease gun and wire feeder brush in toolbox L-12", from: "Ravi Singh" },
      { category: "Safety", item: "Spill near PRESS-002 cleaned, floor marked for re-inspection", from: "Ravi Singh" },
    ],
  },
  {
    id: "SH-2026-11-06-A",
    shift: "A", date: "2026-11-06", supervisor: "Meena Patel",
    fromTime: "06:00", toTime: "14:00",
    production: { target: 500, actual: 512, fpy: 98.1 },
    oee: 84.1, downtime: 12, openNCRs: 0,
    status: "submitted",
    notes: "Excellent shift. All machines running within spec. ENG-MNT-V2 PO-2026-11-001 completed and moved to finished goods. No safety incidents.",
    issues: [
      { severity: "low", description: "ASSY-005 conveyor jammed briefly at 09:15", action: "Cleared in 8 minutes, no production impact", resolved: true },
    ],
    handoverItems: [
      { category: "Completed Orders", item: "PO-2026-11-001 (ENG-MNT-V2 ×200) — DONE, staged at dispatch bay 3", from: "Meena Patel" },
      { category: "Active Order", item: "PO-2026-11-002 (BRK-ASY-X4 ×150) — 60% complete on CNC-001", from: "Meena Patel" },
    ],
  },
  {
    id: "SH-2026-11-05-C",
    shift: "C", date: "2026-11-05", supervisor: "Deepak Kumar",
    fromTime: "22:00", toTime: "06:00",
    production: { target: 350, actual: 318, fpy: 94.8 },
    oee: 61.2, downtime: 94, openNCRs: 1,
    status: "acknowledged",
    notes: "Night shift was challenging. WELD-003 had extended downtime due to wire feeder failure. Emergency maintenance called at 02:00. Machine restored by 04:30.",
    issues: [
      { severity: "high", description: "WELD-003 wire feeder motor failure — DT-20261105-009 logged, 150min downtime", action: "Motor replaced from spare parts. MWO-2026-00328 closed.", resolved: true },
    ],
    handoverItems: [
      { category: "Machine Status", item: "WELD-003 restored, monitor for wire feed continuity issues in first 2h of shift", from: "Deepak Kumar" },
      { category: "Quality Hold", item: "ARM-WELD-C3 lot AW-20261105-012 — 3 pcs with weld porosity, NCR pending QE review", from: "Deepak Kumar" },
    ],
  },
];

const SHIFT_COLORS = { A: { bg: "bg-brand/10", border: "border-brand/30", text: "text-brand" }, B: { bg: "bg-success/10", border: "border-success/30", text: "text-success" }, C: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" } };
const SEV_CONFIG = { high: { color: "text-danger", bg: "bg-danger/10 border-danger/20" }, medium: { color: "text-warning", bg: "bg-warning/10 border-warning/20" }, low: { color: "text-text-secondary", bg: "bg-bg border-border" } };

export default function ShiftHandoverPage() {
  const [expanded, setExpanded] = useState<string | null>(IS_MOCK ? "SH-2026-11-06-B" : null);
  const [creating, setCreating] = useState(false);
  const [newNotes, setNewNotes] = useState("");
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<ShiftHandoverSchema[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [newShift, setNewShift] = useState({
    shift_name: "C", supervisor_name: "", production_target: 500, production_actual: 0,
    fpy_pct: 100, oee_pct: 0, downtime_minutes: 0, open_ncrs: 0,
  });

  useEffect(() => {
    if (!IS_MOCK) shiftHandoverApi.list().then(setLogs).catch(() => {});
  }, []);

  const displayLogs = IS_MOCK
    ? MOCK_LOGS
    : logs.map((r) => ({
        id: r.id,
        shift: r.shift_name as "A" | "B" | "C",
        date: r.shift_date,
        supervisor: r.supervisor_name,
        fromTime: r.from_time,
        toTime: r.to_time,
        production: { target: r.production_target, actual: r.production_actual, fpy: r.fpy_pct },
        oee: r.oee_pct,
        downtime: r.downtime_minutes,
        openNCRs: r.open_ncrs,
        status: r.status as "submitted" | "acknowledged" | "pending",
        notes: r.notes,
        issues: r.issues as ShiftLog["issues"],
        handoverItems: r.handover_items.map((hi) => ({ ...hi, from: (hi as Record<string, unknown>).from_name as string })) as ShiftLog["handoverItems"],
      }));

  const currentLog = displayLogs[0] ?? MOCK_LOGS[0];

  async function handleSubmitHandover() {
    setSubmitting(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      if (!IS_MOCK) {
        const created = await shiftHandoverApi.create({
          shift_name: newShift.shift_name,
          shift_date: dateStr,
          from_time: "22:00",
          to_time: "06:00",
          supervisor_name: newShift.supervisor_name || "Supervisor",
          production_target: newShift.production_target,
          production_actual: newShift.production_actual,
          fpy_pct: newShift.fpy_pct,
          oee_pct: newShift.oee_pct,
          downtime_minutes: newShift.downtime_minutes,
          open_ncrs: newShift.open_ncrs,
          notes: newNotes,
          issues: [],
          handover_items: [],
        });
        setLogs((prev) => [created, ...prev]);
      }
      setCreating(false);
      setNewNotes("");
    } finally { setSubmitting(false); }
  }

  async function handleAcknowledge(id: string) {
    if (!IS_MOCK) await shiftHandoverApi.acknowledge(id);
    setAcknowledged((prev) => new Set([...prev, id]));
    setLogs((prev) => prev.map((r) => r.id === id ? { ...r, status: "acknowledged" } : r));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary">Shift Handover</h1>
          <p className="font-sans text-xs text-text-tertiary mt-0.5">Digital logbook · shift-to-shift knowledge transfer · production summary</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg font-sans text-xs font-semibold hover:bg-brand/90 transition-colors">
          <Plus size={14} />
          Submit Handover
        </button>
      </div>

      {/* Current shift summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Shift Output", value: `${currentLog.production.actual}`, sub: `/ ${currentLog.production.target} target`, trend: currentLog.production.actual >= currentLog.production.target },
          { label: "OEE", value: `${currentLog.oee}%`, sub: `Shift B average`, trend: currentLog.oee >= 75 },
          { label: "Downtime", value: `${currentLog.downtime}min`, sub: "total this shift", trend: currentLog.downtime < 30 },
          { label: "Open NCRs", value: `${currentLog.openNCRs}`, sub: "quality holds", trend: currentLog.openNCRs === 0 },
        ].map(k => (
          <div key={k.label} className="bg-surface border border-border rounded-xl p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-2xs text-text-tertiary uppercase tracking-widest mb-1">{k.label}</p>
                <p className={`font-mono text-lg font-bold ${k.trend ? "text-success" : "text-danger"}`}>{k.value}</p>
                <p className="font-sans text-2xs text-text-tertiary">{k.sub}</p>
              </div>
              {k.trend ? <TrendingUp size={14} className="text-success mt-0.5" /> : <TrendingDown size={14} className="text-danger mt-0.5" />}
            </div>
          </div>
        ))}
      </div>

      {/* New handover form */}
      {creating && (
        <div className="bg-surface border border-brand/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-heading text-sm font-bold text-text-primary">Submit Shift Handover — Shift C (22:00 → 06:00)</p>
            <button onClick={() => setCreating(false)} className="text-text-tertiary hover:text-text-primary font-mono text-xs">Cancel</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-2xs text-text-tertiary uppercase tracking-widest block mb-1">Supervisor</label>
              <input defaultValue="Demo User" className="w-full font-sans text-xs bg-bg border border-border rounded-lg px-3 py-2 text-text-primary focus:border-brand focus:outline-none" />
            </div>
            <div>
              <label className="font-mono text-2xs text-text-tertiary uppercase tracking-widest block mb-1">Shift Output (actual pcs)</label>
              <input type="number" defaultValue="0" className="w-full font-mono text-xs bg-bg border border-border rounded-lg px-3 py-2 text-text-primary focus:border-brand focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="font-mono text-2xs text-text-tertiary uppercase tracking-widest block mb-1">Shift Notes & Observations</label>
            <textarea rows={4} value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Describe any notable events, machine issues, quality concerns, safety observations..."
              className="w-full font-sans text-xs bg-bg border border-border rounded-lg px-3 py-2 text-text-primary focus:border-brand focus:outline-none resize-none" />
          </div>
          <div>
            <label className="font-mono text-2xs text-text-tertiary uppercase tracking-widest block mb-2">Issues / Escalations</label>
            <div className="space-y-2">
              {["High — Safety / Quality hold", "Medium — Machine issue", "Low — Observation"].map(s => (
                <div key={s} className="flex gap-2 items-center">
                  <input className="flex-1 font-sans text-xs bg-bg border border-border rounded-lg px-3 py-1.5 text-text-primary focus:border-brand focus:outline-none" placeholder={s} />
                  <input className="flex-1 font-sans text-xs bg-bg border border-border rounded-lg px-3 py-1.5 text-text-primary focus:border-brand focus:outline-none" placeholder="Action taken / required" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmitHandover} disabled={submitting}
              className="px-5 py-2 bg-brand text-white rounded-lg font-sans text-xs font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60">
              {submitting ? "Submitting…" : "Submit & Sign"}
            </button>
            <button onClick={() => setCreating(false)}
              className="px-5 py-2 bg-surface border border-border text-text-primary rounded-lg font-sans text-xs hover:bg-bg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Handover log list */}
      <div className="space-y-3">
        {displayLogs.map(log => {
          const sc = SHIFT_COLORS[log.shift];
          const isExpanded = expanded === log.id;
          const isAcked = acknowledged.has(log.id);
          return (
            <div key={log.id} className={`bg-surface border rounded-xl overflow-hidden transition-all ${log.status === "pending" ? "border-warning/40" : "border-border"}`}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-bg/40 transition-colors"
                onClick={() => setExpanded(isExpanded ? null : log.id)}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${sc.bg} ${sc.text} border ${sc.border}`}>
                    {log.shift}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-heading text-sm font-semibold text-text-primary">{log.date} · Shift {log.shift} · {log.fromTime}–{log.toTime}</p>
                      <span className={`px-2 py-0.5 rounded-full font-mono text-2xs uppercase ${log.status === "acknowledged" || isAcked ? "bg-success/12 text-success" : log.status === "submitted" ? "bg-brand/12 text-brand" : "bg-warning/12 text-warning"}`}>
                        {isAcked ? "acknowledged" : log.status}
                      </span>
                    </div>
                    <p className="font-sans text-xs text-text-tertiary">{log.supervisor} · {log.production.actual}/{log.production.target} pcs · OEE {log.oee}% · {log.downtime}min DT</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {log.issues.some(i => !i.resolved) && (
                    <div className="flex items-center gap-1 text-warning">
                      <AlertTriangle size={12} />
                      <span className="font-mono text-2xs">{log.issues.filter(i => !i.resolved).length} open</span>
                    </div>
                  )}
                  {isExpanded ? <ChevronUp size={16} className="text-text-tertiary" /> : <ChevronDown size={16} className="text-text-tertiary" />}
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-4 space-y-5">
                  {/* Notes */}
                  <div>
                    <p className="font-mono text-2xs text-text-tertiary uppercase tracking-widest mb-2">Shift Notes</p>
                    <p className="font-sans text-xs text-text-secondary leading-relaxed bg-bg rounded-lg px-3 py-2 border border-border">{log.notes}</p>
                  </div>

                  {/* Issues */}
                  <div>
                    <p className="font-mono text-2xs text-text-tertiary uppercase tracking-widest mb-2">Issues & Escalations ({log.issues.length})</p>
                    <div className="space-y-2">
                      {log.issues.map((issue, i) => (
                        <div key={i} className={`flex items-start gap-3 rounded-lg px-3 py-2 border ${SEV_CONFIG[issue.severity].bg}`}>
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${issue.severity === "high" ? "bg-danger" : issue.severity === "medium" ? "bg-warning" : "bg-text-tertiary"}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`font-sans text-xs font-medium ${SEV_CONFIG[issue.severity].color}`}>{issue.description}</p>
                            <p className="font-sans text-xs text-text-tertiary mt-0.5">↳ {issue.action}</p>
                          </div>
                          {issue.resolved
                            ? <CheckCircle2 size={14} className="text-success shrink-0 mt-0.5" />
                            : <Clock size={14} className="text-warning shrink-0 mt-0.5" />
                          }
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Handover items */}
                  <div>
                    <p className="font-mono text-2xs text-text-tertiary uppercase tracking-widest mb-2">Handover Items — Incoming Shift Must Note</p>
                    <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                      {log.handoverItems.map((item, i) => (
                        <div key={i} className="flex gap-3 px-3 py-2.5 hover:bg-bg transition-colors">
                          <span className="font-mono text-2xs text-brand uppercase bg-brand/10 px-1.5 py-0.5 rounded whitespace-nowrap h-fit mt-0.5">{item.category}</span>
                          <p className="font-sans text-xs text-text-secondary flex-1">{item.item}</p>
                          <span className="font-mono text-2xs text-text-tertiary whitespace-nowrap">{item.from}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* KPI summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { label: "Target", value: log.production.target.toString() },
                      { label: "Actual", value: log.production.actual.toString() },
                      { label: "FPY", value: `${log.production.fpy}%` },
                      { label: "OEE", value: `${log.oee}%` },
                      { label: "Downtime", value: `${log.downtime}m` },
                    ].map(k => (
                      <div key={k.label} className="bg-bg border border-border rounded-lg p-2 text-center">
                        <p className="font-mono text-2xs text-text-tertiary mb-0.5">{k.label}</p>
                        <p className="font-mono text-xs font-bold text-text-primary">{k.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Acknowledge button */}
                  {log.status === "submitted" && !isAcked && (
                    <div className="flex items-center gap-3 bg-brand/8 border border-brand/20 rounded-lg px-3 py-2">
                      <FileText size={13} className="text-brand shrink-0" />
                      <p className="font-sans text-xs text-brand flex-1">Incoming supervisor — please review and acknowledge this handover</p>
                      <button onClick={() => handleAcknowledge(log.id)}
                        className="px-3 py-1 bg-brand text-white rounded font-sans text-xs font-semibold hover:bg-brand/90 transition-colors whitespace-nowrap">
                        Acknowledge & Sign
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
