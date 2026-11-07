"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Plus, ChevronDown, ChevronUp } from "lucide-react";

type InspectionType = "incoming" | "in_process" | "final";
type ReadingType = "numeric" | "visual" | "boolean";
type InspStatus = "pending" | "passed" | "failed" | "partial";

interface InspectionParameter {
  id: string;
  label: string;
  type: ReadingType;
  unit?: string;
  min?: number;
  max?: number;
  options?: string[];
  required: boolean;
}

interface InspectionTemplate {
  id: string;
  name: string;
  item: string;
  type: InspectionType;
  parameters: InspectionParameter[];
}

interface Inspection {
  id: string;
  templateId: string;
  reference: string;
  supplier?: string;
  date: string;
  inspector: string;
  status: InspStatus;
  sampleSize: number;
  accepted: number;
  rejected: number;
  readings: Record<string, string | number | boolean>;
}

const TEMPLATES: InspectionTemplate[] = [
  {
    id: "T-001", name: "ENG-MNT-V2 Incoming QC", item: "ENG-MNT-V2", type: "incoming",
    parameters: [
      { id: "dim_od", label: "Outer Diameter", type: "numeric", unit: "mm", min: 49.95, max: 50.05, required: true },
      { id: "dim_id", label: "Inner Bore Diameter", type: "numeric", unit: "mm", min: 24.95, max: 25.05, required: true },
      { id: "surface", label: "Surface Finish (Ra)", type: "numeric", unit: "μm", min: 0.8, max: 2.0, required: true },
      { id: "visual_ok", label: "Visual — No cracks, burrs, or surface damage", type: "boolean", required: true },
      { id: "marking", label: "Part Marking / Traceability", type: "boolean", required: true },
      { id: "packaging", label: "Packaging Integrity", type: "visual", options: ["Good", "Damaged", "Repackaged"], required: false },
    ],
  },
  {
    id: "T-002", name: "SHAFT-V7 In-Process QC", item: "SHAFT-V7", type: "in_process",
    parameters: [
      { id: "length", label: "Shaft Length", type: "numeric", unit: "mm", min: 199.8, max: 200.2, required: true },
      { id: "straightness", label: "Straightness", type: "numeric", unit: "mm", min: 0, max: 0.05, required: true },
      { id: "surface_ra", label: "Surface Roughness Ra", type: "numeric", unit: "μm", min: 0.4, max: 1.6, required: true },
      { id: "keyway", label: "Keyway Dimension", type: "numeric", unit: "mm", min: 7.98, max: 8.03, required: true },
      { id: "visual_ok", label: "Visual — No tool marks or chatter", type: "boolean", required: true },
    ],
  },
  {
    id: "T-003", name: "BRK-ASY-X4 Final Inspection", item: "BRK-ASY-X4", type: "final",
    parameters: [
      { id: "torque", label: "Assembly Torque", type: "numeric", unit: "Nm", min: 38, max: 46, required: true },
      { id: "pull_force", label: "Pull Force", type: "numeric", unit: "N", min: 450, max: 650, required: true },
      { id: "functional", label: "Functional Test — Engage/Release", type: "boolean", required: true },
      { id: "label", label: "Label / Barcode Scan", type: "boolean", required: true },
      { id: "cosmetic", label: "Cosmetic Grade", type: "visual", options: ["A — No defects", "B — Minor (acceptable)", "C — Reject"], required: true },
    ],
  },
];

const MOCK_INSPECTIONS: Inspection[] = [
  { id: "QI-2026-11-001", templateId: "T-001", reference: "PO-REC-20261106-012", supplier: "Patel Precision Pvt Ltd", date: "2026-11-06 09:15", inspector: "K.Sharma", status: "passed", sampleSize: 20, accepted: 20, rejected: 0, readings: { dim_od: 50.01, dim_id: 25.01, surface: 1.3, visual_ok: true, marking: true, packaging: "Good" } },
  { id: "QI-2026-11-002", templateId: "T-002", reference: "PO-2026-11-003", date: "2026-11-06 11:30", inspector: "R.Singh", status: "failed", sampleSize: 10, accepted: 7, rejected: 3, readings: { length: 200.1, straightness: 0.08, surface_ra: 1.2, keyway: 8.01, visual_ok: false } },
  { id: "QI-2026-11-003", templateId: "T-003", reference: "PO-2026-11-002", date: "2026-11-06 14:00", inspector: "M.Patel", status: "partial", sampleSize: 15, accepted: 13, rejected: 2, readings: { torque: 42, pull_force: 510, functional: true, label: true, cosmetic: "B — Minor (acceptable)" } },
  { id: "QI-2026-11-004", templateId: "T-001", reference: "PO-REC-20261106-009", supplier: "Sunrise Components", date: "2026-11-05 15:45", inspector: "D.Kumar", status: "passed", sampleSize: 20, accepted: 20, rejected: 0, readings: { dim_od: 49.98, dim_id: 25.00, surface: 1.5, visual_ok: true, marking: true, packaging: "Good" } },
];

