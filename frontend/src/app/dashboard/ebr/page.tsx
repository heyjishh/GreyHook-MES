"use client";

import { useState } from "react";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Pen,
  Search,
  Plus,
  Shield,
  XCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

type EBRStatus = "in_progress" | "review" | "approved" | "rejected" | "closed";
type StepStatus = "pending" | "in_progress" | "completed" | "deviated" | "skipped";

interface StepEntry {
  seq: number;
  name: string;
  operator?: string;
  startedAt?: string;
  completedAt?: string;
  status: StepStatus;
  readings: { param: string; expected: string; actual: string; pass: boolean }[];
  deviation?: string;
  signature?: string;
  signedAt?: string;
}

interface EBR {
  id: string;
  batchNo: string;
  recipeCode: string;
  recipeName: string;
  recipeVersion: string;
  product: string;
  line: string;
  plannedQty: number;
  unit: string;
  status: EBRStatus;
  startedAt: string;
  completedAt?: string;
  reviewedBy?: string;
  approvedBy?: string;
  deviationCount: number;
  steps: StepEntry[];
  auditLog: { ts: string; user: string; action: string }[];
}

const EBR_RECORDS: EBR[] = [
  {
    id: "EBR-2026-0892",
    batchNo: "BN-2026-11-0892",
    recipeCode: "PST-GA-001",
    recipeName: "Precision Shaft Turning — Grade A",
    recipeVersion: "3.2",
    product: "Shaft Assembly SH-4400",
    line: "Line 3 — CNC Bay",
    plannedQty: 50,
    unit: "pcs",
    status: "review",
    startedAt: "2026-11-06T07:30",
    completedAt: "2026-11-06T10:15",
    deviationCount: 1,
    steps: [
      {
        seq: 1,
        name: "Material Verification",
        operator: "Rajan M.",
        startedAt: "07:30",
        completedAt: "07:34",
        status: "completed",
        readings: [
          { param: "Bar Diameter (mm)", expected: "41.8–42.2", actual: "42.05", pass: true },
          { param: "Heat Number Match", expected: "Yes", actual: "Yes", pass: true },
          { param: "Material Grade", expected: "4140", actual: "4140", pass: true },
        ],
        signature: "Rajan M.",
        signedAt: "07:34",
      },
      {
        seq: 2,
        name: "Rough Turning",
        operator: "Rajan M.",
        startedAt: "07:34",
        completedAt: "07:51",
        status: "deviated",
        deviation: "Spindle speed set to 820 RPM (below nominal 850) due to tool vibration. Tool replaced at 07:42. Resumed at 850 RPM. Deviation reported and production continued with supervisor approval.",
        readings: [
          { param: "Spindle Speed (RPM)", expected: "800–900", actual: "820→850", pass: true },
          { param: "Feed Rate (mm/rev)", expected: "0.20–0.30", actual: "0.25", pass: true },
          { param: "Depth of Cut (mm)", expected: "2.0–3.0", actual: "2.5", pass: true },
        ],
        signature: "Rajan M.",
        signedAt: "07:51",
      },
      {
        seq: 3,
        name: "Finish Turning",
        operator: "Rajan M.",
        startedAt: "07:51",
        completedAt: "09:45",
        status: "completed",
        readings: [
          { param: "Finished Dia (mm)", expected: "39.985–40.015", actual: "40.002", pass: true },
          { param: "Surface Finish Ra (µm)", expected: "0–1.6", actual: "0.74", pass: true },
        ],
        signature: "Rajan M.",
        signedAt: "09:45",
      },
      {
        seq: 4,
        name: "Inspection & Release",
        operator: "QC Singh",
        startedAt: "10:00",
        completedAt: "10:15",
        status: "completed",
        readings: [
          { param: "CMM Result", expected: "Pass", actual: "Pass", pass: true },
          { param: "Visual OK", expected: "Yes", actual: "Yes", pass: true },
        ],
        signature: "QC Singh",
        signedAt: "10:15",
      },
    ],
    auditLog: [
      { ts: "2026-11-06 10:16", user: "QC Singh", action: "Marked batch COMPLETE and submitted for review." },
      { ts: "2026-11-06 07:42", user: "Rajan M.", action: "Deviation DEV-0892-01 raised for step 2 — tool vibration." },
      { ts: "2026-11-06 07:30", user: "Rajan M.", action: "Electronic Batch Record opened." },
    ],
  },
  {
    id: "EBR-2026-0891",
    batchNo: "BN-2026-11-0891",
    recipeCode: "BDA-STD-002",
    recipeName: "Brake Disc Assembly — Standard",
    recipeVersion: "1.5",
    product: "Brake Disc BD-700",
    line: "Line 1 — Assembly",
    plannedQty: 100,
    unit: "pcs",
    status: "approved",
    startedAt: "2026-11-05T14:00",
    completedAt: "2026-11-05T17:20",
    reviewedBy: "Sup. Sharma",
    approvedBy: "Mgr. Nair",
    deviationCount: 0,
    steps: [
      {
        seq: 1,
        name: "Component Kitting",
        operator: "Amit K.",
        startedAt: "14:00",
        completedAt: "14:08",
        status: "completed",
        readings: [
          { param: "Disc Lot Scanned", expected: "Yes", actual: "Yes", pass: true },
          { param: "Hub Lot Scanned", expected: "Yes", actual: "Yes", pass: true },
          { param: "Fastener Kit PN", expected: "FK-7001-A", actual: "FK-7001-A", pass: true },
        ],
        signature: "Amit K.",
        signedAt: "14:08",
      },
      {
        seq: 2,
        name: "Press Fit Hub",
        operator: "Amit K.",
        startedAt: "14:08",
        completedAt: "15:50",
        status: "completed",
        readings: [
          { param: "Peak Press Force (kN)", expected: "28–45", actual: "36.4", pass: true },
          { param: "Bore Clearance (µm)", expected: "5–25", actual: "14", pass: true },
        ],
        signature: "Amit K.",
        signedAt: "15:50",
      },
      {
        seq: 3,
        name: "Torque Fasteners",
        operator: "Amit K.",
        startedAt: "15:50",
        completedAt: "17:10",
        status: "completed",
        readings: [
          { param: "Torque Value (Nm)", expected: "40–44", actual: "42", pass: true },
          { param: "Thread-lock Applied", expected: "Yes", actual: "Yes", pass: true },
        ],
        signature: "Amit K.",
        signedAt: "17:10",
      },
      {
        seq: 4,
        name: "Final Check",
        operator: "QC Singh",
        startedAt: "17:10",
        completedAt: "17:20",
        status: "completed",
        readings: [
          { param: "Lateral Run-out (mm TIR)", expected: "0–0.10", actual: "0.04", pass: true },
        ],
        signature: "QC Singh",
        signedAt: "17:20",
      },
    ],
    auditLog: [
      { ts: "2026-11-05 18:05", user: "Mgr. Nair", action: "EBR APPROVED. No deviations. Batch released." },
      { ts: "2026-11-05 17:45", user: "Sup. Sharma", action: "Review complete. Recommended for approval." },
      { ts: "2026-11-05 17:21", user: "QC Singh", action: "Batch COMPLETE. Submitted for review." },
    ],
  },
];

