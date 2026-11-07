"use client";

import { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { AlertTriangle, Plus, X, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, RotateCcw, Trash2, PackageX } from "lucide-react";

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

type NCRStatus = "identified" | "under_review" | "awaiting_disposition" | "closed" | "rejected";
type NCRSeverity = "Critical" | "Major" | "Minor";
type NCRDisposition = "scrap" | "rework" | "accept" | "return_supplier" | null;

interface NCRTimelineEntry {
  status: NCRStatus;
  timestamp: string;
  actor: string;
  note?: string;
}

interface NCR {
  id: string;
  machine: string;
  workOrder: string;
  category: string;
  severity: NCRSeverity;
  description: string;
  quantityAffected: number;
  status: NCRStatus;
  detectedAt: string;
  assignedTo: string;
  disposition: NCRDisposition;
  rootCause: string;
  correctiveAction: string;
  timeline: NCRTimelineEntry[];
}

const INITIAL_NCRS: NCR[] = [
  {
    id: "NCR-2026-089",
    machine: "Welding Robot #1",
    workOrder: "PO-2026-11-002",
    category: "Functional",
    severity: "Major",
    description: "Weld bead deviation ±1.2mm on subframe junction, exceeds ±0.5mm tolerance",
    quantityAffected: 4,
    status: "identified",
    detectedAt: "In-Process",
    assignedTo: "Unassigned",
    disposition: null,
    rootCause: "",
    correctiveAction: "",
    timeline: [
      { status: "identified", timestamp: "2026-11-06T10:14:00Z", actor: "Demo User", note: "Detected during weld inspection" },
    ],
  },
  {
    id: "NCR-2026-088",
    machine: "CNC Lathe #1",
    workOrder: "PO-2026-11-001",
    category: "Dimensional",
    severity: "Critical",
    description: "Housing bore diameter 42.1mm vs 41.5mm spec, 3 sigma out of control",
    quantityAffected: 2,
    status: "under_review",
    detectedAt: "In-Process",
    assignedTo: "Priya Sharma",
    disposition: null,
    rootCause: "",
    correctiveAction: "",
    timeline: [
      { status: "identified", timestamp: "2026-11-06T08:32:00Z", actor: "Demo User" },
      { status: "under_review", timestamp: "2026-11-06T09:05:00Z", actor: "Priya Sharma", note: "Assigned for dimensional review" },
    ],
  },
  {
    id: "NCR-2026-087",
    machine: "Press Machine #1",
    workOrder: "PO-2026-11-003",
    category: "Surface Finish",
    severity: "Minor",
    description: "Surface roughness Ra 1.8μm vs Ra 1.6μm limit — cosmetic deviation",
    quantityAffected: 8,
    status: "under_review",
    detectedAt: "Final Inspection",
    assignedTo: "Arjun Nair",
    disposition: null,
    rootCause: "",
    correctiveAction: "",
    timeline: [
      { status: "identified", timestamp: "2026-11-06T07:50:00Z", actor: "Demo User" },
      { status: "under_review", timestamp: "2026-11-06T08:15:00Z", actor: "Arjun Nair" },
    ],
  },
  {
    id: "NCR-2026-086",
    machine: "QC Station #1",
    workOrder: "PO-2026-11-001",
    category: "Material",
    severity: "Major",
    description: "Hardness test result 48 HRC vs 52–56 HRC specification — material non-conforming",
    quantityAffected: 1,
    status: "awaiting_disposition",
    detectedAt: "Incoming Inspection",
    assignedTo: "Priya Sharma",
    disposition: null,
    rootCause: "Supplier batch mix-up — material certificate mismatch",
    correctiveAction: "",
    timeline: [
      { status: "identified", timestamp: "2026-11-05T14:20:00Z", actor: "Demo User" },
      { status: "under_review", timestamp: "2026-11-05T15:00:00Z", actor: "Priya Sharma" },
      { status: "awaiting_disposition", timestamp: "2026-11-06T09:30:00Z", actor: "Priya Sharma", note: "Root cause confirmed — pending disposition decision" },
    ],
  },
  {
    id: "NCR-2026-085",
    machine: "CNC Lathe #1",
    workOrder: "PO-2026-11-001",
    category: "Process Deviation",
    severity: "Minor",
    description: "Tool change delayed by 45 min — SOP deviation on scheduled tooling interval",
    quantityAffected: 0,
    status: "closed",
    detectedAt: "In-Process",
    assignedTo: "Arjun Nair",
    disposition: "accept",
    rootCause: "Operator scheduling conflict during shift handover",
    correctiveAction: "Updated shift handover checklist to include tooling status confirmation",
    timeline: [
      { status: "identified", timestamp: "2026-11-05T10:10:00Z", actor: "Demo User" },
      { status: "under_review", timestamp: "2026-11-05T10:45:00Z", actor: "Arjun Nair" },
      { status: "awaiting_disposition", timestamp: "2026-11-05T11:20:00Z", actor: "Arjun Nair" },
      { status: "closed", timestamp: "2026-11-05T12:00:00Z", actor: "Priya Sharma", note: "Accepted as-is — no product impact" },
    ],
  },
  {
    id: "NCR-2026-084",
    machine: "Welding Robot #1",
    workOrder: "PO-2026-11-002",
    category: "Dimensional",
    severity: "Major",
    description: "Frame squareness 1.5mm out of spec — exceeds 0.8mm tolerance",
    quantityAffected: 3,
    status: "closed",
    detectedAt: "Final Inspection",
    assignedTo: "Priya Sharma",
    disposition: "rework",
    rootCause: "Fixture clamp wear causing misalignment",
    correctiveAction: "Fixture clamp replaced, recalibration completed",
    timeline: [
      { status: "identified", timestamp: "2026-11-04T16:30:00Z", actor: "Demo User" },
      { status: "under_review", timestamp: "2026-11-04T17:00:00Z", actor: "Priya Sharma" },
      { status: "awaiting_disposition", timestamp: "2026-11-05T09:00:00Z", actor: "Priya Sharma" },
      { status: "closed", timestamp: "2026-11-05T14:30:00Z", actor: "Priya Sharma", note: "100% rework completed, re-inspected pass" },
    ],
  },
  {
    id: "NCR-2026-083",
    machine: "Press Machine #1",
    workOrder: "PO-2026-11-003",
    category: "Functional",
    severity: "Critical",
    description: "Bracket spring-back exceeds 2.5° — functional failure on assembly fit",
    quantityAffected: 6,
    status: "closed",
    detectedAt: "Final Inspection",
    assignedTo: "Arjun Nair",
    disposition: "scrap",
    rootCause: "Incorrect blank thickness — supplier delivered 2.0mm vs 2.2mm nominal",
    correctiveAction: "Supplier corrective action issued. All incoming material now 100% inspected",
    timeline: [
      { status: "identified", timestamp: "2026-11-03T11:00:00Z", actor: "Demo User" },
      { status: "under_review", timestamp: "2026-11-03T11:30:00Z", actor: "Arjun Nair" },
      { status: "awaiting_disposition", timestamp: "2026-11-04T08:00:00Z", actor: "Arjun Nair" },
      { status: "closed", timestamp: "2026-11-04T10:00:00Z", actor: "Priya Sharma", note: "Scrapped. Supplier SCAR issued." },
    ],
  },
  {
    id: "NCR-2026-082",
    machine: "QC Station #1",
    workOrder: "PO-2026-11-001",
    category: "Surface Finish",
    severity: "Minor",
    description: "Minor scratches on inspection fixture contact surface — potential cosmetic transfer",
    quantityAffected: 12,
    status: "closed",
    detectedAt: "In-Process",
    assignedTo: "Demo User",
    disposition: "accept",
    rootCause: "Normal fixture wear",
    correctiveAction: "Fixture resurfaced during PM",
    timeline: [
      { status: "identified", timestamp: "2026-11-02T14:00:00Z", actor: "Demo User" },
      { status: "closed", timestamp: "2026-11-02T16:00:00Z", actor: "Demo User", note: "Accepted — no product transfer observed" },
    ],
  },
];

const STATUS_LABEL: Record<NCRStatus, string> = {
  identified: "Identified",
  under_review: "Under Review",
  awaiting_disposition: "Awaiting Disposition",
  closed: "Closed",
  rejected: "Rejected",
};

const STATUS_COLOR: Record<NCRStatus, { bg: string; color: string }> = {
  identified: { bg: T.dangerDim, color: T.danger },
  under_review: { bg: T.warningDim, color: T.warning },
  awaiting_disposition: { bg: T.brandDim, color: T.brand },
  closed: { bg: T.successDim, color: T.success },
  rejected: { bg: T.neutralDim, color: T.neutral },
};

const SEVERITY_COLOR: Record<NCRSeverity, { bg: string; color: string }> = {
  Critical: { bg: T.dangerDim, color: T.danger },
  Major: { bg: T.warningDim, color: T.warning },
  Minor: { bg: T.neutralDim, color: T.neutral },
};

function formatTs(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function KPICard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="p-5 shadow-sm">
      <p style={{ color: T.muted, fontSize: 11, letterSpacing: "0.08em" }} className="font-sans uppercase font-medium mb-1">{label}</p>
      <p style={{ color, fontSize: 32 }} className="font-mono font-black tabular-nums">{value}</p>
    </div>
  );
}

