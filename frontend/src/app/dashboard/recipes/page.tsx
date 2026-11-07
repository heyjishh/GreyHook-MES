"use client";

import { useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  FlaskConical,
  Plus,
  Search,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  Unlock,
  Copy,
  GitBranch,
  Tag,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

type RecipeStatus = "active" | "draft" | "obsolete" | "review";
type ParameterType = "numeric" | "text" | "boolean" | "select";

interface RecipeParameter {
  name: string;
  type: ParameterType;
  unit?: string;
  nominal?: number;
  min?: number;
  max?: number;
  value?: string;
  options?: string[];
  critical: boolean;
}

interface RecipeStep {
  seq: number;
  name: string;
  instruction: string;
  durationMin: number;
  parameters: RecipeParameter[];
  requiresSignoff: boolean;
}

interface Recipe {
  id: string;
  name: string;
  code: string;
  product: string;
  productFamily: string;
  version: string;
  status: RecipeStatus;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  approvedAt?: string;
  effectiveFrom?: string;
  batchSize: number;
  batchUnit: string;
  cycleTimeMins: number;
  steps: RecipeStep[];
  changeLog: { version: string; date: string; author: string; note: string }[];
}

const RECIPES: Recipe[] = [
  {
    id: "RCP-001",
    name: "Precision Shaft Turning — Grade A",
    code: "PST-GA-001",
    product: "Shaft Assembly SH-4400",
    productFamily: "Drive Shafts",
    version: "3.2",
    status: "active",
    createdBy: "Eng. Patel",
    approvedBy: "Mgr. Sharma",
    createdAt: "2026-08-12",
    approvedAt: "2026-08-20",
    effectiveFrom: "2026-09-01",
    batchSize: 50,
    batchUnit: "pcs",
    cycleTimeMins: 14,
    steps: [
      {
        seq: 1,
        name: "Material Verification",
        instruction: "Verify raw bar stock grade, heat number, and dimensions against traveller card.",
        durationMin: 3,
        requiresSignoff: true,
        parameters: [
          { name: "Bar Diameter", type: "numeric", unit: "mm", nominal: 42, min: 41.8, max: 42.2, critical: true },
          { name: "Heat Number Match", type: "boolean", critical: true },
          { name: "Material Grade", type: "select", options: ["4140", "4340", "EN36"], critical: true },
        ],
      },
      {
        seq: 2,
        name: "Rough Turning",
        instruction: "Set spindle speed and feed rate per cutting data sheet. Face and centre-drill both ends.",
        durationMin: 5,
        requiresSignoff: false,
        parameters: [
          { name: "Spindle Speed", type: "numeric", unit: "RPM", nominal: 850, min: 800, max: 900, critical: false },
          { name: "Feed Rate", type: "numeric", unit: "mm/rev", nominal: 0.25, min: 0.20, max: 0.30, critical: false },
          { name: "Depth of Cut", type: "numeric", unit: "mm", nominal: 2.5, min: 2.0, max: 3.0, critical: false },
        ],
      },
      {
        seq: 3,
        name: "Finish Turning",
        instruction: "Finish to drawing dimension. Verify dia with CMM after first-off.",
        durationMin: 4,
        requiresSignoff: true,
        parameters: [
          { name: "Finished Dia", type: "numeric", unit: "mm", nominal: 40.0, min: 39.985, max: 40.015, critical: true },
          { name: "Surface Finish Ra", type: "numeric", unit: "µm", nominal: 0.8, min: 0, max: 1.6, critical: true },
        ],
      },
      {
        seq: 4,
        name: "Inspection & Release",
        instruction: "100% visual inspection. Record CMM results. Apply pass/fail tag and place in finished tray.",
        durationMin: 2,
        requiresSignoff: true,
        parameters: [
          { name: "CMM Result", type: "select", options: ["Pass", "Fail — Rework", "Fail — Scrap"], critical: true },
          { name: "Visual OK", type: "boolean", critical: false },
        ],
      },
    ],
    changeLog: [
      { version: "3.2", date: "2026-08-12", author: "Eng. Patel", note: "Tightened Finished Dia tolerance per customer ECN-2026-44." },
      { version: "3.1", date: "2026-04-01", author: "Eng. Kumar", note: "Increased spindle speed range after tooling upgrade." },
      { version: "3.0", date: "2025-11-20", author: "Eng. Patel", note: "Major revision: added CMM first-off requirement." },
    ],
  },
  {
    id: "RCP-002",
    name: "Brake Disc Assembly — Standard",
    code: "BDA-STD-002",
    product: "Brake Disc BD-700",
    productFamily: "Brake Systems",
    version: "1.5",
    status: "active",
    createdBy: "Eng. Nair",
    approvedBy: "Mgr. Sharma",
    createdAt: "2026-05-18",
    approvedAt: "2026-05-28",
    effectiveFrom: "2026-06-01",
    batchSize: 100,
    batchUnit: "pcs",
    cycleTimeMins: 8,
    steps: [
      {
        seq: 1,
        name: "Component Kitting",
        instruction: "Pull disc, hub, and fastener kit per BOM. Scan all lot codes.",
        durationMin: 2,
        requiresSignoff: false,
        parameters: [
          { name: "Disc Lot Scanned", type: "boolean", critical: true },
          { name: "Hub Lot Scanned", type: "boolean", critical: true },
          { name: "Fastener Kit PN", type: "text", critical: false },
        ],
      },
      {
        seq: 2,
        name: "Press Fit Hub",
        instruction: "Press hub into disc bore using 50-ton press. Record peak force.",
        durationMin: 3,
        requiresSignoff: false,
        parameters: [
          { name: "Peak Press Force", type: "numeric", unit: "kN", nominal: 35, min: 28, max: 45, critical: true },
          { name: "Bore Clearance", type: "numeric", unit: "µm", nominal: 15, min: 5, max: 25, critical: true },
        ],
      },
      {
        seq: 3,
        name: "Torque Fasteners",
        instruction: "Apply thread-lock and torque to spec using calibrated torque wrench.",
        durationMin: 2,
        requiresSignoff: true,
        parameters: [
          { name: "Torque Value", type: "numeric", unit: "Nm", nominal: 42, min: 40, max: 44, critical: true },
          { name: "Thread-lock Applied", type: "boolean", critical: false },
        ],
      },
      {
        seq: 4,
        name: "Final Check",
        instruction: "Run-out check on brake face. Pack and label.",
        durationMin: 1,
        requiresSignoff: false,
        parameters: [
          { name: "Lateral Run-out", type: "numeric", unit: "mm TIR", nominal: 0.05, min: 0, max: 0.10, critical: true },
        ],
      },
    ],
    changeLog: [
      { version: "1.5", date: "2026-05-18", author: "Eng. Nair", note: "Updated torque spec to 42 Nm per supplier bulletin." },
      { version: "1.4", date: "2026-01-10", author: "Eng. Kumar", note: "Added lateral run-out check step." },
    ],
  },
  {
    id: "RCP-003",
    name: "Engine Mount — NVH Grade",
    code: "EMT-NVH-003",
    product: "Engine Mount EM-220",
    productFamily: "Engine Mounts",
    version: "2.0-draft",
    status: "draft",
    createdBy: "Eng. Desai",
    createdAt: "2026-10-30",
    batchSize: 25,
    batchUnit: "pcs",
    cycleTimeMins: 22,
    steps: [
      {
        seq: 1,
        name: "Rubber Compound Prep",
        instruction: "Weigh and mix NVH compound per formula sheet F-EM220-NVH.",
        durationMin: 8,
        requiresSignoff: true,
        parameters: [
          { name: "Compound Weight", type: "numeric", unit: "g", nominal: 480, min: 475, max: 485, critical: true },
          { name: "Mix Temperature", type: "numeric", unit: "°C", nominal: 65, min: 60, max: 70, critical: true },
        ],
      },
      {
        seq: 2,
        name: "Moulding",
        instruction: "Transfer to mould. Cure under hydraulic press at 180°C for 12 min.",
        durationMin: 14,
        requiresSignoff: false,
        parameters: [
          { name: "Press Temp", type: "numeric", unit: "°C", nominal: 180, min: 175, max: 185, critical: true },
          { name: "Cure Time", type: "numeric", unit: "min", nominal: 12, min: 11, max: 13, critical: true },
          { name: "Press Pressure", type: "numeric", unit: "bar", nominal: 150, min: 140, max: 160, critical: false },
        ],
      },
    ],
    changeLog: [
      { version: "2.0-draft", date: "2026-10-30", author: "Eng. Desai", note: "New NVH-grade rubber compound spec under validation." },
    ],
  },
];

const STATUS_CONFIG: Record<RecipeStatus, { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  active:   { label: "Active",   color: "text-success bg-success/10 border-success/20",   icon: CheckCircle2 },
  draft:    { label: "Draft",    color: "text-warning bg-warning/10 border-warning/20",   icon: Edit3 },
  review:   { label: "In Review",color: "text-brand bg-brand/10 border-brand/20",         icon: Eye },
  obsolete: { label: "Obsolete", color: "text-text-disabled bg-surface border-border",    icon: Lock },
};

function ParameterBadge({ p }: { p: RecipeParameter }) {
  const hasSpec = p.type === "numeric" && p.nominal !== undefined;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-sans">
      <span className="font-medium text-text-primary">{p.name}</span>
      {hasSpec && (
        <span className="font-mono text-text-secondary">
          {p.nominal} {p.unit}
          <span className="text-text-disabled ml-1">[{p.min}–{p.max}]</span>
        </span>
      )}
      {p.type === "boolean" && <span className="text-text-secondary font-mono">Yes/No</span>}
      {p.type === "select" && <span className="text-text-secondary font-mono">{p.options?.join(" / ")}</span>}
      {p.critical && (
        <span className="ml-auto px-1.5 py-0.5 rounded text-2xs font-mono font-bold bg-danger/10 text-danger border border-danger/20">
          CPP
        </span>
      )}
    </div>
  );
}