const STATUS_CONFIG: Record<EBRStatus, { label: string; color: string }> = {
  in_progress: { label: "In Progress",  color: "text-brand bg-brand/10 border-brand/20" },
  review:      { label: "In Review",    color: "text-warning bg-warning/10 border-warning/20" },
  approved:    { label: "Approved",     color: "text-success bg-success/10 border-success/20" },
  rejected:    { label: "Rejected",     color: "text-danger bg-danger/10 border-danger/20" },
  closed:      { label: "Closed",       color: "text-text-disabled bg-surface border-border" },
};

const STEP_STATUS_CONFIG: Record<StepStatus, { color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  pending:    { color: "text-text-disabled border-border",          icon: Clock },
  in_progress:{ color: "text-brand border-brand/20 bg-brand/5",     icon: Clock },
  completed:  { color: "text-success border-success/20 bg-success/5",icon: CheckCircle2 },
  deviated:   { color: "text-warning border-warning/20 bg-warning/5",icon: AlertTriangle },
  skipped:    { color: "text-text-disabled border-border",           icon: XCircle },
};

function ReadingRow({ r }: { r: StepEntry["readings"][0] }) {
  return (
    <tr className={cn("text-xs font-sans border-b border-border last:border-0", !r.pass && "bg-danger/3")}>
      <td className="py-2 px-3 text-text-secondary">{r.param}</td>
      <td className="py-2 px-3 font-mono text-text-secondary">{r.expected}</td>
      <td className={cn("py-2 px-3 font-mono font-semibold", r.pass ? "text-success" : "text-danger")}>{r.actual}</td>
      <td className="py-2 px-3">
        {r.pass ? <CheckCircle2 size={12} className="text-success" /> : <XCircle size={12} className="text-danger" />}
      </td>
    </tr>
  );
}

