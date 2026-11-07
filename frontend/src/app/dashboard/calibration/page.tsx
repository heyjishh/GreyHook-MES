"use client";

import { useState } from "react";
import {
  Gauge,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Lock,
  Unlock,
  FileText,
  Plus,
  ChevronRight,
  Wrench,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

type CalStatus = "current" | "due_soon" | "overdue" | "in_calibration" | "locked_out";
type InstrumentType = "cmm" | "gauge" | "torque_wrench" | "micrometer" | "caliper" | "thermometer" | "pressure_gauge" | "force_gauge";

interface CalibrationRecord {
  date: string;
  by: string;
  lab: string;
  certNo: string;
  result: "pass" | "fail" | "adjusted";
  deviation?: string;
  validUntil: string;
}

interface Instrument {
  id: string;
  tagNo: string;
  description: string;
  type: InstrumentType;
  make: string;
  model: string;
  serialNo: string;
  range: string;
  resolution: string;
  location: string;
  department: string;
  status: CalStatus;
  lastCalDate: string;
  nextCalDate: string;
  calIntervalDays: number;
  certNo: string;
  certLab: string;
  traceable: string;
  daysUntilDue: number;
  history: CalibrationRecord[];
}

const INSTRUMENTS: Instrument[] = [
  {
    id: "INS-001",
    tagNo: "CMM-01",
    description: "Zeiss Contura CMM",
    type: "cmm",
    make: "Zeiss",
    model: "Contura G2 7/10/6",
    serialNo: "ZCG2-10492",
    range: "700 × 1000 × 600 mm",
    resolution: "0.0001 mm",
    location: "Quality Lab — Bay 1",
    department: "Quality",
    status: "current",
    lastCalDate: "2026-08-15",
    nextCalDate: "2027-02-15",
    calIntervalDays: 180,
    certNo: "NABL-2026-08-0441",
    certLab: "NABL Accredited Lab — Bangalore",
    traceable: "NPL India",
    daysUntilDue: 101,
    history: [
      { date: "2026-08-15", by: "Suresh K.", lab: "Precision Labs India", certNo: "NABL-2026-08-0441", result: "pass", validUntil: "2027-02-15" },
      { date: "2026-02-10", by: "Suresh K.", lab: "Precision Labs India", certNo: "NABL-2026-02-0119", result: "adjusted", deviation: "Z-axis offset 0.004 mm corrected", validUntil: "2026-08-10" },
      { date: "2025-08-07", by: "Suresh K.", lab: "Precision Labs India", certNo: "NABL-2025-08-0314", result: "pass", validUntil: "2026-02-07" },
    ],
  },
  {
    id: "INS-002",
    tagNo: "MIC-003",
    description: "Mitutoyo Outside Micrometer 25–50 mm",
    type: "micrometer",
    make: "Mitutoyo",
    model: "293-348-30 (Digimatic)",
    serialNo: "MTY-9034410",
    range: "25–50 mm",
    resolution: "0.001 mm",
    location: "Shop Floor — CNC Bay",
    department: "Production",
    status: "due_soon",
    lastCalDate: "2026-05-10",
    nextCalDate: "2026-11-10",
    calIntervalDays: 180,
    certNo: "INT-2026-05-022",
    certLab: "In-house (NABL scope)",
    traceable: "Zeiss CMM CMM-01",
    daysUntilDue: 4,
    history: [
      { date: "2026-05-10", by: "Rajan M.", lab: "In-house", certNo: "INT-2026-05-022", result: "pass", validUntil: "2026-11-10" },
      { date: "2025-11-08", by: "Rajan M.", lab: "In-house", certNo: "INT-2025-11-018", result: "pass", validUntil: "2026-05-08" },
    ],
  },
  {
    id: "INS-003",
    tagNo: "TRQ-02",
    description: "Snap-on Torque Wrench 20–100 Nm",
    type: "torque_wrench",
    make: "Snap-on",
    model: "QJRM100A",
    serialNo: "SN-TQ-20041",
    range: "20–100 Nm",
    resolution: "2 Nm",
    location: "Assembly — Line 1",
    department: "Production",
    status: "overdue",
    lastCalDate: "2026-05-01",
    nextCalDate: "2026-08-01",
    calIntervalDays: 90,
    certNo: "INT-2026-05-005",
    certLab: "In-house (NABL scope)",
    traceable: "NABL ref torque std",
    daysUntilDue: -97,
    history: [
      { date: "2026-05-01", by: "Amit K.", lab: "In-house", certNo: "INT-2026-05-005", result: "pass", validUntil: "2026-08-01" },
      { date: "2026-01-28", by: "Amit K.", lab: "In-house", certNo: "INT-2026-01-002", result: "adjusted", deviation: "Reading 3% high at 60 Nm — adjusted", validUntil: "2026-04-28" },
    ],
  },
  {
    id: "INS-004",
    tagNo: "PLUG-07",
    description: "Plain Plug Gauge ø22H7",
    type: "gauge",
    make: "Mahr",
    model: "819 Plug Gauge",
    serialNo: "MHR-PG-07241",
    range: "22.000–22.021 mm",
    resolution: "Class X",
    location: "Inspection Station 3",
    department: "Quality",
    status: "locked_out",
    lastCalDate: "2026-07-20",
    nextCalDate: "2027-01-20",
    calIntervalDays: 180,
    certNo: "NABL-2026-07-0388",
    certLab: "NABL Accredited Lab — Pune",
    traceable: "NPL India",
    daysUntilDue: 75,
    history: [
      { date: "2026-07-20", by: "Suresh K.", lab: "Precision Labs Pune", certNo: "NABL-2026-07-0388", result: "fail", deviation: "GO member worn beyond tolerance — rejected", validUntil: "2027-01-20" },
    ],
  },
  {
    id: "INS-005",
    tagNo: "CALL-05",
    description: "Mitutoyo Caliper 0–150 mm",
    type: "caliper",
    make: "Mitutoyo",
    model: "500-196-30 (Digimatic)",
    serialNo: "MTY-6710234",
    range: "0–150 mm",
    resolution: "0.01 mm",
    location: "Shop Floor — Milling",
    department: "Production",
    status: "current",
    lastCalDate: "2026-09-01",
    nextCalDate: "2027-03-01",
    calIntervalDays: 180,
    certNo: "INT-2026-09-031",
    certLab: "In-house (NABL scope)",
    traceable: "Zeiss CMM CMM-01",
    daysUntilDue: 115,
    history: [
      { date: "2026-09-01", by: "Rajan M.", lab: "In-house", certNo: "INT-2026-09-031", result: "pass", validUntil: "2027-03-01" },
    ],
  },
  {
    id: "INS-006",
    tagNo: "THM-01",
    description: "Fluke 1551A Thermometer",
    type: "thermometer",
    make: "Fluke",
    model: "1551A Stik",
    serialNo: "FLK-1551-00281",
    range: "-40 to +150 °C",
    resolution: "0.05 °C",
    location: "Quality Lab — Env. Monitor",
    department: "Quality",
    status: "in_calibration",
    lastCalDate: "2026-10-30",
    nextCalDate: "2027-04-30",
    calIntervalDays: 180,
    certNo: "PENDING",
    certLab: "NABL Accredited Lab — Chennai",
    traceable: "NPL India",
    daysUntilDue: 175,
    history: [
      { date: "2026-10-30", by: "External — NABL Lab Chennai", lab: "NABL Lab Chennai", certNo: "PENDING", result: "pass", validUntil: "2027-04-30" },
      { date: "2026-04-28", by: "Suresh K.", lab: "NABL Lab Chennai", certNo: "NABL-2026-04-0211", result: "pass", validUntil: "2026-10-28" },
    ],
  },
];

const STATUS_CONFIG: Record<CalStatus, { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  current:        { label: "Current",        color: "text-success bg-success/10 border-success/20",           icon: CheckCircle2 },
  due_soon:       { label: "Due Soon",        color: "text-warning bg-warning/10 border-warning/20",           icon: Clock },
  overdue:        { label: "Overdue",         color: "text-danger bg-danger/10 border-danger/20",             icon: AlertTriangle },
  in_calibration: { label: "In Calibration", color: "text-brand bg-brand/10 border-brand/20",                icon: Gauge },
  locked_out:     { label: "Locked Out",      color: "text-danger bg-danger/10 border-danger/20",             icon: Lock },
};

const TYPE_LABELS: Record<InstrumentType, string> = {
  cmm:            "CMM",
  gauge:          "Gauge",
  torque_wrench:  "Torque Wrench",
  micrometer:     "Micrometer",
  caliper:        "Caliper",
  thermometer:    "Thermometer",
  pressure_gauge: "Pressure Gauge",
  force_gauge:    "Force Gauge",
};

function DueBadge({ days }: { days: number }) {
  if (days < 0) {
    return <span className="font-mono text-2xs text-danger font-bold">{Math.abs(days)}d overdue</span>;
  }
  if (days <= 7) {
    return <span className="font-mono text-2xs text-warning font-bold">Due in {days}d</span>;
  }
  return <span className="font-mono text-2xs text-text-disabled">{days}d remaining</span>;
}

function CalBar({ days, interval }: { days: number; interval: number }) {
  const pct = Math.max(0, Math.min(100, (days / interval) * 100));
  const color = days < 0 ? "bg-danger" : days <= 14 ? "bg-warning" : "bg-success";
  return (
    <div className="h-1 w-full rounded-full bg-surface-elevated overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CalibrationPage() {
  const [selectedId, setSelectedId] = useState<string>("INS-001");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<CalStatus | "all">("all");

  const filtered = INSTRUMENTS.filter((ins) => {
    const matchesSearch =
      ins.tagNo.toLowerCase().includes(search.toLowerCase()) ||
      ins.description.toLowerCase().includes(search.toLowerCase()) ||
      ins.location.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || ins.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const selected = INSTRUMENTS.find((i) => i.id === selectedId) ?? INSTRUMENTS[0];
  const SCfg = STATUS_CONFIG[selected.status];
  const SIcon = SCfg.icon;

  const overdue = INSTRUMENTS.filter((i) => i.status === "overdue" || i.status === "locked_out").length;
  const dueSoon = INSTRUMENTS.filter((i) => i.status === "due_soon").length;

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <h1 className="font-heading text-lg font-bold text-text-primary">Calibration Management</h1>
        <p className="font-sans text-xs text-text-secondary mt-0.5">
          MSA instrument register — certificates, due dates, lock-out status
        </p>

        {(overdue > 0 || dueSoon > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {overdue > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger/5 border border-danger/20">
                <AlertTriangle size={12} className="text-danger" />
                <span className="font-sans text-xs text-danger">
                  <strong>{overdue}</strong> instrument{overdue > 1 ? "s" : ""} overdue / locked out
                </span>
              </div>
            )}
            {dueSoon > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/5 border border-warning/20">
                <Clock size={12} className="text-warning" />
                <span className="font-sans text-xs text-warning">
                  <strong>{dueSoon}</strong> instrument{dueSoon > 1 ? "s" : ""} due within 7 days
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* List */}
        <div className="hidden md:flex flex-col w-72 shrink-0 border-r border-border">
          <div className="p-3 border-b border-border flex flex-col gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-disabled" />
              <input
                className="w-full pl-7 pr-2 py-1.5 bg-surface border border-border rounded-lg font-sans text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand"
                placeholder="Search instruments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {(["all", "overdue", "due_soon", "locked_out", "current"] as (CalStatus | "all")[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    "px-2 py-0.5 rounded-md font-sans text-2xs font-medium capitalize transition-colors",
                    filterStatus === s ? "bg-brand text-white" : "bg-surface text-text-secondary hover:text-text-primary border border-border"
                  )}
                >
                  {s === "all" ? "All" : s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {filtered.map((ins) => {
              const cfg = STATUS_CONFIG[ins.status];
              const Icon = cfg.icon;
              return (
                <button
                  key={ins.id}
                  onClick={() => setSelectedId(ins.id)}
                  className={cn(
                    "w-full text-left p-3 hover:bg-surface transition-colors",
                    selectedId === ins.id && "bg-brand/5"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Icon size={12} className={cn("mt-0.5 shrink-0", cfg.color.split(" ")[0])} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-bold text-text-primary">{ins.tagNo}</span>
                        <span className={cn("px-1.5 py-0.5 rounded text-2xs border", cfg.color)}>{cfg.label}</span>
                      </div>
                      <p className="font-sans text-xs text-text-secondary truncate mt-0.5">{ins.description}</p>
                      <div className="mt-1.5">
                        <CalBar days={ins.daysUntilDue} interval={ins.calIntervalDays} />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-mono text-2xs text-text-disabled">{ins.location}</span>
                        <DueBadge days={ins.daysUntilDue} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 max-w-2xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs border", SCfg.color)}>
                    <SIcon size={10} />
                    {SCfg.label}
                  </span>
                  <span className="font-mono text-xs text-text-disabled">{TYPE_LABELS[selected.type]}</span>
                </div>
                <h2 className="font-heading text-base font-bold text-text-primary">{selected.description}</h2>
                <p className="font-mono text-xs text-text-disabled">{selected.tagNo} · S/N {selected.serialNo}</p>
              </div>
              <div className="shrink-0 flex gap-2">
                {selected.status === "overdue" && (
                  <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand text-white font-sans text-xs font-medium">
                    <Calendar size={11} />
                    Schedule Cal
                  </button>
                )}
                {selected.status === "locked_out" && (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/20 text-danger font-sans text-xs font-medium">
                    <Lock size={11} />
                    Locked Out
                  </div>
                )}
              </div>
            </div>

            {/* Lock-out alert */}
            {selected.status === "locked_out" && (
              <div className="mb-4 p-3 rounded-lg bg-danger/5 border border-danger/20">
                <div className="flex items-center gap-2 mb-1">
                  <Lock size={12} className="text-danger" />
                  <span className="font-sans text-xs font-bold text-danger">Instrument Locked Out</span>
                </div>
                <p className="font-sans text-xs text-text-secondary">
                  This instrument failed calibration and must not be used for measurements. Remove from service and arrange for repair or replacement.
                </p>
              </div>
            )}

            {/* Calibration due bar */}
            <div className="mb-4 p-3 rounded-lg bg-surface border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-sans text-xs text-text-secondary">Calibration interval: {selected.calIntervalDays}d</span>
                <DueBadge days={selected.daysUntilDue} />
              </div>
              <CalBar days={selected.daysUntilDue} interval={selected.calIntervalDays} />
              <div className="flex items-center justify-between mt-1.5">
                <span className="font-mono text-2xs text-text-disabled">Last: {selected.lastCalDate}</span>
                <span className="font-mono text-2xs text-text-disabled">Due: {selected.nextCalDate}</span>
              </div>
            </div>

            {/* Instrument details */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: "Make / Model",   value: `${selected.make} ${selected.model}` },
                { label: "Serial No",      value: selected.serialNo },
                { label: "Range",          value: selected.range },
                { label: "Resolution",     value: selected.resolution },
                { label: "Location",       value: selected.location },
                { label: "Department",     value: selected.department },
                { label: "Cert Lab",       value: selected.certLab },
                { label: "Traceable to",   value: selected.traceable },
              ].map(({ label, value }) => (
                <div key={label} className="p-2 rounded-lg bg-surface border border-border">
                  <div className="font-mono text-2xs text-text-disabled">{label}</div>
                  <div className="font-sans text-xs font-medium text-text-primary">{value}</div>
                </div>
              ))}
            </div>

            {/* Certificate */}
            <div className="mb-4 p-3 rounded-lg bg-surface border border-border flex items-center gap-3">
              <FileText size={14} className="text-brand shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-sans text-xs font-medium text-text-primary truncate">Cert: {selected.certNo}</div>
                <div className="font-mono text-2xs text-text-disabled">{selected.certLab}</div>
              </div>
              <button className="px-2 py-1 rounded bg-surface-elevated border border-border font-sans text-2xs text-text-secondary hover:text-text-primary">
                View PDF
              </button>
            </div>

            {/* History */}
            <div>
              <div className="font-sans text-2xs text-text-disabled uppercase tracking-widest mb-3">Calibration History</div>
              <div className="space-y-2">
                {selected.history.map((h, i) => (
                  <div key={i} className="p-3 rounded-lg bg-surface border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-text-primary">{h.date}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-2xs border font-medium",
                        h.result === "pass" ? "text-success bg-success/10 border-success/20" :
                        h.result === "fail" ? "text-danger bg-danger/10 border-danger/20" :
                        "text-warning bg-warning/10 border-warning/20"
                      )}>
                        {h.result === "adjusted" ? "Adjusted & Pass" : h.result.charAt(0).toUpperCase() + h.result.slice(1)}
                      </span>
                    </div>
                    <div className="font-sans text-xs text-text-secondary">{h.lab}</div>
                    <div className="font-mono text-2xs text-text-disabled">{h.certNo} · Valid until {h.validUntil}</div>
                    {h.deviation && (
                      <div className="mt-1.5 px-2 py-1 rounded bg-warning/5 border border-warning/20 font-sans text-2xs text-warning">
                        {h.deviation}
                      </div>
                    )}
                    <div className="mt-1 font-mono text-2xs text-text-disabled">By: {h.by}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
