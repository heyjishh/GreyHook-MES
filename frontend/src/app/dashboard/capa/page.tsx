"use client";

import { useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  ShieldAlert,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  ArrowRight,
  Target,
  Layers,
  Link,
} from "lucide-react";
import { cn } from "@/lib/utils";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

type CAPAType = "corrective" | "preventive";
type CAPAStatus = "open" | "investigation" | "action" | "verify" | "closed" | "overdue";
type Priority = "critical" | "high" | "medium" | "low";
type WhyLevel = 1 | 2 | 3 | 4 | 5;

interface WhyEntry { level: WhyLevel; why: string; answer: string }
interface ActionItem {
  id: string;
  description: string;
  owner: string;
  dueDate: string;
  status: "open" | "in_progress" | "done";
  verifyNote?: string;
}

interface CAPA {
  id: string;
  type: CAPAType;
  title: string;
  description: string;
  source: string;
  priority: Priority;
  status: CAPAStatus;
  raisedBy: string;
  raisedAt: string;
  dueDate: string;
  area: string;
  machine?: string;
  linkedNCM?: string;
  rootCause: string;
  whyChain: WhyEntry[];
  actions: ActionItem[];
  effectiveness?: string;
  closedAt?: string;
}

const CAPAS: CAPA[] = [
  {
    id: "CAPA-2026-041",
    type: "corrective",
    title: "High scrap rate on Shaft boring — Tool wear root cause",
    description: "Shaft boring operation on MC-04 generated 7% scrap rate over 3-day period, exceeding 2% threshold. All failures were on finished bore diameter — out-of-spec on the small side.",
    source: "Quality Alert QA-2026-087",
    priority: "high",
    status: "action",
    raisedBy: "QC Singh",
    raisedAt: "2026-10-28",
    dueDate: "2026-11-15",
    area: "Machining — Line 3",
    machine: "MC-04 Boring Centre",
    linkedNCM: "NCM-2026-038",
    rootCause: "Worn boring bar inserts not being replaced per schedule — insert change interval extended informally by operators to reduce tool cost.",
    whyChain: [
      { level: 1, why: "Why is the bore undersized?", answer: "Boring bar tool is deflecting under cutting load." },
      { level: 2, why: "Why is the tool deflecting?", answer: "Insert is severely worn — cutting edge radius has degraded." },
      { level: 3, why: "Why is the insert worn beyond spec?", answer: "Insert was not changed per the 150-piece interval as defined in work instruction." },
      { level: 4, why: "Why was the insert not changed on schedule?", answer: "Operators were told verbally to extend the interval to reduce tool cost." },
      { level: 5, why: "Why was tool change interval extended without formal review?", answer: "No formal change management process for work instruction parameters; verbal override was accepted practice." },
    ],
    actions: [
      { id: "ACT-041-01", description: "Replace all boring bar inserts on MC-04 immediately. Inspect finished parts since last verified insert change.", owner: "Prod. Sup. Rajan", dueDate: "2026-10-29", status: "done", verifyNote: "Completed 2026-10-29. 12 pcs re-inspected — 2 scrapped, 10 passed." },
      { id: "ACT-041-02", description: "Issue formal ECO to restore 150-pc insert change interval in Work Instruction WI-MC04-BOR-001.", owner: "Eng. Patel", dueDate: "2026-11-05", status: "done" },
      { id: "ACT-041-03", description: "Implement poka-yoke: insert change counter on MC-04 HMI that blocks cycle-start after 150 pcs and requires supervisor acknowledgement.", owner: "Maint. Kumar", dueDate: "2026-11-20", status: "in_progress" },
      { id: "ACT-041-04", description: "Train all machining operators on tool change adherence and formal change management procedure.", owner: "HR Dept.", dueDate: "2026-11-30", status: "open" },
    ],
  },
  {
    id: "CAPA-2026-039",
    type: "preventive",
    title: "Preventive action — press fit force monitoring gaps",
    description: "Review of brake disc assembly process identified that press force readings are only sampled, not 100% captured. Risk of undetected under/over-press if sampling interval is missed.",
    source: "Internal audit IA-2026-11",
    priority: "medium",
    status: "verify",
    raisedBy: "Mgr. Nair",
    raisedAt: "2026-10-15",
    dueDate: "2026-11-30",
    area: "Assembly — Line 1",
    machine: "50T Hydraulic Press P-02",
    rootCause: "No automated force capture; relies on operator manual recording. Sampling plan allows up to 10 pcs between records.",
    whyChain: [
      { level: 1, why: "Why could a press fault go undetected?", answer: "Force is recorded manually every 10 pcs, not every cycle." },
      { level: 2, why: "Why is force not recorded every cycle?", answer: "Press P-02 has no integrated data logging output — analogue gauge only." },
      { level: 3, why: "Why was 100% capture not specified in the original press purchase?", answer: "MES data capture requirement was not included in the equipment specification." },
    ],
    actions: [
      { id: "ACT-039-01", description: "Install force transducer with 4–20 mA output on press P-02. Wire to edge gateway for 100% cycle capture.", owner: "Maint. Kumar", dueDate: "2026-11-10", status: "done" },
      { id: "ACT-039-02", description: "Update work instruction to reflect automated capture; remove manual sampling log sheet.", owner: "Eng. Nair", dueDate: "2026-11-15", status: "done" },
      { id: "ACT-039-03", description: "Run 500-piece validation to verify captured force vs. expected distribution. Set SPC control limits.", owner: "QC Singh", dueDate: "2026-11-25", status: "in_progress" },
    ],
    effectiveness: "Force data is now captured every cycle. SPC chart shows process stable within limits after first 300 pcs. Awaiting full 500-pc validation.",
  },
  {
    id: "CAPA-2026-033",
    type: "corrective",
    title: "Engine mount mould cure time exceedance — NVH compound",
    description: "5 batches of EM-220 engine mounts showed hardness above upper spec after cure. Investigation found cure time was exceeding 13-min window.",
    source: "Customer complaint CCR-2026-019",
    priority: "critical",
    status: "closed",
    raisedBy: "QC Singh",
    raisedAt: "2026-09-05",
    dueDate: "2026-10-15",
    area: "Rubber Moulding — Cell 7",
    machine: "Hydraulic Press HP-07",
    rootCause: "Press timer PLC parameter had been modified during maintenance and not restored. Timer was set to 15 min instead of 12 min.",
    whyChain: [
      { level: 1, why: "Why was cure time exceeding spec?", answer: "Press timer set to 15 min instead of 12 min." },
      { level: 2, why: "Why was the timer at 15 min?", answer: "Parameter was modified during a maintenance intervention and not restored after." },
      { level: 3, why: "Why was the parameter not restored?", answer: "No MOC (management of change) procedure for PLC parameter changes during maintenance." },
      { level: 4, why: "Why is there no MOC for PLC parameter changes?", answer: "MOC policy existed for mechanical changes only; PLC parameters were not in scope." },
    ],
    actions: [
      { id: "ACT-033-01", description: "Immediately restore press timer to 12 min. Quarantine last 5 batches for 100% hardness test.", owner: "Maint. Kumar", dueDate: "2026-09-06", status: "done", verifyNote: "Done. 5 batches: 2 scrapped, 3 reworked (re-cure attempted — failed hardness, scrapped)." },
      { id: "ACT-033-02", description: "Issue customer corrective action notice. Arrange field replacement for units already shipped.", owner: "Sales Mgr.", dueDate: "2026-09-10", status: "done" },
      { id: "ACT-033-03", description: "Extend MOC procedure to cover all PLC/HMI parameter changes. Require dual approval.", owner: "Eng. Desai", dueDate: "2026-09-30", status: "done" },
      { id: "ACT-033-04", description: "Implement recipe parameter lock on press HP-07 — recipe changes require QE password.", owner: "IT Dept.", dueDate: "2026-10-10", status: "done" },
    ],
    effectiveness: "Zero exceedances in 500 pcs since MOC and recipe lock implemented. Customer accepted corrective measures. CAPA closed.",
    closedAt: "2026-10-16",
  },
];