export default function EBRPage() {
  const [selectedId, setSelectedId] = useState<string>("EBR-2026-0892");
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [tab, setTab] = useState<"steps" | "audit">("steps");
  const [search, setSearch] = useState("");

  const filtered = EBR_RECORDS.filter(
    (e) => !search || e.id.includes(search) || e.batchNo.includes(search) || e.product.toLowerCase().includes(search.toLowerCase())
  );
  const ebr = EBR_RECORDS.find((e) => e.id === selectedId) ?? EBR_RECORDS[0];

  const passCount = ebr.steps.filter((s) => s.status === "completed").length;
  const deviatedCount = ebr.steps.filter((s) => s.status === "deviated").length;

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-lg font-bold text-text-primary">Electronic Batch Records</h1>
            <p className="font-sans text-xs text-text-secondary mt-0.5">
              21 CFR Part 11 — digital batch execution, sign-offs, deviation capture, and audit trail
            </p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white font-sans text-xs font-semibold hover:bg-brand/90 transition-colors shrink-0">
            <Plus size={13} />
            Open New EBR
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* List */}
        <div className="hidden md:flex w-64 shrink-0 flex-col border-r border-border">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-disabled" />
              <input
                className="w-full pl-7 pr-2 py-1.5 bg-surface border border-border rounded-lg font-sans text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand"
                placeholder="Search EBR..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {filtered.map((e) => {
              const cfg = STATUS_CONFIG[e.status];
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 mx-1 rounded-lg transition-colors",
                    selectedId === e.id ? "bg-brand/8 border border-brand/20" : "hover:bg-surface"
                  )}
                  style={{ width: "calc(100% - 8px)" }}
                >
                  <div className="flex items-start justify-between gap-1 mb-0.5">
                    <span className="font-mono text-xs font-bold text-text-primary">{e.id}</span>
                    <span className={cn("px-1.5 py-0.5 rounded text-2xs border", cfg.color)}>{cfg.label}</span>
                  </div>
                  <div className="font-sans text-2xs text-text-secondary truncate">{e.product}</div>
                  <div className="font-mono text-2xs text-text-disabled">{e.batchNo}</div>
                  {e.deviationCount > 0 && (
                    <div className="flex items-center gap-1 mt-1 font-mono text-2xs text-warning">
                      <AlertTriangle size={9} />
                      {e.deviationCount} deviation{e.deviationCount > 1 ? "s" : ""}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", STATUS_CONFIG[ebr.status].color)}>
                    {STATUS_CONFIG[ebr.status].label}
                  </span>
                  {ebr.deviationCount > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs border text-warning bg-warning/10 border-warning/20">
                      <AlertTriangle size={10} />
                      {ebr.deviationCount} Deviation{ebr.deviationCount > 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs border text-text-secondary bg-surface border-border">
                    <Shield size={10} className="text-text-disabled" />
                    21 CFR Part 11
                  </span>
                </div>
                <h2 className="font-heading text-base font-bold text-text-primary">{ebr.id}</h2>
                <p className="font-sans text-xs text-text-secondary">{ebr.batchNo} · {ebr.product}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {ebr.status === "review" && (
                  <>
                    <button className="px-3 py-1.5 rounded-lg border border-danger text-danger text-xs font-sans hover:bg-danger/5 transition-colors">
                      Reject
                    </button>
                    <button className="px-3 py-1.5 rounded-lg bg-success text-white text-xs font-sans font-semibold hover:bg-success/90 transition-colors">
                      Approve EBR
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Recipe", value: ebr.recipeCode, sub: `v${ebr.recipeVersion}` },
                { label: "Line",   value: ebr.line, sub: "" },
                { label: "Qty",    value: `${ebr.plannedQty} ${ebr.unit}`, sub: "planned" },
                { label: "Started",value: ebr.startedAt.replace("T", " "), sub: "" },
                { label: "Completed", value: ebr.completedAt ?? "—", sub: "" },
                { label: "Reviewed by", value: ebr.reviewedBy ?? "Pending", sub: ebr.approvedBy ? `Approved: ${ebr.approvedBy}` : "" },
              ].map(({ label, value, sub }) => (
                <div key={label} className="p-3 rounded-xl bg-surface border border-border">
                  <div className="font-mono text-xs font-bold text-text-primary truncate">{value}</div>
                  <div className="font-sans text-2xs text-text-secondary mt-0.5">{label}</div>
                  {sub && <div className="font-mono text-2xs text-text-disabled">{sub}</div>}
                </div>
              ))}
            </div>

            {/* Progress summary */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-border">
              <div className="text-center">
                <div className="font-mono text-lg font-bold text-success">{passCount}</div>
                <div className="font-sans text-2xs text-text-disabled">Passed</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-lg font-bold text-warning">{deviatedCount}</div>
                <div className="font-sans text-2xs text-text-disabled">Deviated</div>
              </div>
              <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-success rounded-full transition-all"
                  style={{ width: `${(passCount / ebr.steps.length) * 100}%` }}
                />
              </div>
              <div className="font-mono text-xs text-text-secondary">
                {passCount}/{ebr.steps.length} steps
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border gap-5">
              {(["steps", "audit"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "pb-2 font-sans text-xs font-medium capitalize border-b-2 -mb-px transition-colors",
                    tab === t ? "border-brand text-brand" : "border-transparent text-text-secondary hover:text-text-primary"
                  )}
                >
                  {t === "audit" ? "Audit Trail" : "Executed Steps"}
                </button>
              ))}
            </div>

            {tab === "steps" && (
              <div className="space-y-3">
                {ebr.steps.map((step) => {
                  const cfg = STEP_STATUS_CONFIG[step.status];
                  const StepIcon = cfg.icon;
                  return (
                    <div key={step.seq} className={cn("rounded-xl border overflow-hidden", cfg.color.includes("bg") ? cfg.color.split(" ").filter(c => c.startsWith("border")).join(" ") : "border-border")}>
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface/50 transition-colors"
                        onClick={() => setExpandedStep(expandedStep === step.seq ? null : step.seq)}
                      >
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 border", cfg.color)}>
                          <StepIcon size={11} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-sans text-sm font-semibold text-text-primary">
                              {step.seq}. {step.name}
                            </span>
                            {step.status === "deviated" && (
                              <span className="px-1.5 py-0.5 rounded text-2xs bg-warning/10 text-warning border border-warning/20 font-mono">
                                DEVIATION
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-2xs text-text-disabled mt-0.5">
                            {step.operator && `${step.operator} · `}
                            {step.startedAt} → {step.completedAt}
                            {step.signature && ` · ✓ Signed ${step.signedAt}`}
                          </div>
                        </div>
                        {expandedStep === step.seq ? <ChevronUp size={14} className="text-text-disabled shrink-0" /> : <ChevronDown size={14} className="text-text-disabled shrink-0" />}
                      </button>
                      {expandedStep === step.seq && (
                        <div className="border-t border-border">
                          {step.deviation && (
                            <div className="mx-4 mt-3 p-3 rounded-lg bg-warning/5 border border-warning/20 flex gap-2">
                              <AlertTriangle size={13} className="text-warning shrink-0 mt-0.5" />
                              <p className="font-sans text-xs text-text-secondary leading-relaxed">{step.deviation}</p>
                            </div>
                          )}
                          <div className="overflow-x-auto mx-4 my-3">
                            <table className="w-full">
                              <thead>
                                <tr className="text-2xs font-mono text-text-disabled uppercase border-b border-border">
                                  <th className="text-left py-1.5 px-3 font-medium">Parameter</th>
                                  <th className="text-left py-1.5 px-3 font-medium">Expected</th>
                                  <th className="text-left py-1.5 px-3 font-medium">Actual</th>
                                  <th className="py-1.5 px-3"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {step.readings.map((r) => <ReadingRow key={r.param} r={r} />)}
                              </tbody>
                            </table>
                          </div>
                          {step.signature && (
                            <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border">
                              <Pen size={11} className="text-text-disabled" />
                              <span className="font-mono text-xs text-text-secondary">
                                Electronically signed by <strong className="text-text-primary">{step.signature}</strong> at {step.signedAt}
                              </span>
                              <Lock size={10} className="text-text-disabled ml-auto" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {tab === "audit" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-brand/5 border border-brand/15 mb-3">
                  <Info size={12} className="text-brand shrink-0" />
                  <p className="font-sans text-xs text-text-secondary">
                    Immutable audit trail — all entries are timestamped and user-attributed per 21 CFR Part 11.
                  </p>
                </div>
                {ebr.auditLog.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-surface border border-border">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-xs text-text-primary">{entry.action}</p>
                      <div className="flex items-center gap-2 mt-1 font-mono text-2xs text-text-disabled">
                        <User size={9} />
                        {entry.user}
                        <Calendar size={9} className="ml-1" />
                        {entry.ts}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
