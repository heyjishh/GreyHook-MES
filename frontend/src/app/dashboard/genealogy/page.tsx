"use client";

import { useState } from "react";
import {
  GitBranch,
  Search,
  ChevronRight,
  ChevronDown,
  Package,
  Layers,
  Tag,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Calendar,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

type LotQuality = "pass" | "fail" | "quarantine" | "pending";
type NodeType = "raw_material" | "sub_assembly" | "finished_good" | "component";

interface GenealogyNode {
  id: string;
  lotNo: string;
  itemCode: string;
  description: string;
  type: NodeType;
  qty: number;
  unit: string;
  quality: LotQuality;
  supplier?: string;
  receivedOn?: string;
  producedOn?: string;
  line?: string;
  operator?: string;
  woRef?: string;
  expiryDate?: string;
  serialNos?: string[];
  children: GenealogyNode[];
}

const TREE_DATA: GenealogyNode[] = [
  {
    id: "FG-001",
    lotNo: "BN-2026-11-0892",
    itemCode: "SH-4400",
    description: "Shaft Assembly SH-4400",
    type: "finished_good",
    qty: 50,
    unit: "pcs",
    quality: "pass",
    producedOn: "2026-11-06",
    line: "Line 3 — CNC Bay",
    operator: "Rajan M.",
    woRef: "PO-2026-11-0124",
    children: [
      {
        id: "SA-001",
        lotNo: "SUB-2026-11-0045",
        itemCode: "SH-4400-BAR",
        description: "Turned Bar Stock",
        type: "sub_assembly",
        qty: 50,
        unit: "pcs",
        quality: "pass",
        producedOn: "2026-11-06",
        line: "Line 3 — MC-04",
        operator: "Rajan M.",
        children: [
          {
            id: "RM-001",
            lotNo: "RM-4140-2026-1142",
            itemCode: "4140-BAR-42MM",
            description: "4140 Alloy Steel Bar ø42mm",
            type: "raw_material",
            qty: 85,
            unit: "kg",
            quality: "pass",
            supplier: "Bharat Steel Corp",
            receivedOn: "2026-10-28",
            children: [],
          },
        ],
      },
      {
        id: "CM-001",
        lotNo: "COMP-INS-2026-442",
        itemCode: "CNMG432-KMT",
        description: "CNMG Insert Set (Kennametal)",
        type: "component",
        qty: 2,
        unit: "sets",
        quality: "pass",
        supplier: "Kennametal India",
        receivedOn: "2026-11-01",
        children: [],
      },
    ],
  },
];

const TREE_DATA_2: GenealogyNode[] = [
  {
    id: "FG-002",
    lotNo: "BN-2026-11-0891",
    itemCode: "BD-700",
    description: "Brake Disc BD-700",
    type: "finished_good",
    qty: 100,
    unit: "pcs",
    quality: "pass",
    producedOn: "2026-11-05",
    line: "Line 1 — Assembly",
    operator: "Amit K.",
    woRef: "PO-2026-11-0119",
    children: [
      {
        id: "CM-002",
        lotNo: "COMP-DISC-2026-087",
        itemCode: "DISC-RAW-700",
        description: "Raw Brake Disc Casting",
        type: "raw_material",
        qty: 100,
        unit: "pcs",
        quality: "pass",
        supplier: "Eastern Castings Pvt Ltd",
        receivedOn: "2026-10-30",
        children: [],
      },
      {
        id: "CM-003",
        lotNo: "COMP-HUB-2026-033",
        itemCode: "HUB-BRKT-700",
        description: "Hub Bracket Sub-assy",
        type: "sub_assembly",
        qty: 100,
        unit: "pcs",
        quality: "quarantine",
        producedOn: "2026-10-29",
        line: "Line 2",
        children: [
          {
            id: "RM-002",
            lotNo: "RM-CAST-2026-887",
            itemCode: "CAST-IRON-HUB",
            description: "Cast Iron Hub Blank",
            type: "raw_material",
            qty: 110,
            unit: "pcs",
            quality: "fail",
            supplier: "Deccan Foundries",
            receivedOn: "2026-10-20",
            children: [],
          },
        ],
      },
      {
        id: "CM-004",
        lotNo: "COMP-FAST-2026-991",
        itemCode: "FK-7001-A",
        description: "Fastener Kit FK-7001-A",
        type: "component",
        qty: 100,
        unit: "sets",
        quality: "pass",
        supplier: "Sundram Fasteners",
        receivedOn: "2026-11-02",
        children: [],
      },
    ],
  },
];

const LOTS: { id: string; label: string; tree: GenealogyNode[] }[] = [
  { id: "BN-2026-11-0892", label: "BN-2026-11-0892 — Shaft SH-4400", tree: TREE_DATA },
  { id: "BN-2026-11-0891", label: "BN-2026-11-0891 — Brake Disc BD-700", tree: TREE_DATA_2 },
];

const QUALITY_CONFIG: Record<LotQuality, { icon: React.ComponentType<{ size?: number; className?: string }>; color: string; label: string }> = {
  pass:       { icon: CheckCircle2, color: "text-success",        label: "Pass" },
  fail:       { icon: XCircle,      color: "text-danger",         label: "Fail" },
  quarantine: { icon: AlertTriangle,color: "text-warning",        label: "Quarantine" },
  pending:    { icon: Clock,        color: "text-text-disabled",  label: "Pending" },
};

const TYPE_CONFIG: Record<NodeType, { label: string; color: string }> = {
  raw_material:  { label: "Raw Material",  color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  sub_assembly:  { label: "Sub-Assembly",  color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  finished_good: { label: "Finished Good", color: "bg-success/10 text-success border-success/20" },
  component:     { label: "Component",     color: "bg-brand/10 text-brand border-brand/20" },
};

function TreeNode({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: GenealogyNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const QCfg = QUALITY_CONFIG[node.quality];
  const QIcon = QCfg.icon;
  const TCfg = TYPE_CONFIG[node.type];

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors hover:bg-surface",
          selectedId === node.id && "bg-brand/8 border border-brand/20"
        )}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        onClick={() => onSelect(node.id)}
      >
        {/* Expand toggle */}
        <button
          className="shrink-0 w-4 h-4 flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); setExpanded((x) => !x); }}
        >
          {hasChildren ? (
            expanded ? <ChevronDown size={12} className="text-text-disabled" /> : <ChevronRight size={12} className="text-text-disabled" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-border" />
          )}
        </button>

        <QIcon size={12} className={QCfg.color} />

        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-text-primary">{node.lotNo}</span>
          <span className="font-sans text-xs text-text-secondary truncate">{node.description}</span>
        </div>

        <span className={cn("px-1.5 py-0.5 rounded text-2xs border shrink-0", TCfg.color)}>
          {TCfg.label}
        </span>
        <span className="font-mono text-2xs text-text-disabled shrink-0">{node.qty} {node.unit}</span>
      </div>

      {expanded && hasChildren && (
        <div className="relative">
          <div
            className="absolute top-0 bottom-0 w-px bg-border"
            style={{ left: `${depth * 20 + 20}px` }}
          />
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function findNode(nodes: GenealogyNode[], id: string): GenealogyNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

function NodeDetail({ node }: { node: GenealogyNode }) {
  const QCfg = QUALITY_CONFIG[node.quality];
  const QIcon = QCfg.icon;
  const TCfg = TYPE_CONFIG[node.type];

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={cn("px-2 py-0.5 rounded text-xs border", TCfg.color)}>{TCfg.label}</span>
          <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs border", node.quality === "pass" ? "text-success bg-success/10 border-success/20" : node.quality === "fail" ? "text-danger bg-danger/10 border-danger/20" : "text-warning bg-warning/10 border-warning/20")}>
            <QIcon size={10} />
            {QCfg.label}
          </span>
        </div>
        <h3 className="font-heading text-sm font-bold text-text-primary">{node.description}</h3>
        <p className="font-mono text-xs text-text-disabled">{node.lotNo} · {node.itemCode}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Quantity",   value: `${node.qty} ${node.unit}` },
          { label: "Type",       value: TCfg.label },
          node.supplier   ? { label: "Supplier",   value: node.supplier }   : null,
          node.receivedOn ? { label: "Received",   value: node.receivedOn } : null,
          node.producedOn ? { label: "Produced",   value: node.producedOn } : null,
          node.line       ? { label: "Line",        value: node.line }       : null,
          node.operator   ? { label: "Operator",   value: node.operator }   : null,
          node.woRef      ? { label: "Work Order", value: node.woRef }      : null,
        ].filter((x): x is { label: string; value: string } => x !== null).map(({ label, value }) => (
          <div key={label} className="p-2 rounded-lg bg-surface border border-border">
            <div className="font-mono text-2xs text-text-disabled">{label}</div>
            <div className="font-sans text-xs font-medium text-text-primary truncate">{value}</div>
          </div>
        ))}
      </div>

      {node.quality === "fail" && (
        <div className="p-3 rounded-lg bg-danger/5 border border-danger/20 font-sans text-xs text-danger">
          <strong>Failed lot — quarantine or scrap disposition required.</strong> Check NCM records for this lot.
        </div>
      )}
      {node.quality === "quarantine" && (
        <div className="p-3 rounded-lg bg-warning/5 border border-warning/20 font-sans text-xs text-warning">
          <strong>Lot under quarantine.</strong> Do not consume until QC disposition is complete.
        </div>
      )}

      {node.children.length > 0 && (
        <div>
          <div className="font-sans text-2xs text-text-disabled uppercase tracking-widest mb-2">Components ({node.children.length})</div>
          <div className="space-y-1">
            {node.children.map((c) => {
              const CQ = QUALITY_CONFIG[c.quality];
              const CQIcon = CQ.icon;
              return (
                <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface border border-border">
                  <CQIcon size={11} className={CQ.color} />
                  <span className="font-mono text-2xs text-text-secondary truncate">{c.lotNo}</span>
                  <span className="font-sans text-2xs text-text-disabled truncate">{c.description}</span>
                  <span className="font-mono text-2xs text-text-disabled ml-auto">{c.qty} {c.unit}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GenealogyPage() {
  const [selectedLot, setSelectedLot] = useState<string>("BN-2026-11-0892");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<"upstream" | "downstream">("upstream");

  const lot = LOTS.find((l) => l.id === selectedLot) ?? LOTS[0];
  const selectedNode = selectedNodeId ? findNode(lot.tree, selectedNodeId) : null;

  const failedNodes: GenealogyNode[] = [];
  function collectFailed(nodes: GenealogyNode[]) {
    nodes.forEach((n) => {
      if (n.quality === "fail" || n.quality === "quarantine") failedNodes.push(n);
      collectFailed(n.children);
    });
  }
  collectFailed(lot.tree);

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-lg font-bold text-text-primary">Genealogy Tree</h1>
            <p className="font-sans text-xs text-text-secondary mt-0.5">
              Upstream/downstream lot traceability — raw materials through finished goods
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-surface border border-border shrink-0">
            {(["upstream", "downstream"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1 rounded-md font-sans text-xs font-medium capitalize transition-colors",
                  direction === d ? "bg-brand text-white" : "text-text-secondary hover:text-text-primary"
                )}
              >
                {d === "upstream" ? <ArrowLeft size={10} /> : <ArrowRight size={10} />}
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Controls & tree */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <select
              className="flex-1 px-2 py-1.5 bg-surface border border-border rounded-lg font-mono text-xs text-text-primary focus:outline-none focus:border-brand"
              value={selectedLot}
              onChange={(e) => { setSelectedLot(e.target.value); setSelectedNodeId(null); }}
            >
              {LOTS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-disabled" />
              <input
                className="pl-7 pr-2 py-1.5 w-36 bg-surface border border-border rounded-lg font-sans text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand"
                placeholder="Search lot..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Quality alert */}
          {failedNodes.length > 0 && (
            <div className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-danger/5 border border-danger/20">
              <AlertTriangle size={12} className="text-danger shrink-0" />
              <p className="font-sans text-xs text-text-secondary">
                <strong className="text-danger">{failedNodes.length} failed/quarantined lot{failedNodes.length > 1 ? "s" : ""}</strong> in this genealogy — potential quality impact on finished goods.
              </p>
            </div>
          )}

          {/* Tree */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                {(["pass", "fail", "quarantine", "pending"] as LotQuality[]).map((q) => {
                  const cfg = QUALITY_CONFIG[q];
                  const Icon = cfg.icon;
                  return (
                    <div key={q} className="flex items-center gap-1 font-mono text-2xs text-text-disabled">
                      <Icon size={10} className={cfg.color} />
                      {cfg.label}
                    </div>
                  );
                })}
              </div>
            </div>
            {lot.tree.map((root) => (
              <TreeNode
                key={root.id}
                node={root}
                depth={0}
                selectedId={selectedNodeId}
                onSelect={setSelectedNodeId}
              />
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="w-72 shrink-0 overflow-y-auto">
          <div className="p-4">
            {selectedNode ? (
              <NodeDetail node={selectedNode} />
            ) : (
              <div className="text-center py-12">
                <GitBranch size={32} className="text-text-disabled mx-auto mb-3" />
                <p className="font-sans text-xs text-text-secondary">Select a lot in the tree to view details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