const TYPE_CONFIG: Record<InspectionType, { label: string; color: string; bg: string }> = {
  incoming:   { label: "Incoming", color: "text-brand", bg: "bg-brand/10" },
  in_process: { label: "In-Process", color: "text-warning", bg: "bg-warning/10" },
  final:      { label: "Final", color: "text-success", bg: "bg-success/10" },
};

const STATUS_CONFIG: Record<InspStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  passed:  { label: "Passed", color: "text-success", bg: "bg-success/12", icon: CheckCircle2 },
  failed:  { label: "Failed", color: "text-danger", bg: "bg-danger/12", icon: XCircle },
  partial: { label: "Partial Accept", color: "text-warning", bg: "bg-warning/12", icon: AlertTriangle },
  pending: { label: "Pending", color: "text-text-secondary", bg: "bg-bg", icon: AlertTriangle },
};

export default function InspectionsPage() {
  const [activeTab, setActiveTab] = useState<"log" | "new" | "templates">("log");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [readings, setReadings] = useState<Record<string, string | number | boolean>>({});

  const template = TEMPLATES.find(t => t.id === selectedTemplate)!;

  const passed = MOCK_INSPECTIONS.filter(i => i.status === "passed").length;
  const failed = MOCK_INSPECTIONS.filter(i => i.status === "failed").length;

  function getParamStatus(param: InspectionParameter, value: string | number | boolean | undefined) {
    if (value === undefined || value === "") return "empty";
    if (param.type === "numeric") {
      const v = parseFloat(value as string);
      if (isNaN(v)) return "empty";
      if (param.min !== undefined && v < param.min) return "fail";
      if (param.max !== undefined && v > param.max) return "fail";
      return "pass";
    }
    if (param.type === "boolean") return value ? "pass" : "fail";
    if (param.type === "visual" && param.options) {
      const opt = param.options.find(o => o === value);
      if (!opt) return "empty";
      if (opt.startsWith("C") || opt.startsWith("Damaged")) return "fail";
      return "pass";
    }
    return "pass";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary">Quality Inspections</h1>
          <p className="font-sans text-xs text-text-tertiary mt-0.5">Incoming · in-process · final inspection templates and results log</p>
        </div>
        <button onClick={() => setActiveTab("new")}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg font-sans text-xs font-semibold hover:bg-brand/90 transition-colors">
          <Plus size={14} />
          New Inspection
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Inspections Today", value: MOCK_INSPECTIONS.length.toString(), color: "text-text-primary" },
          { label: "Passed", value: passed.toString(), color: "text-success" },
          { label: "Failed", value: failed.toString(), color: failed > 0 ? "text-danger" : "text-success" },
          { label: "Pass Rate", value: `${Math.round((passed / MOCK_INSPECTIONS.length) * 100)}%`, color: passed / MOCK_INSPECTIONS.length >= 0.9 ? "text-success" : "text-warning" },
        ].map(k => (
          <div key={k.label} className="bg-surface border border-border rounded-xl p-3">
            <p className="font-mono text-2xs text-text-tertiary uppercase tracking-widest mb-1">{k.label}</p>
            <p className={`font-mono text-lg font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1">
        {([["log", "Inspection Log"], ["new", "New Inspection"], ["templates", "Templates"]] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-sans text-xs font-medium transition-colors border-b-2 -mb-px ${activeTab === tab ? "border-brand text-brand" : "border-transparent text-text-tertiary hover:text-text-primary"}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "log" && (
        <div className="space-y-3">
          {MOCK_INSPECTIONS.map(insp => {
            const tmpl = TEMPLATES.find(t => t.id === insp.templateId)!;
            const sc = STATUS_CONFIG[insp.status];
            const tc = TYPE_CONFIG[tmpl.type];
            const isExp = expanded === insp.id;
            const StatusIcon = sc.icon;
            return (
              <div key={insp.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg/40 transition-colors flex-wrap"
                  onClick={() => setExpanded(isExp ? null : insp.id)}>
                  <StatusIcon size={16} className={sc.color} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono text-xs font-semibold text-brand">{insp.id}</p>
                      <span className={`px-2 py-0.5 rounded-full font-mono text-2xs ${tc.bg} ${tc.color}`}>{tc.label}</span>
                      <span className={`px-2 py-0.5 rounded-full font-mono text-2xs ${sc.bg} ${sc.color}`}>{sc.label}</span>
                    </div>
                    <p className="font-sans text-xs text-text-tertiary mt-0.5">
                      {tmpl.name} · {insp.reference}{insp.supplier ? ` · ${insp.supplier}` : ""} · {insp.inspector} · {insp.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <p className="font-mono text-xs text-text-primary font-bold">{insp.accepted}/{insp.sampleSize}</p>
                      <p className="font-mono text-2xs text-text-tertiary">accepted</p>
                    </div>
                    {insp.rejected > 0 && (
                      <div>
                        <p className="font-mono text-xs text-danger font-bold">{insp.rejected}</p>
                        <p className="font-mono text-2xs text-text-tertiary">rejected</p>
                      </div>
                    )}
                    {isExp ? <ChevronUp size={14} className="text-text-tertiary" /> : <ChevronDown size={14} className="text-text-tertiary" />}
                  </div>
                </div>
                {isExp && (
                  <div className="border-t border-border px-4 py-4">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="border-b border-border">
                          {["Parameter", "Reading", "Spec (Min – Max)", "Status"].map(h => (
                            <th key={h} className="text-left text-text-tertiary font-medium pb-2 pr-4 uppercase tracking-widest text-2xs">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {tmpl.parameters.map(param => {
                          const reading = insp.readings[param.id];
                          const pst = getParamStatus(param, reading);
                          return (
                            <tr key={param.id} className={pst === "fail" ? "bg-danger/4" : ""}>
                              <td className="py-1.5 pr-4 text-text-secondary">{param.label}</td>
                              <td className={`py-1.5 pr-4 font-bold ${pst === "fail" ? "text-danger" : pst === "pass" ? "text-success" : "text-text-tertiary"}`}>
                                {reading === true ? "Yes" : reading === false ? "No" : reading?.toString() ?? "—"}
                                {param.unit ? ` ${param.unit}` : ""}
                              </td>
                              <td className="py-1.5 pr-4 text-text-tertiary">
                                {param.type === "numeric" ? `${param.min ?? "—"} – ${param.max ?? "—"} ${param.unit ?? ""}` :
                                 param.type === "boolean" ? "Must be Yes" :
                                 param.options?.join(" / ") ?? "—"}
                              </td>
                              <td className="py-1.5">
                                {pst === "pass" ? <CheckCircle2 size={13} className="text-success" /> :
                                 pst === "fail" ? <XCircle size={13} className="text-danger" /> :
                                 <span className="text-text-tertiary text-2xs">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="flex gap-2 mt-4">
                      {insp.status === "failed" && (
                        <button className="px-4 py-1.5 bg-danger text-white rounded-lg font-sans text-xs font-semibold hover:bg-danger/90 transition-colors">
                          Raise NCR
                        </button>
                      )}
                      <button className="px-4 py-1.5 bg-surface border border-border text-text-primary rounded-lg font-sans text-xs hover:bg-bg transition-colors">
                        Print Report
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "new" && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-2xs text-text-tertiary uppercase tracking-widest block mb-1">Inspection Template</label>
              <select value={selectedTemplate} onChange={e => { setSelectedTemplate(e.target.value); setReadings({}); }}
                className="w-full font-sans text-xs bg-bg border border-border rounded-lg px-3 py-2 text-text-primary focus:border-brand focus:outline-none">
                {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name} ({t.type})</option>)}
              </select>
            </div>
            <div>
              <label className="font-mono text-2xs text-text-tertiary uppercase tracking-widest block mb-1">Reference (PO / Work Order)</label>
              <input className="w-full font-sans text-xs bg-bg border border-border rounded-lg px-3 py-2 text-text-primary focus:border-brand focus:outline-none" placeholder="e.g. PO-REC-20261106-015" />
            </div>
            <div>
              <label className="font-mono text-2xs text-text-tertiary uppercase tracking-widest block mb-1">Inspector</label>
              <input className="w-full font-sans text-xs bg-bg border border-border rounded-lg px-3 py-2 text-text-primary focus:border-brand focus:outline-none" defaultValue="Demo User" />
            </div>
            <div>
              <label className="font-mono text-2xs text-text-tertiary uppercase tracking-widest block mb-1">Sample Size</label>
              <input type="number" defaultValue="20" className="w-full font-mono text-xs bg-bg border border-border rounded-lg px-3 py-2 text-text-primary focus:border-brand focus:outline-none" />
            </div>
            {template.type === "incoming" && (
              <div>
                <label className="font-mono text-2xs text-text-tertiary uppercase tracking-widest block mb-1">Supplier</label>
                <input className="w-full font-sans text-xs bg-bg border border-border rounded-lg px-3 py-2 text-text-primary focus:border-brand focus:outline-none" placeholder="Supplier name" />
              </div>
            )}
          </div>

          <div>
            <p className="font-heading text-xs font-semibold text-text-secondary uppercase tracking-widest mb-3">Inspection Readings — {template.name}</p>
            <div className="space-y-3">
              {template.parameters.map(param => {
                const val = readings[param.id];
                const pst = getParamStatus(param, val);
                const borderColor = pst === "pass" ? "border-success" : pst === "fail" ? "border-danger" : "border-border";
                return (
                  <div key={param.id} className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <label className="font-sans text-xs text-text-primary font-medium block mb-0.5">
                        {param.label}
                        {param.required && <span className="text-danger ml-1">*</span>}
                      </label>
                      <p className="font-mono text-2xs text-text-tertiary">
                        {param.type === "numeric" ? `Spec: ${param.min ?? "—"} – ${param.max ?? "—"} ${param.unit ?? ""}` :
                         param.type === "boolean" ? "Yes / No" :
                         param.options?.join(", ") ?? ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {param.type === "numeric" ? (
                        <input type="number" step="0.001" placeholder="Reading"
                          className={`font-mono text-xs bg-bg border ${borderColor} rounded-lg px-3 py-1.5 w-32 text-text-primary focus:outline-none transition-colors`}
                          onChange={e => setReadings(r => ({ ...r, [param.id]: parseFloat(e.target.value) }))} />
                      ) : param.type === "boolean" ? (
                        <div className="flex gap-1">
                          {[true, false].map(v => (
                            <button key={String(v)} onClick={() => setReadings(r => ({ ...r, [param.id]: v }))}
                              className={`px-3 py-1.5 rounded-lg font-sans text-xs font-medium transition-colors ${readings[param.id] === v ? (v ? "bg-success text-white" : "bg-danger text-white") : "bg-bg border border-border text-text-secondary hover:border-brand"}`}>
                              {v ? "Yes" : "No"}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <select className={`font-sans text-xs bg-bg border ${borderColor} rounded-lg px-3 py-1.5 text-text-primary focus:outline-none`}
                          onChange={e => setReadings(r => ({ ...r, [param.id]: e.target.value }))}>
                          <option value="">Select...</option>
                          {param.options?.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      )}
                      {pst === "pass" && <CheckCircle2 size={14} className="text-success" />}
                      {pst === "fail" && <XCircle size={14} className="text-danger" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-border">
            <button className="px-5 py-2 bg-success text-white rounded-lg font-sans text-xs font-semibold hover:bg-success/90 transition-colors">Submit & Pass</button>
            <button className="px-5 py-2 bg-danger text-white rounded-lg font-sans text-xs font-semibold hover:bg-danger/90 transition-colors">Submit & Fail</button>
            <button className="px-5 py-2 bg-surface border border-border text-text-primary rounded-lg font-sans text-xs hover:bg-bg transition-colors">Save Draft</button>
          </div>
        </div>
      )}

      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEMPLATES.map(t => {
            const tc = TYPE_CONFIG[t.type];
            return (
              <div key={t.id} className="bg-surface border border-border rounded-xl p-4 space-y-3 hover:border-brand/40 transition-colors cursor-pointer"
                onClick={() => { setSelectedTemplate(t.id); setActiveTab("new"); }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-heading text-sm font-semibold text-text-primary">{t.name}</p>
                    <p className="font-mono text-2xs text-text-tertiary mt-0.5">{t.item} · {t.parameters.length} parameters</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-mono text-2xs ${tc.bg} ${tc.color}`}>{tc.label}</span>
                </div>
                <div className="space-y-1">
                  {t.parameters.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary truncate pr-2">{p.label}</span>
                      <span className="font-mono text-2xs text-text-tertiary shrink-0">
                        {p.type === "numeric" ? `${p.min}–${p.max} ${p.unit}` : p.type}
                      </span>
                    </div>
                  ))}
                </div>
                <button className="w-full py-1.5 border border-brand text-brand rounded-lg font-sans text-xs hover:bg-brand hover:text-white transition-colors">
                  Use Template
                </button>
              </div>
            );
          })}
          <div className="bg-surface border border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand/40 transition-colors min-h-[160px]">
            <Plus size={20} className="text-text-tertiary" />
            <p className="font-sans text-xs text-text-tertiary">Create New Template</p>
          </div>
        </div>
      )}
    </div>
  );
}