function dispositionOption() {
  return {
    backgroundColor: "transparent",
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { show: false },
    series: [{
      type: "pie",
      radius: ["52%", "78%"],
      data: [
        { value: 8, name: "Scrap", itemStyle: { color: T.danger } },
        { value: 14, name: "Rework", itemStyle: { color: T.warning } },
        { value: 5, name: "Accept As-Is", itemStyle: { color: T.neutral } },
        { value: 2, name: "Return to Supplier", itemStyle: { color: T.disabled } },
      ],
      label: { show: false },
      emphasis: { scale: true, scaleSize: 4 },
    }],
  };
}

function categoryChartOption(ncrs: NCR[]) {
  const cats: Record<string, number> = {};
  ncrs.filter(n => n.status !== "closed" && n.status !== "rejected").forEach(n => {
    cats[n.category] = (cats[n.category] ?? 0) + 1;
  });
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  return {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 100, right: 20, top: 10, bottom: 20 },
    xAxis: { type: "value", splitLine: { lineStyle: { color: T.grid } }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: T.muted, fontSize: 10, fontFamily: "IBM Plex Mono" } },
    yAxis: { type: "category", data: sorted.map(([k]) => k), axisLabel: { color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono" }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{ type: "bar", data: sorted.map(([, v]) => v), itemStyle: { color: T.brand, borderRadius: [0, 4, 4, 0] }, barMaxWidth: 20 }],
  };
}

