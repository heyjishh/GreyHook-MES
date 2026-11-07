"use client";

import { useState } from "react";
import {
  BookMarked,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  FileText,
  ChevronDown,
  ChevronUp,
  Eye,
  Download,
  Edit3,
  User,
  Calendar,
  Tag,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

type DocType = "work_instruction" | "sop" | "form" | "drawing" | "specification";
type DocStatus = "active" | "draft" | "review" | "obsolete";

interface DocumentRevision {
  rev: string;
  date: string;
  author: string;
  note: string;
  approvedBy?: string;
}

interface Document {
  id: string;
  title: string;
  type: DocType;
  status: DocStatus;
  currentRev: string;
  area: string;
  relatedOp?: string;
  owner: string;
  approvedBy?: string;
  effectiveDate?: string;
  reviewDue?: string;
  tags: string[];
  content: string[];
  revisions: DocumentRevision[];
}

const DOCUMENTS: Document[] = [
  {
    id: "WI-MC04-BOR-001",
    title: "Boring Centre MC-04 — Shaft Boring Operation",
    type: "work_instruction",
    status: "active",
    currentRev: "C",
    area: "Machining — Line 3",
    relatedOp: "Precision Shaft Turning",
    owner: "Eng. Patel",
    approvedBy: "Mgr. Sharma",
    effectiveDate: "2026-10-30",
    reviewDue: "2027-10-30",
    tags: ["machining", "boring", "shaft", "MC-04"],
    content: [
      "1. SAFETY: Ensure machine guard is in place and E-stop tested before starting. PPE: safety glasses, steel-toed footwear.",
      "2. SETUP: Load workpiece into 3-jaw chuck. Verify runout ≤ 0.05 mm TIR with dial gauge.",
      "3. TOOLING: Insert boring bar with certified insert. Check insert condition — replace every 150 pcs or at first sign of vibration.",
      "4. PARAMETERS: Spindle 850 RPM, feed 0.25 mm/rev, depth of cut 2.5 mm per pass. Set per Recipe PST-GA-001 v3.2.",
      "5. FIRST-OFF: Run first piece. Measure bore with CMM. Record on traveller card. Only proceed if within 39.985–40.015 mm.",
      "6. IN-PROCESS: Measure every 10th part. Record on SPC chart. Notify supervisor if 2 consecutive readings approach control limit.",
      "7. TOOL CHANGE: Replace insert every 150 pcs. Log insert batch number on traveller card. Do not extend interval without written approval.",
      "8. COMPLETION: Move finished parts to Inspection tray. Attach traveller card. Update part count in MES.",
    ],
    revisions: [
      { rev: "C", date: "2026-10-30", author: "Eng. Patel", approvedBy: "Mgr. Sharma", note: "Restored tool change interval to 150 pcs. Added mandatory written approval for interval changes. (CAPA-2026-041 action item ACT-041-02)" },
      { rev: "B", date: "2026-04-01", author: "Eng. Kumar", approvedBy: "Mgr. Sharma", note: "Updated spindle speed range after tooling upgrade to 800–900 RPM." },
      { rev: "A", date: "2025-11-20", author: "Eng. Patel", approvedBy: "Mgr. Sharma", note: "Initial release." },
    ],
  },
  {
    id: "SOP-ASM-PRESS-001",
    title: "Press Fit Operations — Assembly Line 1 SOP",
    type: "sop",
    status: "active",
    currentRev: "B",
    area: "Assembly — Line 1",
    relatedOp: "Brake Disc Assembly",
    owner: "Eng. Nair",
    approvedBy: "Mgr. Sharma",
    effectiveDate: "2026-11-01",
    reviewDue: "2027-11-01",
    tags: ["assembly", "press fit", "brake disc", "P-02"],
    content: [
      "1. PRE-START: Verify press P-02 calibration sticker current. Confirm force transducer zero reading before operation.",
      "2. PART LOADING: Scan disc and hub lot barcodes before loading into press. MES will confirm BOM match.",
      "3. PRESS OPERATION: Select recipe on HMI press panel. Engage — do NOT hold force button manually. Record is automatic.",
      "4. FORCE VERIFICATION: MES captures peak force every cycle. If force outside 28–45 kN, MES will halt and prompt NCR.",
      "5. POST-PRESS: Visually inspect joint for any cracking or misalignment. Remove part from press immediately after cycle.",
      "6. NON-CONFORMANCE: Parts with force outside spec are quarantined. Do not attempt re-press without engineering approval.",
    ],
    revisions: [
      { rev: "B", date: "2026-11-01", author: "Eng. Nair", approvedBy: "Mgr. Sharma", note: "Updated to reflect automatic force capture via transducer. Removed manual sampling log step. (CAPA-2026-039 action items ACT-039-01, ACT-039-02)" },
      { rev: "A", date: "2026-06-01", author: "Eng. Nair", approvedBy: "Mgr. Sharma", note: "Initial release." },
    ],
  },
  {
    id: "FORM-QC-EBR-REV",
    title: "EBR Review Checklist — QC Supervisor Sign-off",
    type: "form",
    status: "active",
    currentRev: "A",
    area: "Quality",
    owner: "QC Singh",
    approvedBy: "Mgr. Nair",
    effectiveDate: "2026-09-01",
    reviewDue: "2027-09-01",
    tags: ["quality", "EBR", "review", "checklist"],
    content: [
      "□ All steps completed and operator-signed.",
      "□ All CPP readings within specification limits.",
      "□ Deviations (if any): formally raised with deviation number, supervisor approval documented.",
      "□ Material lot numbers captured for all components.",
      "□ Yield and scrap counts verified against production count.",
      "□ No outstanding hold tags on batch.",
      "□ CMM or final inspection result attached.",
      "□ Reviewer signature and date — see signature block below.",
    ],
    revisions: [
      { rev: "A", date: "2026-09-01", author: "QC Singh", approvedBy: "Mgr. Nair", note: "Initial release aligned to EBR digital rollout." },
    ],
  },
  {
    id: "WI-MLD-HP07-001",
    title: "Hydraulic Mould Press HP-07 — Rubber Moulding Work Instruction",
    type: "work_instruction",
    status: "review",
    currentRev: "B-draft",
    area: "Rubber Moulding — Cell 7",
    relatedOp: "Engine Mount Moulding",
    owner: "Eng. Desai",
    tags: ["moulding", "rubber", "HP-07", "engine mount"],
    content: [
      "1. SAFETY: Press area must be clear before initiating cure cycle. Heat hazard — use insulated gloves at all times.",
      "2. RECIPE LOCK: Do not modify press temperature or time parameters. All recipe changes require engineering password (ECO required). See MOC-2026-09.",
      "3. COMPOUND PREP: Weigh compound per formula sheet F-EM220-NVH. Record batch weight on traveller card.",
      "4. MOULDING: Transfer compound to mould. Initiate press cycle via HMI. Confirm set point: 180°C, 12 min.",
      "5. CURE MONITORING: MES monitors temp and time. Any deviation will trigger automatic alert and log event.",
      "6. DEMOULDING: After cycle completes and press opens, demould using release tool. Avoid distorting part.",
      "7. INSPECTION: Hardness check — 1 pc per batch. Record on traveller card. Must be within shore A 55–65.",
    ],
    revisions: [
      { rev: "B-draft", date: "2026-10-20", author: "Eng. Desai", note: "Under review — added recipe lock instruction and MOC reference after CAPA-2026-033." },
      { rev: "A", date: "2025-08-15", author: "Eng. Desai", approvedBy: "Mgr. Sharma", note: "Initial release." },
    ],
  },
  {
    id: "SPEC-SH4400-001",
    title: "Shaft Assembly SH-4400 — Engineering Specification",
    type: "specification",
    status: "active",
    currentRev: "4",
    area: "Engineering",
    owner: "Eng. Patel",
    approvedBy: "Mgr. Sharma",
    effectiveDate: "2026-09-01",
    reviewDue: "2028-09-01",
    tags: ["specification", "shaft", "SH-4400", "drawing"],
    content: [
      "Material: 4140 Alloy Steel, heat treated per AMS 2759/1.",
      "Finished Bore Dia: 40.000 mm ± 0.015 mm (IT7 tolerance).",
      "Surface Finish Ra: 0.8 µm max on bore; 1.6 µm on external surfaces.",
      "Hardness: 28–34 HRC.",
      "Runout: 0.05 mm TIR max on finished bore w.r.t. datum A.",
      "Marking: Part number, revision, heat number, and date of manufacture per QP-003.",
      "Related Drawing: DWG-SH4400-R4 (released 2026-09-01).",
    ],
    revisions: [
      { rev: "4", date: "2026-09-01", author: "Eng. Patel", approvedBy: "Mgr. Sharma", note: "Tightened bore tolerance from ±0.020 to ±0.015 per customer ECN-2026-44." },
      { rev: "3", date: "2025-06-15", author: "Eng. Patel", approvedBy: "Mgr. Sharma", note: "Updated hardness specification." },
    ],
  },
];

const DOC_TYPE_CONFIG: Record<DocType, { label: string; color: string }> = {
  work_instruction: { label: "Work Instruction", color: "text-brand bg-brand/10 border-brand/20" },
  sop:              { label: "SOP",              color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  form:             { label: "Form",             color: "text-teal-500 bg-teal-500/10 border-teal-500/20" },
  drawing:          { label: "Drawing",          color: "text-text-secondary bg-surface border-border" },
  specification:    { label: "Specification",    color: "text-warning bg-warning/10 border-warning/20" },
};

const STATUS_CONFIG: Record<DocStatus, { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  active:   { label: "Active",    color: "text-success bg-success/10 border-success/20", icon: CheckCircle2 },
  draft:    { label: "Draft",     color: "text-warning bg-warning/10 border-warning/20", icon: Edit3 },
  review:   { label: "In Review", color: "text-brand bg-brand/10 border-brand/20",       icon: Eye },
  obsolete: { label: "Obsolete",  color: "text-text-disabled bg-surface border-border",  icon: Lock },
};

export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string>("WI-MC04-BOR-001");
  const [tab, setTab] = useState<"content" | "history">("content");
  const [expandedRev, setExpandedRev] = useState<string | null>(null);

  const filtered = DOCUMENTS.filter((d) => {
    const matchSearch =
      !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.id.toLowerCase().includes(search.toLowerCase()) ||
      d.tags.some((t) => t.includes(search.toLowerCase()));
    const matchType = typeFilter === "all" || d.type === typeFilter;
    return matchSearch && matchType;
  });

  const doc = DOCUMENTS.find((d) => d.id === selectedId) ?? DOCUMENTS[0];
  const TypeCfg = DOC_TYPE_CONFIG[doc.type];
  const StatusCfg = STATUS_CONFIG[doc.status];
  const StatusIcon = StatusCfg.icon;

  const needsReview = doc.reviewDue && new Date(doc.reviewDue) < new Date("2027-02-01");

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-lg font-bold text-text-primary">Document Control</h1>
            <p className="font-sans text-xs text-text-secondary mt-0.5">
              Controlled work instructions, SOPs, forms, and specifications with revision management
            </p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white font-sans text-xs font-semibold hover:bg-brand/90 transition-colors shrink-0">
            <Plus size={13} />
            New Document
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* List */}
        <div className="hidden md:flex w-72 shrink-0 flex-col border-r border-border">
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-disabled" />
              <input
                className="w-full pl-7 pr-2 py-1.5 bg-surface border border-border rounded-lg font-sans text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand"
                placeholder="Search title, ID, tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg font-sans text-xs text-text-primary focus:outline-none focus:border-brand"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All types</option>
              <option value="work_instruction">Work Instructions</option>
              <option value="sop">SOPs</option>
              <option value="form">Forms</option>
              <option value="specification">Specifications</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {filtered.map((d) => {
              const sc = STATUS_CONFIG[d.status];
              const tc = DOC_TYPE_CONFIG[d.type];
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 mx-1 rounded-lg transition-colors",
                    selectedId === d.id ? "bg-brand/8 border border-brand/20" : "hover:bg-surface"
                  )}
                  style={{ width: "calc(100% - 8px)" }}
                >
                  <div className="flex items-start gap-2 mb-0.5">
                    <FileText size={12} className="text-text-disabled shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-sans text-xs font-semibold text-text-primary truncate">{d.title}</div>
                      <div className="font-mono text-2xs text-text-disabled">{d.id} · Rev {d.currentRev}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={cn("px-1.5 py-0.5 rounded text-2xs border", tc.color)}>{tc.label}</span>
                    <span className={cn("px-1.5 py-0.5 rounded text-2xs border", sc.color)}>{sc.label}</span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center font-sans text-xs text-text-disabled">No documents match.</div>
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border", StatusCfg.color)}>
                    <StatusIcon size={10} />
                    {StatusCfg.label}
                  </span>
                  <span className={cn("px-2 py-0.5 rounded text-xs border", TypeCfg.color)}>{TypeCfg.label}</span>
                  <span className="font-mono text-xs text-text-disabled">{doc.id}</span>
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface border border-border text-text-secondary">
                    Rev {doc.currentRev}
                  </span>
                </div>
                <h2 className="font-heading text-base font-bold text-text-primary">{doc.title}</h2>
                <p className="font-sans text-xs text-text-secondary mt-0.5">{doc.area}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-sans text-text-secondary hover:border-brand hover:text-brand transition-colors">
                  <Printer size={12} /> Print
                </button>
                <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-sans text-text-secondary hover:border-brand hover:text-brand transition-colors">
                  <Download size={12} /> Export PDF
                </button>
                {doc.status === "active" && (
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand text-brand text-xs font-sans hover:bg-brand/5 transition-colors">
                    <Edit3 size={12} /> Edit Draft
                  </button>
                )}
                {doc.status === "review" && (
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-success text-white text-xs font-sans font-semibold hover:bg-success/90 transition-colors">
                    <CheckCircle2 size={12} /> Approve
                  </button>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: User,     label: `Owner: ${doc.owner}` },
                { icon: CheckCircle2, label: doc.approvedBy ? `Approved: ${doc.approvedBy}` : "Not yet approved" },
                { icon: Calendar, label: doc.effectiveDate ? `Effective: ${doc.effectiveDate}` : "Not effective" },
                { icon: Clock,    label: doc.reviewDue ? `Review due: ${doc.reviewDue}` : "No review date" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border font-sans text-xs text-text-secondary">
                  <Icon size={11} className="text-text-disabled" />
                  {label}
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <Tag size={11} className="text-text-disabled" />
              {doc.tags.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-surface border border-border font-mono text-2xs text-text-secondary">
                  {t}
                </span>
              ))}
            </div>

            {/* Review alert */}
            {needsReview && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-warning/5 border border-warning/20">
                <AlertTriangle size={12} className="text-warning shrink-0" />
                <p className="font-sans text-xs text-text-secondary">
                  <strong className="text-warning">Periodic review due {doc.reviewDue}.</strong> Assign reviewer before expiry to keep document active.
                </p>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-border gap-5">
              {(["content", "history"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "pb-2 font-sans text-xs font-medium border-b-2 -mb-px transition-colors capitalize",
                    tab === t ? "border-brand text-brand" : "border-transparent text-text-secondary hover:text-text-primary"
                  )}
                >
                  {t === "history" ? "Revision History" : "Document Content"}
                </button>
              ))}
            </div>

            {tab === "content" && (
              <div className="rounded-xl border border-border bg-surface p-5">
                <div className="space-y-3">
                  {doc.content.map((line, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-bg border border-border flex items-center justify-center font-mono text-2xs text-text-disabled shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="font-sans text-sm text-text-primary leading-relaxed">{line}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="flex items-center justify-between font-mono text-2xs text-text-disabled">
                    <span>{doc.id} · Rev {doc.currentRev} · Effective {doc.effectiveDate ?? "Pending"}</span>
                    <span>Approved: {doc.approvedBy ?? "Pending"}</span>
                  </div>
                </div>
              </div>
            )}

            {tab === "history" && (
              <div className="relative pl-4">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
                {doc.revisions.map((rev, i) => (
                  <div key={rev.rev} className="relative mb-4 last:mb-0">
                    <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-bg border-2 border-brand" />
                    <div className="pl-3">
                      <button
                        className="w-full text-left"
                        onClick={() => setExpandedRev(expandedRev === rev.rev ? null : rev.rev)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-brand">Rev {rev.rev}</span>
                          <span className="font-mono text-2xs text-text-disabled">{rev.date}</span>
                          <span className="font-mono text-2xs text-text-tertiary">{rev.author}</span>
                          {i === 0 && (
                            <span className="ml-auto font-mono text-2xs px-1.5 py-0.5 rounded bg-brand/10 text-brand border border-brand/20">
                              CURRENT
                            </span>
                          )}
                          {expandedRev === rev.rev ? <ChevronUp size={11} className="text-text-disabled" /> : <ChevronDown size={11} className="text-text-disabled" />}
                        </div>
                      </button>
                      {expandedRev === rev.rev && (
                        <div className="mt-2 space-y-1">
                          <p className="font-sans text-xs text-text-secondary">{rev.note}</p>
                          {rev.approvedBy && (
                            <p className="font-mono text-2xs text-text-disabled">Approved by: {rev.approvedBy}</p>
                          )}
                        </div>
                      )}
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
