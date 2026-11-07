"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle2, XCircle, Award, User } from "lucide-react";
import ReactECharts from "echarts-for-react";

const OPERATORS = [
  { id: "OP001", name: "K. Patel", role: "CNC Machinist", shift: "A", avatar: "K" },
  { id: "OP002", name: "R. Singh", role: "Press Operator", shift: "A", avatar: "R" },
  { id: "OP003", name: "M. Shah", role: "Welder", shift: "A", avatar: "M" },
  { id: "OP004", name: "D. Kumar", role: "Assembly Tech", shift: "B", avatar: "D" },
  { id: "OP005", name: "A. Verma", role: "QC Inspector", shift: "A", avatar: "A" },
  { id: "OP006", name: "S. Joshi", role: "CNC Machinist", shift: "B", avatar: "S" },
];

const OPERATIONS = ["CNC Turning", "CNC Milling", "Press Forming", "MIG Welding", "TIG Welding", "Assembly", "Quality Inspection", "Deburring", "Grinding"];

type SkillLevel = "certified" | "in_training" | "not_certified" | "expired";

const SKILL_MATRIX: Record<string, Record<string, SkillLevel>> = {
  "OP001": { "CNC Turning": "certified", "CNC Milling": "certified", "Press Forming": "in_training", "MIG Welding": "not_certified", "TIG Welding": "not_certified", "Assembly": "certified", "Quality Inspection": "in_training", "Deburring": "certified", "Grinding": "certified" },
  "OP002": { "CNC Turning": "in_training", "CNC Milling": "not_certified", "Press Forming": "certified", "MIG Welding": "not_certified", "TIG Welding": "not_certified", "Assembly": "certified", "Quality Inspection": "certified", "Deburring": "certified", "Grinding": "not_certified" },
  "OP003": { "CNC Turning": "not_certified", "CNC Milling": "not_certified", "Press Forming": "not_certified", "MIG Welding": "certified", "TIG Welding": "certified", "Assembly": "in_training", "Quality Inspection": "not_certified", "Deburring": "certified", "Grinding": "not_certified" },
  "OP004": { "CNC Turning": "in_training", "CNC Milling": "not_certified", "Press Forming": "certified", "MIG Welding": "in_training", "TIG Welding": "not_certified", "Assembly": "certified", "Quality Inspection": "certified", "Deburring": "certified", "Grinding": "certified" },
  "OP005": { "CNC Turning": "not_certified", "CNC Milling": "not_certified", "Press Forming": "not_certified", "MIG Welding": "not_certified", "TIG Welding": "not_certified", "Assembly": "certified", "Quality Inspection": "certified", "Deburring": "certified", "Grinding": "not_certified" },
  "OP006": { "CNC Turning": "certified", "CNC Milling": "certified", "Press Forming": "in_training", "MIG Welding": "not_certified", "TIG Welding": "not_certified", "Assembly": "certified", "Quality Inspection": "expired", "Deburring": "certified", "Grinding": "certified" },
};

interface TimeLog {
  id: string;
  operator: string;
  workOrder: string;
  operation: string;
  startTime: string;
  endTime?: string;
  standardHours: number;
  actualHours?: number;
  completedQty: number;
  status: "active" | "completed" | "paused";
}

const MOCK_TIMELOGS: TimeLog[] = [
  { id: "TL-001", operator: "K. Patel", workOrder: "PO-2026-11-002", operation: "CNC Turning", startTime: "08:30", endTime: "11:45", standardHours: 3.0, actualHours: 3.25, completedQty: 50, status: "completed" },
  { id: "TL-002", operator: "K. Patel", workOrder: "PO-2026-11-002", operation: "CNC Milling", startTime: "12:15", standardHours: 2.5, completedQty: 30, status: "active" },
  { id: "TL-003", operator: "R. Singh", workOrder: "PO-2026-11-004", operation: "Press Forming", startTime: "07:00", endTime: "12:00", standardHours: 5.0, actualHours: 5.0, completedQty: 50, status: "completed" },
  { id: "TL-004", operator: "M. Shah", workOrder: "PO-2026-11-006", operation: "MIG Welding", startTime: "08:00", standardHours: 6.0, completedQty: 28, status: "active" },
  { id: "TL-005", operator: "A. Verma", workOrder: "PO-2026-11-001", operation: "Quality Inspection", startTime: "09:30", endTime: "11:00", standardHours: 1.5, actualHours: 1.5, completedQty: 200, status: "completed" },
  { id: "TL-006", operator: "D. Kumar", workOrder: "PO-2026-11-003", operation: "Assembly", startTime: "14:00", standardHours: 4.0, completedQty: 20, status: "paused" },
];

const SKILL_CONFIG: Record<SkillLevel, { label: string; color: string; bg: string }> = {
  certified:     { label: "✓", color: "text-success", bg: "bg-success/15" },
  in_training:   { label: "~", color: "text-warning", bg: "bg-warning/15" },
  not_certified: { label: "—", color: "text-text-disabled", bg: "bg-bg" },
  expired:       { label: "!", color: "text-danger", bg: "bg-danger/15" },
};

function ElapsedTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState("00:00:00");
  useEffect(() => {
    const compute = () => {
      const [h, m] = startTime.split(":").map(Number);
      const start = new Date();
      start.setHours(h, m, 0, 0);
      const diff = Math.max(0, (Date.now() - start.getTime()) / 1000);
      const hh = Math.floor(diff / 3600);
      const mm = Math.floor((diff % 3600) / 60);
      const ss = Math.floor(diff % 60);
      setElapsed(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`);
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  return <span className="font-mono text-xs text-brand tabular-nums">{elapsed}</span>;
}

export default function LaborPage() {
  const [activeTab, setActiveTab] = useState<"timelogs" | "skillmatrix" | "report">("timelogs");

  const totalStdHours = MOCK_TIMELOGS.filter(t => t.actualHours !== undefined).reduce((s, t) => s + t.standardHours, 0);
  const totalActHours = MOCK_TIMELOGS.filter(t => t.actualHours !== undefined).reduce((s, t) => s + (t.actualHours || 0), 0);
  const efficiency = Math.round((totalStdHours / totalActHours) * 100);

  const efficiencyOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", backgroundColor: "#0D1B2A", borderColor: "#1E3A5F", textStyle: { color: "#E5E7EB", fontSize: 11 } },
    legend: { bottom: 0, textStyle: { color: "#9CA3AF", fontSize: 9 }, itemHeight: 8 },
    grid: { left: 56, right: 20, top: 12, bottom: 44 },
    xAxis: { type: "category", data: OPERATORS.map(o => o.name.split(" ")[1]), axisLabel: { color: "#6B7280", fontSize: 10 }, axisLine: { lineStyle: { color: "#1E3A5F" } } },
    yAxis: { type: "value", max: 130, axisLabel: { color: "#6B7280", fontSize: 10, formatter: (v: number) => `${v}%` }, splitLine: { lineStyle: { color: "#1E3A5F", type: "dashed" } } },
    series: [
      { name: "Std Hours", type: "bar", data: [3.0, 5.0, 6.0, 4.0, 1.5, 0], barWidth: "35%", itemStyle: { color: "#2563EB" } },
      { name: "Actual Hours", type: "bar", data: [3.25, 5.0, 5.8, 4.2, 1.5, 0], barWidth: "35%", itemStyle: { color: "#F05230" } },
    ],
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary">Labor Management</h1>
          <p className="font-sans text-xs text-text-tertiary mt-0.5">Time logs per job · skill matrix · labor efficiency</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Operators", value: `${MOCK_TIMELOGS.filter(t => t.status === "active").length}`, color: "text-brand" },
          { label: "Labor Efficiency", value: `${efficiency}%`, color: efficiency >= 100 ? "text-success" : efficiency >= 90 ? "text-warning" : "text-danger" },
          { label: "Std Hours (today)", value: totalStdHours.toFixed(1), color: "text-text-primary" },
          { label: "Actual Hours (today)", value: totalActHours.toFixed(1), color: totalActHours <= totalStdHours ? "text-success" : "text-danger" },
        ].map(k => (
          <div key={k.label} className="bg-surface border border-border rounded-xl p-3">
            <p className="font-mono text-2xs text-text-tertiary uppercase tracking-widest mb-1">{k.label}</p>
            <p className={`font-mono text-lg font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex border-b border-border gap-1">
        {([["timelogs", "Time Logs"], ["skillmatrix", "Skill Matrix"], ["report", "Labor Report"]] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-sans text-xs font-medium transition-colors border-b-2 -mb-px ${activeTab === tab ? "border-brand text-brand" : "border-transparent text-text-tertiary hover:text-text-primary"}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "timelogs" && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead className="border-b border-border">
              <tr>
                {["ID", "Operator", "Work Order", "Operation", "Start", "End / Elapsed", "Std Hrs", "Actual Hrs", "Efficiency", "Qty", "Status"].map(h => (
                  <th key={h} className="text-left text-text-tertiary font-medium py-3 px-3 uppercase tracking-widest text-2xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MOCK_TIMELOGS.map(log => {
                const eff = log.actualHours ? Math.round((log.standardHours / log.actualHours) * 100) : null;
                return (
                  <tr key={log.id} className="hover:bg-bg/50">
                    <td className="py-2 px-3 text-brand">{log.id}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-brand/20 flex items-center justify-center text-brand text-2xs font-bold shrink-0">
                          {log.operator.charAt(0)}
                        </div>
                        <span className="text-text-primary">{log.operator}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-text-secondary">{log.workOrder}</td>
                    <td className="py-2 px-3 text-text-secondary">{log.operation}</td>
                    <td className="py-2 px-3 text-text-tertiary">{log.startTime}</td>
                    <td className="py-2 px-3">
                      {log.status === "active" ? <ElapsedTimer startTime={log.startTime} /> :
                       log.status === "paused" ? <span className="text-warning">Paused</span> :
                       <span className="text-text-tertiary">{log.endTime}</span>}
                    </td>
                    <td className="py-2 px-3 text-text-secondary">{log.standardHours}h</td>
                    <td className="py-2 px-3">
                      {log.actualHours !== undefined
                        ? <span className={log.actualHours <= log.standardHours ? "text-success" : "text-danger"}>{log.actualHours}h</span>
                        : <span className="text-text-tertiary">—</span>}
                    </td>
                    <td className="py-2 px-3">
                      {eff !== null
                        ? <span className={`font-bold ${eff >= 100 ? "text-success" : eff >= 90 ? "text-warning" : "text-danger"}`}>{eff}%</span>
                        : <span className="text-text-tertiary">—</span>}
                    </td>
                    <td className="py-2 px-3 text-text-secondary">{log.completedQty}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-2xs uppercase ${log.status === "active" ? "bg-brand/12 text-brand" : log.status === "completed" ? "bg-success/12 text-success" : "bg-warning/12 text-warning"}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "skillmatrix" && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs font-mono" style={{ minWidth: 760 }}>
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-text-tertiary font-medium py-3 px-4 uppercase tracking-widest text-2xs whitespace-nowrap sticky left-0 bg-surface border-r border-border">Operator</th>
                  {OPERATIONS.map(op => (
                    <th key={op} className="text-center text-text-tertiary font-medium py-3 px-2 uppercase tracking-widest text-2xs whitespace-nowrap" style={{ minWidth: 90 }}>
                      {op}
                    </th>
                  ))}
                  <th className="text-center text-text-tertiary font-medium py-3 px-3 uppercase tracking-widest text-2xs">Certified Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {OPERATORS.map(op => {
                  const skills = SKILL_MATRIX[op.id];
                  const certCount = Object.values(skills).filter(s => s === "certified").length;
                  const hasExpired = Object.values(skills).some(s => s === "expired");
                  return (
                    <tr key={op.id} className="hover:bg-bg/40">
                      <td className="py-3 px-4 sticky left-0 bg-surface border-r border-border">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xs font-bold shrink-0">{op.avatar}</div>
                          <div>
                            <p className="text-text-primary font-semibold text-xs">{op.name}</p>
                            <p className="text-text-tertiary text-2xs">{op.role}</p>
                          </div>
                        </div>
                      </td>
                      {OPERATIONS.map(opName => {
                        const level = skills[opName] || "not_certified";
                        const sc = SKILL_CONFIG[level];
                        return (
                          <td key={opName} className="py-3 px-2 text-center">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${sc.bg} ${sc.color}`} title={level}>
                              {sc.label}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`font-bold ${certCount >= 6 ? "text-success" : certCount >= 4 ? "text-warning" : "text-danger"}`}>{certCount}/{OPERATIONS.length}</span>
                          {hasExpired && <span className="text-2xs text-danger">! Expired</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-4 px-4 py-3 border-t border-border">
            {Object.entries(SKILL_CONFIG).map(([level, cfg]) => (
              <div key={level} className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded text-xs font-bold inline-flex items-center justify-center ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                <span className="font-sans text-xs text-text-tertiary capitalize">{level.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "report" && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="font-heading text-xs font-semibold text-text-secondary uppercase tracking-widest mb-3">Labor Efficiency by Operator — Today</p>
            <ReactECharts option={efficiencyOption} style={{ height: 220 }} opts={{ renderer: "svg" }} />
          </div>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead className="border-b border-border">
                <tr>
                  {["Operator", "Role", "Shift", "Std Hrs", "Actual Hrs", "Efficiency", "Completed Ops"].map(h => (
                    <th key={h} className="text-left text-text-tertiary font-medium py-3 px-3 uppercase tracking-widest text-2xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {OPERATORS.map(op => {
                  const logs = MOCK_TIMELOGS.filter(t => t.operator === op.name && t.actualHours !== undefined);
                  const stdH = logs.reduce((s, t) => s + t.standardHours, 0);
                  const actH = logs.reduce((s, t) => s + (t.actualHours || 0), 0);
                  const eff = actH > 0 ? Math.round((stdH / actH) * 100) : null;
                  return (
                    <tr key={op.id} className="hover:bg-bg/50">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-brand/20 flex items-center justify-center text-brand text-2xs font-bold shrink-0">{op.avatar}</div>
                          <span className="text-text-primary">{op.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-text-secondary">{op.role}</td>
                      <td className="py-2 px-3 text-text-tertiary">Shift {op.shift}</td>
                      <td className="py-2 px-3 text-text-secondary">{stdH.toFixed(1)}h</td>
                      <td className="py-2 px-3 text-text-secondary">{actH.toFixed(1)}h</td>
                      <td className="py-2 px-3">
                        {eff !== null
                          ? <span className={`font-bold ${eff >= 100 ? "text-success" : eff >= 90 ? "text-warning" : "text-danger"}`}>{eff}%</span>
                          : <span className="text-text-tertiary">No logs</span>}
                      </td>
                      <td className="py-2 px-3 text-text-secondary">{logs.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