type TabKey = "identified" | "under_review" | "awaiting_disposition" | "all" | "closed";

export default function NCMPage() {
  const [ncrs, setNcrs] = useState<NCR[]>(INITIAL_NCRS);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    machine: "CNC Lathe #1",
    workOrder: "",
    category: "Dimensional",
    severity: "Major" as NCRSeverity,
    description: "",
    quantityAffected: 0,
    detectedAt: "In-Process",
    assignedTo: "Demo User",
  });

  const openCount = useMemo(() => ncrs.filter(n => n.status === "identified").length, [ncrs]);
  const reviewCount = useMemo(() => ncrs.filter(n => n.status === "under_review").length, [ncrs]);
  const dispCount = useMemo(() => ncrs.filter(n => n.status === "awaiting_disposition").length, [ncrs]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return ncrs;
    if (activeTab === "closed") return ncrs.filter(n => n.status === "closed" || n.status === "rejected");
    return ncrs.filter(n => n.status === (activeTab as NCRStatus));
  }, [ncrs, activeTab]);

  function handleSubmit() {
    const nextId = `NCR-2026-${String(90 + ncrs.filter(n => n.id.startsWith("NCR-2026-0")).length).padStart(3, "0")}`;
    const newNcr: NCR = {
      id: nextId,
      machine: form.machine,
      workOrder: form.workOrder || "PO-2026-11-001",
      category: form.category,
      severity: form.severity,
      description: form.description,
      quantityAffected: form.quantityAffected,
      status: "identified",
      detectedAt: form.detectedAt,
      assignedTo: form.assignedTo,
      disposition: null,
      rootCause: "",
      correctiveAction: "",
      timeline: [{ status: "identified", timestamp: new Date().toISOString(), actor: "Demo User", note: "NCR created" }],
    };
    setNcrs(prev => [newNcr, ...prev]);
    setForm({ machine: "CNC Lathe #1", workOrder: "", category: "Dimensional", severity: "Major", description: "", quantityAffected: 0, detectedAt: "In-Process", assignedTo: "Demo User" });
    setShowForm(false);
    setActiveTab("identified");
  }

  function applyDisposition(id: string, disposition: NCRDisposition) {
    setNcrs(prev => prev.map(n => {
      if (n.id !== id) return n;
      return {
        ...n,
        status: "closed",
        disposition,
        timeline: [...n.timeline, { status: "closed" as NCRStatus, timestamp: new Date().toISOString(), actor: "Demo User", note: `Disposition: ${disposition}` }],
      };
    }));
  }

  function updateNCR(id: string, patch: Partial<NCR>) {
    setNcrs(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n));
  }

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "identified", label: "Open", count: openCount },
    { key: "under_review", label: "Under Review", count: reviewCount },
    { key: "awaiting_disposition", label: "Awaiting Disposition", count: dispCount },
    { key: "all", label: "All" },
    { key: "closed", label: "Closed" },
  ];

  return (
    <div style={{ background: T.bgSubtle, minHeight: "100vh" }} className="p-6 font-sans">

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 style={{ color: T.text, fontFamily: "Familjen Grotesk, sans-serif", fontSize: 24 }} className="font-bold">Non-Conformance Management</h1>
          <p style={{ color: T.muted, fontSize: 13 }} className="mt-1">Quality incident tracking · disposition workflow · closed-loop quality</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ background: showForm ? T.bgMuted : T.brand, color: showForm ? T.text : "#fff", border: `1px solid ${showForm ? T.border : T.brand}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
          className="font-sans font-semibold transition-all"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "Report Non-Conformance"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Open NCRs" value={openCount} color={T.danger} />
        <KPICard label="Under Review" value={reviewCount} color={T.warning} />
        <KPICard label="Awaiting Disposition" value={dispCount} color={T.brand} />
        <KPICard label="Closed This Week" value={12} color={T.success} />
      </div>

      {showForm && (
        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="p-6 mb-6 shadow-sm">
          <h2 style={{ color: T.text, fontSize: 16, fontFamily: "Familjen Grotesk, sans-serif" }} className="font-semibold mb-4">Create Non-Conformance Report</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            <div>
              <label style={{ color: T.muted, fontSize: 11, letterSpacing: "0.06em" }} className="block uppercase font-medium mb-1">Machine</label>
              <select value={form.machine} onChange={e => setForm(f => ({ ...f, machine: e.target.value }))}
                style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 13, color: T.text, background: T.bg }}>
                {["CNC Lathe #1", "Press Machine #1", "Welding Robot #1", "QC Station #1"].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label style={{ color: T.muted, fontSize: 11, letterSpacing: "0.06em" }} className="block uppercase font-medium mb-1">Work Order</label>
              <input value={form.workOrder} onChange={e => setForm(f => ({ ...f, workOrder: e.target.value }))} placeholder="PO-2026-11-001"
                style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 13, color: T.text, background: T.bg }} />
            </div>

            <div>
              <label style={{ color: T.muted, fontSize: 11, letterSpacing: "0.06em" }} className="block uppercase font-medium mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 13, color: T.text, background: T.bg }}>
                {["Dimensional", "Surface Finish", "Functional", "Process Deviation", "Material"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={{ color: T.muted, fontSize: 11, letterSpacing: "0.06em" }} className="block uppercase font-medium mb-1">Severity</label>
              <div className="flex gap-2 mt-1">
                {(["Critical", "Major", "Minor"] as NCRSeverity[]).map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, severity: s }))}
                    style={{ flex: 1, borderRadius: 6, padding: "6px 0", fontSize: 12, fontWeight: 600, border: `1px solid ${form.severity === s ? SEVERITY_COLOR[s].color : T.border}`, background: form.severity === s ? SEVERITY_COLOR[s].bg : T.bg, color: form.severity === s ? SEVERITY_COLOR[s].color : T.muted }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ color: T.muted, fontSize: 11, letterSpacing: "0.06em" }} className="block uppercase font-medium mb-1">Quantity Affected</label>
              <input type="number" min={0} value={form.quantityAffected} onChange={e => setForm(f => ({ ...f, quantityAffected: Number(e.target.value) }))}
                style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 13, color: T.text, background: T.bg }} />
            </div>

            <div>
              <label style={{ color: T.muted, fontSize: 11, letterSpacing: "0.06em" }} className="block uppercase font-medium mb-1">Detected At</label>
              <select value={form.detectedAt} onChange={e => setForm(f => ({ ...f, detectedAt: e.target.value }))}
                style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 13, color: T.text, background: T.bg }}>
                {["Incoming Inspection", "In-Process", "Final Inspection", "Customer Return"].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label style={{ color: T.muted, fontSize: 11, letterSpacing: "0.06em" }} className="block uppercase font-medium mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Describe the non-conformance..."
                style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 13, color: T.text, background: T.bg, resize: "vertical" }} />
            </div>

            <div>
              <label style={{ color: T.muted, fontSize: 11, letterSpacing: "0.06em" }} className="block uppercase font-medium mb-1">Assigned To</label>
              <select value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 13, color: T.text, background: T.bg }}>
                {["Demo User", "Priya Sharma", "Arjun Nair"].map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button onClick={handleSubmit}
              style={{ background: T.brand, color: "#fff", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, border: "none" }}>
              Create NCR
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        <div className="lg:col-span-3">

          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="shadow-sm overflow-hidden">
            <div style={{ borderBottom: `1px solid ${T.border}`, padding: "0 16px" }} className="flex gap-1 overflow-x-auto">
              {TABS.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  style={{ padding: "12px 14px", fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400, color: activeTab === tab.key ? T.brand : T.muted, borderBottom: activeTab === tab.key ? `2px solid ${T.brand}` : "2px solid transparent", background: "none", border: "none", borderBottomStyle: "solid", whiteSpace: "nowrap" }}>
                  {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ""}
                </button>
              ))}
            </div>

            <div className="divide-y" style={{ borderColor: T.border }}>
              {filtered.length === 0 && (
                <div style={{ padding: 32, textAlign: "center", color: T.muted, fontSize: 13 }}>No NCRs in this category.</div>
              )}
              {filtered.map(ncr => {
                const sevColor = SEVERITY_COLOR[ncr.severity];
                const stColor = STATUS_COLOR[ncr.status];
                const isExpanded = expandedId === ncr.id;

                return (
                  <div key={ncr.id}>
                    <div style={{ padding: "14px 16px" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span style={{ background: T.bgMuted, color: T.text, borderRadius: 4, padding: "2px 7px", fontSize: 11, fontFamily: "IBM Plex Mono" }} className="font-mono font-semibold">{ncr.id}</span>
                            <span style={{ background: sevColor.bg, color: sevColor.color, borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 600 }}>{ncr.severity}</span>
                            <span style={{ background: stColor.bg, color: stColor.color, borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 600 }}>{STATUS_LABEL[ncr.status]}</span>
                          </div>
                          <p style={{ color: T.muted, fontSize: 12, marginBottom: 3 }}>{ncr.machine} · {ncr.category} · {ncr.quantityAffected} unit{ncr.quantityAffected !== 1 ? "s" : ""}</p>
                          <p style={{ color: T.text, fontSize: 13 }}>{ncr.description.length > 90 ? ncr.description.slice(0, 90) + "…" : ncr.description}</p>
                        </div>
                        <button onClick={() => setExpandedId(isExpanded ? null : ncr.id)}
                          style={{ color: T.muted, background: "none", border: "none", display: "flex", alignItems: "center", gap: 4, fontSize: 12, whiteSpace: "nowrap" }}>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {isExpanded ? "Collapse" : "View Details"}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ background: T.bgSubtle, borderTop: `1px solid ${T.border}`, padding: "16px 16px 20px" }}>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                          <div>
                            <p style={{ color: T.muted, fontSize: 11, letterSpacing: "0.06em" }} className="uppercase font-medium mb-2">Status Timeline</p>
                            <div className="relative pl-4" style={{ borderLeft: `2px solid ${T.border}` }}>
                              {ncr.timeline.map((entry, i) => (
                                <div key={i} style={{ position: "relative", marginBottom: 12 }}>
                                  <div style={{ position: "absolute", left: -17, top: 3, width: 10, height: 10, borderRadius: "50%", background: STATUS_COLOR[entry.status].color, border: `2px solid ${T.bg}` }} />
                                  <p style={{ color: T.text, fontSize: 12, fontWeight: 600 }}>{STATUS_LABEL[entry.status]}</p>
                                  <p style={{ color: T.muted, fontSize: 11 }}>{formatTs(entry.timestamp)} · {entry.actor}</p>
                                  {entry.note && <p style={{ color: T.muted, fontSize: 11, fontStyle: "italic" }}>{entry.note}</p>}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label style={{ color: T.muted, fontSize: 11, letterSpacing: "0.06em" }} className="block uppercase font-medium mb-1">Root Cause</label>
                              <textarea value={ncr.rootCause} onChange={e => updateNCR(ncr.id, { rootCause: e.target.value })} rows={2} placeholder="Identify root cause..."
                                style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, color: T.text, background: T.bg, resize: "vertical" }} />
                            </div>
                            <div>
                              <label style={{ color: T.muted, fontSize: 11, letterSpacing: "0.06em" }} className="block uppercase font-medium mb-1">Corrective Action</label>
                              <textarea value={ncr.correctiveAction} onChange={e => updateNCR(ncr.id, { correctiveAction: e.target.value })} rows={2} placeholder="Describe corrective action..."
                                style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, color: T.text, background: T.bg, resize: "vertical" }} />
                            </div>
                          </div>
                        </div>

                        {ncr.status === "awaiting_disposition" && (
                          <div>
                            <p style={{ color: T.muted, fontSize: 11, letterSpacing: "0.06em", marginBottom: 8 }} className="uppercase font-medium">Select Disposition</p>
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => applyDisposition(ncr.id, "scrap")}
                                style={{ background: T.dangerDim, color: T.danger, border: `1px solid ${T.danger}`, borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                                <Trash2 size={13} /> Scrap All
                              </button>
                              <button onClick={() => applyDisposition(ncr.id, "rework")}
                                style={{ background: T.warningDim, color: T.warning, border: `1px solid ${T.warning}`, borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                                <RotateCcw size={13} /> 100% Rework
                              </button>
                              <button onClick={() => applyDisposition(ncr.id, "accept")}
                                style={{ background: T.neutralDim, color: T.neutral, border: `1px solid ${T.neutral}`, borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                                <CheckCircle2 size={13} /> Accept As-Is with Concession
                              </button>
                              <button onClick={() => applyDisposition(ncr.id, "return_supplier")}
                                style={{ background: T.bgMuted, color: T.muted, border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                                <PackageX size={13} /> Return to Supplier
                              </button>
                            </div>
                          </div>
                        )}

                        {ncr.status === "identified" && (
                          <button onClick={() => updateNCR(ncr.id, { status: "under_review", timeline: [...ncr.timeline, { status: "under_review" as NCRStatus, timestamp: new Date().toISOString(), actor: "Demo User", note: "Moved to review" }] })}
                            style={{ background: T.warningDim, color: T.warning, border: `1px solid ${T.warning}`, borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 600 }}>
                            Start Review →
                          </button>
                        )}

                        {ncr.status === "under_review" && (
                          <button onClick={() => updateNCR(ncr.id, { status: "awaiting_disposition", timeline: [...ncr.timeline, { status: "awaiting_disposition" as NCRStatus, timestamp: new Date().toISOString(), actor: "Demo User", note: "Review complete — disposition required" }] })}
                            style={{ background: T.brandDim, color: T.brand, border: `1px solid ${T.brand}`, borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 600 }}>
                            Complete Review → Disposition
                          </button>
                        )}

                        {ncr.status === "closed" && ncr.disposition && (
                          <div style={{ background: T.successDim, color: T.success, borderRadius: 6, padding: "8px 12px", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <CheckCircle2 size={13} />
                            Closed · Disposition: {ncr.disposition === "accept" ? "Accept As-Is" : ncr.disposition === "return_supplier" ? "Return to Supplier" : ncr.disposition.charAt(0).toUpperCase() + ncr.disposition.slice(1)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">

          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="p-4 shadow-sm">
            <p style={{ color: T.text, fontSize: 13, fontFamily: "Familjen Grotesk, sans-serif" }} className="font-semibold mb-1">Disposition Breakdown</p>
            <p style={{ color: T.muted, fontSize: 11 }} className="mb-3">Past 30 days · 29 closed</p>
            <ReactECharts option={dispositionOption()} style={{ height: 180 }} />
            <div className="space-y-1 mt-3">
              {[
                { label: "Scrap", count: 8, color: T.danger },
                { label: "Rework", count: 14, color: T.warning },
                { label: "Accept As-Is", count: 5, color: T.neutral },
                { label: "Return to Supplier", count: 2, color: T.disabled },
              ].map(d => (
                <div key={d.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                    <span style={{ color: T.muted, fontSize: 11 }}>{d.label}</span>
                  </div>
                  <span style={{ color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono" }} className="font-mono">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="p-4 shadow-sm">
            <p style={{ color: T.text, fontSize: 13, fontFamily: "Familjen Grotesk, sans-serif" }} className="font-semibold mb-1">Open NCRs by Category</p>
            <p style={{ color: T.muted, fontSize: 11 }} className="mb-3">Active incidents</p>
            <ReactECharts option={categoryChartOption(ncrs)} style={{ height: 160 }} />
          </div>

          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="p-4 shadow-sm">
            <p style={{ color: T.text, fontSize: 13, fontFamily: "Familjen Grotesk, sans-serif" }} className="font-semibold mb-3">NCR Aging</p>
            {[
              { label: "< 4 hours", count: 2, color: T.success },
              { label: "4–24 hours", count: 3, color: T.warning },
              { label: "1–3 days", count: 2, color: T.danger },
              { label: "> 3 days", count: 1, color: T.danger },
            ].map(a => (
              <div key={a.label} className="flex items-center gap-2 mb-2">
                <div style={{ width: 8, height: 8, borderRadius: 2, background: a.color, flexShrink: 0 }} />
                <div style={{ flex: 1, background: T.bgMuted, borderRadius: 3, height: 6, overflow: "hidden" }}>
                  <div style={{ width: `${(a.count / 8) * 100}%`, height: "100%", background: a.color, borderRadius: 3 }} />
                </div>
                <span style={{ color: T.muted, fontSize: 11, whiteSpace: "nowrap" }}>{a.label}</span>
                <span style={{ color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono", width: 16, textAlign: "right" }} className="font-mono">{a.count}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