const STATUS_CONFIG: Record<CAPAStatus, { label: string; color: string }> = {
  open:         { label: "Open",          color: "text-brand bg-brand/10 border-brand/20" },
  investigation:{ label: "Investigating", color: "text-warning bg-warning/10 border-warning/20" },
  action:       { label: "Actions Open",  color: "text-warning bg-warning/10 border-warning/20" },
  verify:       { label: "Verifying",     color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  closed:       { label: "Closed",        color: "text-success bg-success/10 border-success/20" },
  overdue:      { label: "Overdue",       color: "text-danger bg-danger/10 border-danger/20" },
};

const PRIORITY_CONFIG: Record<Priority, { color: string }> = {
  critical: { color: "text-danger bg-danger/10 border-danger/20" },
  high:     { color: "text-warning bg-warning/10 border-warning/20" },
  medium:   { color: "text-brand bg-brand/10 border-brand/20" },
  low:      { color: "text-text-secondary bg-surface border-border" },
};

const ACTION_STATUS: Record<ActionItem["status"], { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  open:       { label: "Open",        color: "text-text-disabled",   icon: Clock },
  in_progress:{ label: "In Progress", color: "text-brand",           icon: Clock },
  done:       { label: "Done",        color: "text-success",         icon: CheckCircle2 },
};

function WhyChain({ chain }: { chain: WhyEntry[] }) {
  return (
    <div className="space-y-2">
      {chain.map((entry) => (
        <div key={entry.level} className="flex gap-3">
          <div className="shrink-0 w-5 h-5 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center font-mono text-2xs font-bold text-brand">
            {entry.level}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-sans text-xs font-semibold text-text-secondary mb-0.5">{entry.why}</div>
            <div className="font-sans text-xs text-text-primary leading-relaxed">{entry.answer}</div>
            {entry.level < chain.length && <div className="mt-2 ml-0.5 w-px h-3 bg-brand/20" />}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-danger/5 border border-danger/15">
        <Target size={12} className="text-danger shrink-0" />
        <span className="font-sans text-xs text-text-secondary">Root cause identified at level {chain.length}</span>
      </div>
    </div>
  );
}

export default function CAPAPage() {
  const [selectedId, setSelectedId] = useState<string>("CAPA-2026-041");
  const [tab, setTab] = useState<"5why" | "actions" | "effectiveness">("5why");
  const [search, setSearch] = useState("");
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  const filtered = CAPAS.filter(
    (c) =>
      !search ||
      c.id.includes(search) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.area.toLowerCase().includes(search.toLowerCase())
  );
  const capa = CAPAS.find((c) => c.id === selectedId) ?? CAPAS[0];

  const doneActions = capa.actions.filter((a) => a.status === "done").length;
  const pct = Math.round((doneActions / capa.actions.length) * 100);

  const statusCounts = { open: 0, investigation: 0, action: 0, verify: 0, closed: 0, overdue: 0 };
  CAPAS.forEach((c) => { statusCounts[c.status]++; });

  const summaryOption = {
    animation: false,
    tooltip: { trigger: "item" },
    series: [{
      type: "pie",
      radius: ["55%", "80%"],
      data: [
        { value: statusCounts.open + statusCounts.investigation + statusCounts.action, name: "Active", itemStyle: { color: "#F05230" } },
        { value: statusCounts.verify, name: "Verifying", itemStyle: { color: "#A855F7" } },
        { value: statusCounts.closed, name: "Closed", itemStyle: { color: "#1A7A40" } },
      ],
      label: { show: false },
    }],
  };

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-lg font-bold text-text-primary">CAPA — Corrective & Preventive Actions</h1>
            <p className="font-sans text-xs text-text-secondary mt-0.5">
              5-Why root cause analysis · action tracking · effectiveness verification
            </p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white font-sans text-xs font-semibold hover:bg-brand/90 transition-colors shrink-0">
            <Plus size={13} />
            Raise CAPA
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* List */}
        <div className="hidden md:flex w-72 shrink-0 flex-col border-r border-border">
          <div className="p-3 border-b border-border">
            <div className="relative mb-2">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-disabled" />
              <input
                className="w-full pl-7 pr-2 py-1.5 bg-surface border border-border rounded-lg font-sans text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand"
                placeholder="Search CAPAs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 items-center">
              <ReactECharts option={summaryOption} style={{ height: 60, width: 60 }} />
              <div className="text-xs font-sans space-y-0.5">
                <div><span className="text-brand font-mono font-bold">{statusCounts.open + statusCounts.investigation + statusCounts.action}</span> <span className="text-text-secondary">active</span></div>
                <div><span className="text-purple-500 font-mono font-bold">{statusCounts.verify}</span> <span className="text-text-secondary">verifying</span></div>
                <div><span className="text-success font-mono font-bold">{statusCounts.closed}</span> <span className="text-text-secondary">closed</span></div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 mx-1 rounded-lg transition-colors",
                  selectedId === c.id ? "bg-brand/8 border border-brand/20" : "hover:bg-surface"
                )}
                style={{ width: "calc(100% - 8px)" }}
              >
                <div className="flex items-start justify-between gap-1 mb-0.5">
                  <span className="font-mono text-xs font-bold text-text-primary">{c.id}</span>
                  <span className={cn("px-1.5 py-0.5 rounded text-2xs border", PRIORITY_CONFIG[c.priority].color)}>
                    {c.priority}
                  </span>
                </div>
                <div className="font-sans text-xs text-text-secondary truncate mb-1">{c.title}</div>
                <div className="flex items-center gap-2">
                  <span className={cn("px-1.5 py-0.5 rounded text-2xs border", STATUS_CONFIG[c.status].color)}>
                    {STATUS_CONFIG[c.status].label}
                  </span>
                  <span className="font-mono text-2xs text-text-disabled">Due {c.dueDate}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", STATUS_CONFIG[capa.status].color)}>
                  {STATUS_CONFIG[capa.status].label}
                </span>
                <span className={cn("px-2 py-0.5 rounded text-xs border font-medium uppercase", PRIORITY_CONFIG[capa.priority].color)}>
                  {capa.priority}
                </span>
                <span className={cn("px-2 py-0.5 rounded text-xs border font-medium", capa.type === "corrective" ? "text-danger bg-danger/5 border-danger/20" : "text-brand bg-brand/5 border-brand/20")}>
                  {capa.type === "corrective" ? "Corrective" : "Preventive"}
                </span>
                <span className="font-mono text-xs text-text-disabled">{capa.id}</span>
              </div>
              <h2 className="font-heading text-base font-bold text-text-primary">{capa.title}</h2>
              <p className="font-sans text-xs text-text-secondary mt-1 leading-relaxed">{capa.description}</p>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Source", value: capa.source },
                { label: "Area", value: capa.area },
                { label: "Machine", value: capa.machine ?? "N/A" },
                { label: "Raised by", value: `${capa.raisedBy} · ${capa.raisedAt}` },
                { label: "Due date", value: capa.dueDate },
                { label: "Linked NCM", value: capa.linkedNCM ?? "None" },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-xl bg-surface border border-border">
                  <div className="font-sans text-2xs text-text-disabled mb-0.5 uppercase tracking-widest">{label}</div>
                  <div className="font-sans text-xs font-medium text-text-primary">{value}</div>
                </div>
              ))}
            </div>

            {/* Action progress bar */}
            <div className="p-4 rounded-xl bg-surface border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-sans text-xs font-semibold text-text-primary">Action Progress</span>
                <span className="font-mono text-xs text-text-secondary">{doneActions}/{capa.actions.length} complete</span>
              </div>
              <div className="h-2 rounded-full bg-border overflow-hidden mb-2">
                <div
                  className="h-full bg-success rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex gap-3 text-2xs font-mono">
                <span className="text-success">{capa.actions.filter((a) => a.status === "done").length} done</span>
                <span className="text-brand">{capa.actions.filter((a) => a.status === "in_progress").length} in progress</span>
                <span className="text-text-disabled">{capa.actions.filter((a) => a.status === "open").length} open</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border gap-5">
              {(["5why", "actions", "effectiveness"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "pb-2 font-sans text-xs font-medium border-b-2 -mb-px transition-colors",
                    tab === t ? "border-brand text-brand" : "border-transparent text-text-secondary hover:text-text-primary"
                  )}
                >
                  {t === "5why" ? "5-Why Analysis" : t === "actions" ? "Action Items" : "Effectiveness"}
                </button>
              ))}
            </div>

            {tab === "5why" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-surface border border-border">
                  <h3 className="font-sans text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">Root Cause Statement</h3>
                  <p className="font-sans text-sm text-text-primary leading-relaxed">{capa.rootCause}</p>
                </div>
                <div className="p-4 rounded-xl bg-bg border border-border">
                  <h3 className="font-sans text-xs font-semibold text-text-secondary mb-4 uppercase tracking-wider">5-Why Chain</h3>
                  <WhyChain chain={capa.whyChain} />
                </div>
              </div>
            )}

            {tab === "actions" && (
              <div className="space-y-3">
                {capa.actions.map((action) => {
                  const cfg = ACTION_STATUS[action.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <div key={action.id} className="rounded-xl border border-border bg-bg overflow-hidden">
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface transition-colors"
                        onClick={() => setExpandedAction(expandedAction === action.id ? null : action.id)}
                      >
                        <StatusIcon size={14} className={cn("shrink-0", cfg.color)} />
                        <div className="flex-1 min-w-0">
                          <div className="font-sans text-xs font-semibold text-text-primary">{action.description}</div>
                          <div className="font-mono text-2xs text-text-disabled mt-0.5">
                            {action.id} · {action.owner} · Due {action.dueDate}
                          </div>
                        </div>
                        <span className={cn("text-2xs font-mono px-1.5 py-0.5 rounded border shrink-0", action.status === "done" ? "text-success bg-success/10 border-success/20" : action.status === "in_progress" ? "text-brand bg-brand/10 border-brand/20" : "text-text-disabled border-border")}>
                          {cfg.label}
                        </span>
                        {expandedAction === action.id ? <ChevronUp size={12} className="text-text-disabled shrink-0" /> : <ChevronDown size={12} className="text-text-disabled shrink-0" />}
                      </button>
                      {expandedAction === action.id && action.verifyNote && (
                        <div className="px-4 pb-3 border-t border-border">
                          <div className="mt-2 p-2 rounded-lg bg-success/5 border border-success/15 font-sans text-xs text-text-secondary">
                            <strong className="text-success">Verification note:</strong> {action.verifyNote}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {tab === "effectiveness" && (
              <div>
                {capa.effectiveness ? (
                  <div className="p-4 rounded-xl bg-success/5 border border-success/20">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 size={14} className="text-success" />
                      <span className="font-sans text-xs font-semibold text-success uppercase tracking-wider">Effectiveness Verification</span>
                    </div>
                    <p className="font-sans text-sm text-text-primary leading-relaxed">{capa.effectiveness}</p>
                    {capa.closedAt && (
                      <div className="mt-3 font-mono text-xs text-text-disabled">Closed: {capa.closedAt}</div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-border text-center">
                    <Clock size={24} className="text-text-disabled mx-auto mb-2" />
                    <p className="font-sans text-xs text-text-secondary">Effectiveness verification pending — awaiting action completion.</p>
                    <button className="mt-3 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-sans font-semibold hover:bg-brand/90 transition-colors">
                      Record Effectiveness
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
