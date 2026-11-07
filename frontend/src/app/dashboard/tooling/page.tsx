"use client";

import { useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  Wrench,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingDown,
  Calendar,
  Tag,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

type ToolStatus = "ok" | "warning" | "overdue" | "in_service" | "retired";
type ToolType = "cutting_insert" | "boring_bar" | "mould" | "fixture" | "gauge" | "die";

interface ServiceRecord {
  date: string;
  type: "pm" | "repair" | "calibration" | "replacement";
  technician: string;
  note: string;
  shotCountAtService?: number;
}

interface Tool {
  id: string;
  name: string;
  type: ToolType;
  status: ToolStatus;
  machine: string;
  location: string;
  currentShots: number;
  maxShots: number;
  warnAt: number;
  lastService: string;
  nextServiceDue: string;
  calDue?: string;
  manufacturer: string;
  serialNo: string;
  cost: number;
  lifeRemaining: number;
  serviceHistory: ServiceRecord[];
}

const TOOLS: Tool[] = [
  {
    id: "TL-MC04-BOR-001",
    name: "Boring Bar — ø40 Precision",
    type: "boring_bar",
    status: "warning",
    machine: "MC-04 Boring Centre",
    location: "Line 3 — Tool Cabinet 4A",
    currentShots: 138,
    maxShots: 150,
    warnAt: 130,
    lastService: "2026-10-15",
    nextServiceDue: "2026-11-06",
    manufacturer: "Sandvik Coromant",
    serialNo: "SC-BB40-20264A",
    cost: 4800,
    lifeRemaining: 8,
    serviceHistory: [
      { date: "2026-10-15", type: "replacement", technician: "Maint. Kumar", note: "Insert replaced at 148 shots — worn beyond spec.", shotCountAtService: 148 },
      { date: "2026-09-02", type: "pm", technician: "Maint. Kumar", note: "Preventive check — insert OK, bar geometry verified.", shotCountAtService: 92 },
      { date: "2026-07-18", type: "replacement", technician: "Maint. Kumar", note: "Insert replaced at 155 shots.", shotCountAtService: 155 },
    ],
  },
  {
    id: "TL-HP07-MLD-001",
    name: "Engine Mount Mould — NVH Grade",
    type: "mould",
    status: "ok",
    machine: "HP-07 Hydraulic Press",
    location: "Cell 7 — Mould Store",
    currentShots: 820,
    maxShots: 5000,
    warnAt: 4500,
    lastService: "2026-08-01",
    nextServiceDue: "2027-02-01",
    manufacturer: "Precision Moulds Ltd.",
    serialNo: "PML-EM220-NVH-003",
    cost: 285000,
    lifeRemaining: 4180,
    serviceHistory: [
      { date: "2026-08-01", type: "pm", technician: "Maint. Reddy", note: "Mould PM at 650 shots — parting line cleaned, vents cleared, guide pins greased.", shotCountAtService: 650 },
      { date: "2026-04-10", type: "repair", technician: "Maint. Reddy", note: "Minor cavity crack repaired — micro-TIG weld. QA sign-off obtained.", shotCountAtService: 320 },
      { date: "2025-12-01", type: "pm", technician: "Maint. Reddy", note: "Initial PM after first 100 shots.", shotCountAtService: 100 },
    ],
  },
  {
    id: "TL-PR01-DIE-001",
    name: "Press Die — Brake Hub Fit",
    type: "die",
    status: "overdue",
    machine: "PR-01 50T Press",
    location: "Line 1 — Die Store",
    currentShots: 4820,
    maxShots: 5000,
    warnAt: 4500,
    lastService: "2026-09-20",
    nextServiceDue: "2026-10-30",
    manufacturer: "Bharat Die Works",
    serialNo: "BDW-BHD-PR01-02",
    cost: 62000,
    lifeRemaining: 180,
    serviceHistory: [
      { date: "2026-09-20", type: "pm", technician: "Maint. Kumar", note: "PM at 4500 shots — upper punch polished, lower die inspected.", shotCountAtService: 4500 },
      { date: "2026-06-05", type: "pm", technician: "Maint. Kumar", note: "PM at 3000 shots.", shotCountAtService: 3000 },
      { date: "2026-02-14", type: "repair", technician: "Maint. Reddy", note: "Lower die chipping repaired.", shotCountAtService: 1200 },
    ],
  },
  {
    id: "TL-CM01-GAU-001",
    name: "Air Gauge — ø40 Bore",
    type: "gauge",
    status: "ok",
    machine: "CM-01 CMM",
    location: "QC Lab — Gauge Cabinet",
    currentShots: 0,
    maxShots: 0,
    warnAt: 0,
    lastService: "2026-10-01",
    nextServiceDue: "2027-04-01",
    calDue: "2027-04-01",
    manufacturer: "Mahr GmbH",
    serialNo: "MAHR-AG40-10592",
    cost: 38000,
    lifeRemaining: 999,
    serviceHistory: [
      { date: "2026-10-01", type: "calibration", technician: "External — Mahr India", note: "Annual calibration. Certificate CAL-2026-247 issued. Accuracy verified ±0.5 µm.", shotCountAtService: 0 },
      { date: "2025-10-05", type: "calibration", technician: "External — Mahr India", note: "Annual calibration. Certificate CAL-2025-312.", shotCountAtService: 0 },
    ],
  },
  {
    id: "TL-MC01-INS-001",
    name: "CNMG Insert Set — CNC Lathe #1",
    type: "cutting_insert",
    status: "ok",
    machine: "MC-01 CNC Lathe #1",
    location: "Line 3 — Tool Cabinet 1A",
    currentShots: 42,
    maxShots: 150,
    warnAt: 130,
    lastService: "2026-11-01",
    nextServiceDue: "2026-11-11",
    manufacturer: "Kennametal",
    serialNo: "KMT-CNMG432-SET-11A",
    cost: 1200,
    lifeRemaining: 108,
    serviceHistory: [
      { date: "2026-11-01", type: "replacement", technician: "Rajan M.", note: "Insert set replaced at shift start.", shotCountAtService: 150 },
    ],
  },
  {
    id: "TL-MC02-FIX-001",
    name: "Shaft Turning Fixture",
    type: "fixture",
    status: "in_service",
    machine: "MC-02 CNC Lathe #2",
    location: "Line 3 — Machine MC-02",
    currentShots: 2100,
    maxShots: 10000,
    warnAt: 9000,
    lastService: "2026-07-01",
    nextServiceDue: "2027-01-01",
    manufacturer: "In-house",
    serialNo: "IH-FIX-SHT-MC02-01",
    cost: 15000,
    lifeRemaining: 7900,
    serviceHistory: [
      { date: "2026-07-01", type: "pm", technician: "Maint. Kumar", note: "Clamp pads replaced, jaw geometry verified.", shotCountAtService: 1800 },
    ],
  },
];

const STATUS_CONFIG: Record<ToolStatus, { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  ok:         { label: "OK",         color: "text-success bg-success/10 border-success/20", icon: CheckCircle2 },
  warning:    { label: "Near Limit", color: "text-warning bg-warning/10 border-warning/20", icon: AlertTriangle },
  overdue:    { label: "Overdue PM", color: "text-danger bg-danger/10 border-danger/20",    icon: XCircle },
  in_service: { label: "In Service", color: "text-brand bg-brand/10 border-brand/20",       icon: Wrench },
  retired:    { label: "Retired",    color: "text-text-disabled bg-surface border-border",  icon: XCircle },
};

const TYPE_LABEL: Record<ToolType, string> = {
  cutting_insert: "Cutting Insert",
  boring_bar:     "Boring Bar",
  mould:          "Mould",
  fixture:        "Fixture",
  gauge:          "Gauge",
  die:            "Die",
};

const SVC_TYPE_COLOR: Record<ServiceRecord["type"], string> = {
  pm:          "text-brand",
  repair:      "text-warning",
  calibration: "text-success",
  replacement: "text-text-secondary",
};

function LifeBar({ tool }: { tool: Tool }) {
  if (tool.maxShots === 0) return null;
  const pct = Math.min(Math.round((tool.currentShots / tool.maxShots) * 100), 100);
  const warnPct = Math.round((tool.warnAt / tool.maxShots) * 100);
  const color = pct >= 100 ? "bg-danger" : pct >= warnPct ? "bg-warning" : "bg-success";
  return (
    <div>
      <div className="flex justify-between font-mono text-2xs text-text-disabled mb-1">
        <span>{tool.currentShots.toLocaleString()} shots used</span>
        <span>of {tool.maxShots.toLocaleString()}</span>
      </div>
      <div className="relative h-2 rounded-full bg-border overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
        <div className="absolute top-0 bottom-0 w-px bg-bg/60" style={{ left: `${warnPct}%` }} />
      </div>
      <div className="flex justify-between font-mono text-2xs text-text-disabled mt-0.5">
        <span>0</span>
        <span className="text-warning">{tool.warnAt.toLocaleString()} warn</span>
        <span>{tool.maxShots.toLocaleString()} max</span>
      </div>
    </div>
  );
}

export default function ToolingPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string>("TL-MC04-BOR-001");
  const [tab, setTab] = useState<"details" | "history">("details");

  const filtered = TOOLS.filter((t) => {
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.machine.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const tool = TOOLS.find((t) => t.id === selectedId) ?? TOOLS[0];
  const StatusCfg = STATUS_CONFIG[tool.status];
  const StatusIcon = StatusCfg.icon;

  const alertCount = TOOLS.filter((t) => t.status === "warning" || t.status === "overdue").length;

  const lifePct = tool.maxShots > 0 ? Math.min(Math.round((tool.currentShots / tool.maxShots) * 100), 100) : null;

  const historyOption = {
    animation: false,
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: tool.serviceHistory.map((s) => s.date.slice(5)),
      axisLabel: { fontSize: 9 },
    },
    yAxis: { type: "value", name: "shots", axisLabel: { fontSize: 9 } },
    series: [{
      type: "bar",
      data: tool.serviceHistory.map((s) => s.shotCountAtService ?? 0),
      itemStyle: { color: "#F05230", borderRadius: [3, 3, 0, 0] },
      barMaxWidth: 36,
    }],
    grid: { left: 46, right: 20, top: 20, bottom: 24 },
  };

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-lg font-bold text-text-primary">Tool & Mold Management</h1>
            <p className="font-sans text-xs text-text-secondary mt-0.5">
              Tool lifecycle · shot counts · PM scheduling · calibration due dates · service history
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {alertCount > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-warning/10 border border-warning/20 font-sans text-xs text-warning">
                <AlertTriangle size={12} />
                {alertCount} tool{alertCount > 1 ? "s" : ""} need attention
              </span>
            )}
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white font-sans text-xs font-semibold hover:bg-brand/90 transition-colors">
              <Plus size={13} />
              Register Tool
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* List */}
        <div className="hidden md:flex w-64 shrink-0 flex-col border-r border-border">
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-disabled" />
              <input
                className="w-full pl-7 pr-2 py-1.5 bg-surface border border-border rounded-lg font-sans text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand"
                placeholder="Search tools..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg font-sans text-xs text-text-primary focus:outline-none focus:border-brand"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="ok">OK</option>
              <option value="warning">Near Limit</option>
              <option value="overdue">Overdue PM</option>
              <option value="in_service">In Service</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {filtered.map((t) => {
              const cfg = STATUS_CONFIG[t.status];
              const Icon = cfg.icon;
              const pct = t.maxShots > 0 ? Math.min(Math.round((t.currentShots / t.maxShots) * 100), 100) : null;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 mx-1 rounded-lg transition-colors",
                    selectedId === t.id ? "bg-brand/8 border border-brand/20" : "hover:bg-surface"
                  )}
                  style={{ width: "calc(100% - 8px)" }}
                >
                  <div className="flex items-start justify-between gap-1 mb-0.5">
                    <div className="min-w-0">
                      <div className="font-sans text-xs font-semibold text-text-primary truncate">{t.name}</div>
                      <div className="font-mono text-2xs text-text-disabled truncate">{t.machine}</div>
                    </div>
                    <span className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs border shrink-0", cfg.color)}>
                      <Icon size={9} />
                    </span>
                  </div>
                  {pct !== null && (
                    <div className="mt-1.5">
                      <div className="h-1 rounded-full bg-border overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", pct >= 90 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-success")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="font-mono text-2xs text-text-disabled mt-0.5">{pct}% life used</div>
                    </div>
                  )}
                  {t.calDue && (
                    <div className="font-mono text-2xs text-text-disabled mt-0.5">Cal due: {t.calDue}</div>
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
                  <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border", StatusCfg.color)}>
                    <StatusIcon size={10} />
                    {StatusCfg.label}
                  </span>
                  <span className="font-mono text-xs text-text-disabled">{tool.id}</span>
                  <span className="px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-2xs text-text-secondary">
                    {TYPE_LABEL[tool.type]}
                  </span>
                </div>
                <h2 className="font-heading text-base font-bold text-text-primary">{tool.name}</h2>
                <p className="font-sans text-xs text-text-secondary mt-0.5">{tool.machine} · {tool.location}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-sans text-text-secondary hover:border-brand hover:text-brand transition-colors">
                  <RefreshCw size={12} /> Log Service
                </button>
                {(tool.status === "warning" || tool.status === "overdue") && (
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-warning text-white text-xs font-sans font-semibold hover:bg-warning/90 transition-colors">
                    <Calendar size={12} /> Schedule PM
                  </button>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Manufacturer",    value: tool.manufacturer },
                { label: "Serial No.",      value: tool.serialNo },
                { label: "Asset Cost",      value: `₹${tool.cost.toLocaleString()}` },
                { label: "Last Service",    value: tool.lastService },
                { label: "Next PM Due",     value: tool.nextServiceDue },
                { label: "Calibration Due", value: tool.calDue ?? "N/A (non-cal)" },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-xl bg-surface border border-border">
                  <div className="font-sans text-2xs text-text-disabled mb-0.5 uppercase tracking-widest">{label}</div>
                  <div className="font-sans text-xs font-medium text-text-primary">{value}</div>
                </div>
              ))}
            </div>

            {/* Life bar */}
            {tool.maxShots > 0 && (
              <div className="p-4 rounded-xl bg-surface border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-sans text-xs font-semibold text-text-primary">Tool Life</span>
                  <span className={cn("font-mono text-sm font-bold", tool.lifeRemaining < 50 ? "text-danger" : tool.lifeRemaining < 200 ? "text-warning" : "text-success")}>
                    {tool.lifeRemaining.toLocaleString()} shots remaining
                  </span>
                </div>
                <LifeBar tool={tool} />
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-border gap-5">
              {(["details", "history"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "pb-2 font-sans text-xs font-medium border-b-2 -mb-px transition-colors capitalize",
                    tab === t ? "border-brand text-brand" : "border-transparent text-text-secondary hover:text-text-primary"
                  )}
                >
                  {t === "history" ? "Service History" : "Details"}
                </button>
              ))}
            </div>

            {tab === "details" && (
              <div className="space-y-4">
                {tool.maxShots > 0 && tool.serviceHistory.length > 0 && (
                  <div className="rounded-xl border border-border bg-bg p-4">
                    <div className="mb-3 font-sans text-xs font-semibold text-text-primary">Shot Count at Each Service</div>
                    <ReactECharts option={historyOption} style={{ height: 120 }} />
                  </div>
                )}
                <div className="rounded-xl border border-border bg-surface p-4">
                  <div className="font-sans text-xs font-semibold text-text-primary mb-3">PM Schedule</div>
                  <div className="space-y-2 font-sans text-xs text-text-secondary">
                    {tool.maxShots > 0 ? (
                      <>
                        <div className="flex justify-between"><span>Warning threshold</span><span className="font-mono text-warning">{tool.warnAt.toLocaleString()} shots</span></div>
                        <div className="flex justify-between"><span>Maximum life</span><span className="font-mono text-text-primary">{tool.maxShots.toLocaleString()} shots</span></div>
                        <div className="flex justify-between"><span>Next PM due</span><span className="font-mono text-text-primary">{tool.nextServiceDue}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between"><span>Calibration interval</span><span className="font-mono text-text-primary">Annual</span></div>
                        <div className="flex justify-between"><span>Calibration due</span><span className="font-mono text-text-primary">{tool.calDue}</span></div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {tab === "history" && (
              <div className="relative pl-4">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
                {tool.serviceHistory.map((svc, i) => (
                  <div key={i} className="relative mb-4 last:mb-0">
                    <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-bg border-2 border-brand" />
                    <div className="pl-3">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className={cn("font-mono text-xs font-bold uppercase", SVC_TYPE_COLOR[svc.type])}>
                          {svc.type}
                        </span>
                        <span className="font-mono text-2xs text-text-disabled">{svc.date}</span>
                        <span className="font-mono text-2xs text-text-tertiary">{svc.technician}</span>
                        {svc.shotCountAtService !== undefined && svc.shotCountAtService > 0 && (
                          <span className="font-mono text-2xs text-text-disabled">@ {svc.shotCountAtService.toLocaleString()} shots</span>
                        )}
                        {i === 0 && (
                          <span className="ml-auto font-mono text-2xs px-1.5 py-0.5 rounded bg-brand/10 text-brand border border-brand/20">LATEST</span>
                        )}
                      </div>
                      <p className="font-sans text-xs text-text-secondary">{svc.note}</p>
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