function VersionTimeline({ log }: { log: Recipe["changeLog"] }) {
  return (
    <div className="relative pl-4">
      <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
      {log.map((entry, i) => (
        <div key={entry.version} className="relative mb-4 last:mb-0">
          <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-bg border-2 border-brand" />
          <div className="pl-3">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-xs font-bold text-brand">v{entry.version}</span>
              <span className="font-mono text-2xs text-text-disabled">{entry.date}</span>
              <span className="font-mono text-2xs text-text-tertiary">{entry.author}</span>
              {i === 0 && (
                <span className="ml-auto font-mono text-2xs px-1.5 py-0.5 rounded bg-brand/10 text-brand border border-brand/20">
                  CURRENT
                </span>
              )}
            </div>
            <p className="font-sans text-xs text-text-secondary">{entry.note}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RecipesPage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("RCP-001");
  const [tab, setTab] = useState<"steps" | "changelog" | "compare">("steps");
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = RECIPES.filter((r) => {
    const matchSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      r.product.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const recipe = RECIPES.find((r) => r.id === selectedId) ?? RECIPES[0];
  const StatusIcon = STATUS_CONFIG[recipe.status].icon;

  const totalParams = recipe.steps.flatMap((s) => s.parameters).length;
  const criticalParams = recipe.steps.flatMap((s) => s.parameters).filter((p) => p.critical).length;
  const signoffSteps = recipe.steps.filter((s) => s.requiresSignoff).length;
  const totalMins = recipe.steps.reduce((a, s) => a + s.durationMin, 0);

  const cycleOption = {
    animation: false,
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: recipe.steps.map((s) => `Step ${s.seq}`),
      axisLabel: { fontSize: 10 },
    },
    yAxis: { type: "value", name: "mins", axisLabel: { fontSize: 10 } },
    series: [
      {
        type: "bar",
        data: recipe.steps.map((s) => s.durationMin),
        itemStyle: { color: "#F05230", borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 40,
      },
    ],
    grid: { left: 40, right: 20, top: 20, bottom: 24 },
  };

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-lg font-bold text-text-primary">Recipe & Formula Management</h1>
            <p className="font-sans text-xs text-text-secondary mt-0.5">
              Versioned production recipes — step parameters, CPPs, approval workflow
            </p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white font-sans text-xs font-semibold hover:bg-brand/90 transition-colors shrink-0">
            <Plus size={13} />
            New Recipe
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left — recipe list */}
        <div className="hidden md:flex w-64 shrink-0 flex-col border-r border-border">
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-disabled" />
              <input
                className="w-full pl-7 pr-2 py-1.5 bg-surface border border-border rounded-lg font-sans text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand"
                placeholder="Search recipes..."
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
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="review">In Review</option>
              <option value="obsolete">Obsolete</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {filtered.map((r) => {
              const Cfg = STATUS_CONFIG[r.status];
              const Icon = Cfg.icon;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 mx-1 rounded-lg transition-colors",
                    selectedId === r.id ? "bg-brand/8 border border-brand/20" : "hover:bg-surface"
                  )}
                  style={{ width: "calc(100% - 8px)" }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <div className="font-sans text-xs font-semibold text-text-primary truncate">{r.name}</div>
                      <div className="font-mono text-2xs text-text-disabled mt-0.5">{r.code} · v{r.version}</div>
                      <div className="font-sans text-2xs text-text-tertiary truncate mt-0.5">{r.product}</div>
                    </div>
                    <span className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs border shrink-0", Cfg.color)}>
                      <Icon size={9} />
                    </span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center font-sans text-xs text-text-disabled">No recipes match.</div>
            )}
          </div>
        </div>

        {/* Right — detail panel */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border", STATUS_CONFIG[recipe.status].color)}>
                    <StatusIcon size={11} />
                    {STATUS_CONFIG[recipe.status].label}
                  </span>
                  <span className="font-mono text-xs text-text-disabled">{recipe.code}</span>
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface border border-border text-text-secondary">
                    v{recipe.version}
                  </span>
                </div>
                <h2 className="font-heading text-base font-bold text-text-primary">{recipe.name}</h2>
                <p className="font-sans text-xs text-text-secondary mt-0.5">{recipe.product} · {recipe.productFamily}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-sans text-text-secondary hover:border-brand hover:text-brand transition-colors">
                  <Copy size={12} /> Clone
                </button>
                <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-sans text-text-secondary hover:border-brand hover:text-brand transition-colors">
                  <GitBranch size={12} /> Branch
                </button>
                {recipe.status === "draft" && (
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand text-white text-xs font-sans font-semibold hover:bg-brand/90 transition-colors">
                    <ArrowRight size={12} /> Submit for Review
                  </button>
                )}
                {recipe.status === "review" && (
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-success text-white text-xs font-sans font-semibold hover:bg-success/90 transition-colors">
                    <CheckCircle2 size={12} /> Approve
                  </button>
                )}
              </div>
            </div>

            {/* Meta chips */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Tag,      label: `Batch: ${recipe.batchSize} ${recipe.batchUnit}` },
                { icon: Clock,    label: `Cycle: ${totalMins} min` },
                { icon: User,     label: `By: ${recipe.createdBy}` },
                { icon: CheckCircle2, label: recipe.approvedBy ? `Approved: ${recipe.approvedBy}` : "Pending approval" },
                { icon: Calendar, label: recipe.effectiveFrom ? `Effective: ${recipe.effectiveFrom}` : "Not yet effective" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border font-sans text-xs text-text-secondary">
                  <Icon size={11} className="text-text-disabled" />
                  {label}
                </div>
              ))}
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Steps", value: recipe.steps.length, sub: `${signoffSteps} need sign-off` },
                { label: "Parameters", value: totalParams, sub: `${criticalParams} critical (CPP)` },
                { label: "Cycle Time", value: `${totalMins}m`, sub: `${recipe.cycleTimeMins}m/pc target` },
                { label: "Batch Size", value: recipe.batchSize, sub: recipe.batchUnit },
              ].map(({ label, value, sub }) => (
                <div key={label} className="p-3 rounded-xl bg-surface border border-border">
                  <div className="font-mono text-lg font-bold text-text-primary">{value}</div>
                  <div className="font-sans text-xs font-medium text-text-secondary mt-0.5">{label}</div>
                  <div className="font-mono text-2xs text-text-disabled">{sub}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border gap-5">
              {(["steps", "changelog", "compare"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "pb-2 font-sans text-xs font-medium capitalize border-b-2 -mb-px transition-colors",
                    tab === t ? "border-brand text-brand" : "border-transparent text-text-secondary hover:text-text-primary"
                  )}
                >
                  {t === "compare" ? "Version Compare" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Steps tab */}
            {tab === "steps" && (
              <div className="space-y-3">
                <div className="mb-2">
                  <ReactECharts option={cycleOption} style={{ height: 100 }} />
                </div>
                {recipe.steps.map((step) => (
                  <div key={step.seq} className="rounded-xl border border-border bg-bg overflow-hidden">
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface transition-colors"
                      onClick={() => setExpandedStep(expandedStep === step.seq ? null : step.seq)}
                    >
                      <div className="w-6 h-6 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center font-mono text-xs font-bold text-brand shrink-0">
                        {step.seq}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-sans text-sm font-semibold text-text-primary">{step.name}</span>
                          {step.requiresSignoff && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs bg-warning/10 text-warning border border-warning/20 font-mono">
                              <Lock size={8} /> Sign-off required
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-2xs text-text-disabled mt-0.5">
                          {step.durationMin} min · {step.parameters.length} params
                        </div>
                      </div>
                      {expandedStep === step.seq ? <ChevronUp size={14} className="text-text-disabled shrink-0" /> : <ChevronDown size={14} className="text-text-disabled shrink-0" />}
                    </button>
                    {expandedStep === step.seq && (
                      <div className="px-4 pb-4 border-t border-border">
                        <p className="font-sans text-xs text-text-secondary mt-3 mb-3 leading-relaxed">{step.instruction}</p>
                        <div className="flex flex-wrap gap-2">
                          {step.parameters.map((p) => <ParameterBadge key={p.name} p={p} />)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Changelog tab */}
            {tab === "changelog" && (
              <div>
                <VersionTimeline log={recipe.changeLog} />
              </div>
            )}

            {/* Version compare tab */}
            {tab === "compare" && (
              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center gap-3 mb-4">
                  <select className="px-2 py-1.5 bg-bg border border-border rounded-lg font-mono text-xs focus:outline-none focus:border-brand">
                    <option>v{recipe.version} (current)</option>
                    {recipe.changeLog.slice(1).map((e) => (
                      <option key={e.version}>v{e.version}</option>
                    ))}
                  </select>
                  <ChevronRight size={14} className="text-text-disabled" />
                  <select className="px-2 py-1.5 bg-bg border border-border rounded-lg font-mono text-xs focus:outline-none focus:border-brand">
                    {recipe.changeLog.slice(1).map((e) => (
                      <option key={e.version}>v{e.version}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  {recipe.changeLog.slice(0, 1).map((e) => (
                    <div key={e.version} className="p-3 rounded-lg bg-success/5 border border-success/20">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-success">+ Added in v{e.version}</span>
                      </div>
                      <p className="font-sans text-xs text-text-secondary">{e.note}</p>
                    </div>
                  ))}
                  <p className="font-sans text-xs text-text-disabled text-center py-4">
                    Full diff view — select two versions above to compare parameters and steps.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
