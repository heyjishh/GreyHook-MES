"use client";

import { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Search, ChevronRight, Package, Layers, Box, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

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

type NodeType = "finished" | "subassembly" | "component" | "raw_material";
type NodeStatus = "pass" | "fail" | "pending" | "scrapped";

interface TraceNode {
  id: string;
  label: string;
  type: NodeType;
  status: NodeStatus;
  lotSerial: string;
  supplier?: string;
  machine?: string;
  operation?: string;
  inspectionResult?: string;
  timestamp: string;
  children?: TraceNode[];
  quantity?: number;
}

const NODE_TYPE_COLOR: Record<NodeType, string> = {
  finished: T.success,
  subassembly: T.brand,
  component: T.warning,
  raw_material: T.neutral,
};

const MOCK_TRACES: Record<string, TraceNode> = {
  "ENG-MNT-V2-S1234": {
    id: "eng-s1234",
    label: "Engine Mount V2",
    type: "finished",
    status: "pass",
    lotSerial: "ENG-MNT-V2-S1234",
    machine: "QC Station #1",
    operation: "Final Inspection",
    inspectionResult: "PASS — All dimensions within spec",
    timestamp: "2026-11-06T13:45:00Z",
    children: [
      {
        id: "cnc-s401",
        label: "CNC Machined Housing",
        type: "subassembly",
        status: "pass",
        lotSerial: "LOT-CNH-0923",
        machine: "CNC Lathe #1",
        operation: "Rough + Finish Turn",
        inspectionResult: "PASS — Bore dia 41.5mm ✓",
        timestamp: "2026-11-06T09:20:00Z",
        children: [
          {
            id: "raw-al-002",
            label: "Aluminium 6061 Billet",
            type: "raw_material",
            status: "pass",
            lotSerial: "LOT-AL6061-7721",
            supplier: "MetalCorp India Pvt Ltd",
            inspectionResult: "PASS — COC verified",
            timestamp: "2026-11-01T08:00:00Z",
            quantity: 3,
          },
        ],
      },
      {
        id: "press-s208",
        label: "Press Formed Bracket",
        type: "subassembly",
        status: "pass",
        lotSerial: "LOT-PFB-0982",
        machine: "Press Machine #1",
        operation: "Deep Draw Press",
        inspectionResult: "PASS — Spring-back 0.8° within 1.5° limit",
        timestamp: "2026-11-05T15:30:00Z",
        children: [
          {
            id: "raw-steel-001",
            label: "Steel Sheet 2.2mm CR4",
            type: "raw_material",
            status: "pass",
            lotSerial: "LOT-SS-4411",
            supplier: "Tata Steel Coil Centre",
            inspectionResult: "PASS — Thickness 2.21mm ✓",
            timestamp: "2026-10-28T10:00:00Z",
            quantity: 12,
          },
        ],
      },
      {
        id: "weld-s077",
        label: "Welded Subframe",
        type: "subassembly",
        status: "pass",
        lotSerial: "LOT-WSF-1023",
        machine: "Welding Robot #1",
        operation: "MIG Weld Assembly",
        inspectionResult: "PASS — Weld bead 0.4mm deviation ✓",
        timestamp: "2026-11-06T11:10:00Z",
        children: [
          {
            id: "raw-steel-rod",
            label: "Steel Rod 20mm EN8",
            type: "raw_material",
            status: "pass",
            lotSerial: "LOT-SR-9922",
            supplier: "SAIL Bar & Rod",
            inspectionResult: "PASS — Hardness 52 HRC ✓",
            timestamp: "2026-10-30T09:00:00Z",
            quantity: 2,
          },
          {
            id: "raw-steel-001b",
            label: "Steel Sheet 2.2mm CR4",
            type: "raw_material",
            status: "pass",
            lotSerial: "LOT-SS-4412",
            supplier: "Tata Steel Coil Centre",
            inspectionResult: "PASS — Incoming inspection OK",
            timestamp: "2026-10-29T10:00:00Z",
            quantity: 4,
          },
        ],
      },
    ],
  },
  "ENG-MNT-V2-S1231": {
    id: "eng-s1231",
    label: "Engine Mount V2",
    type: "finished",
    status: "fail",
    lotSerial: "ENG-MNT-V2-S1231",
    machine: "QC Station #1",
    operation: "Final Inspection",
    inspectionResult: "FAIL — Bracket spring-back 2.7° > 1.5° limit → NCR-2026-083",
    timestamp: "2026-11-03T11:00:00Z",
    children: [
      {
        id: "press-s203-fail",
        label: "Press Formed Bracket",
        type: "subassembly",
        status: "fail",
        lotSerial: "LOT-PFB-0978",
        machine: "Press Machine #1",
        operation: "Deep Draw Press",
        inspectionResult: "FAIL — Spring-back 2.7° → scrapped batch",
        timestamp: "2026-11-03T10:30:00Z",
        children: [
          {
            id: "raw-steel-thin",
            label: "Steel Sheet 2.0mm (NC — wrong spec)",
            type: "raw_material",
            status: "fail",
            lotSerial: "LOT-SS-4409",
            supplier: "Alternate Steels Pvt Ltd",
            inspectionResult: "FAIL — Thickness 2.0mm vs 2.2mm nominal → supplier SCAR issued",
            timestamp: "2026-10-27T10:00:00Z",
            quantity: 12,
          },
        ],
      },
    ],
  },
  "LOT-CNH-0923": {
    id: "cnc-s401-top",
    label: "CNC Machined Housing",
    type: "subassembly",
    status: "pass",
    lotSerial: "LOT-CNH-0923",
    machine: "CNC Lathe #1",
    operation: "Rough + Finish Turn",
    inspectionResult: "PASS — Bore dia 41.5mm ✓",
    timestamp: "2026-11-06T09:20:00Z",
    children: [
      {
        id: "raw-al-002b",
        label: "Aluminium 6061 Billet",
        type: "raw_material",
        status: "pass",
        lotSerial: "LOT-AL6061-7721",
        supplier: "MetalCorp India Pvt Ltd",
        inspectionResult: "PASS — COC verified",
        timestamp: "2026-11-01T08:00:00Z",
        quantity: 3,
      },
    ],
  },
};

const RECENT_SEARCHES = ["ENG-MNT-V2-S1234", "ENG-MNT-V2-S1231", "LOT-CNH-0923"];

const NODE_TYPE_LABEL: Record<NodeType, string> = {
  finished: "Finished Part",
  subassembly: "Subassembly",
  component: "Component",
  raw_material: "Raw Material",
};

function flattenNodes(node: TraceNode): TraceNode[] {
  return [node, ...(node.children ?? []).flatMap(flattenNodes)];
}

function buildEChartsTree(node: TraceNode): object {
  const color = NODE_TYPE_COLOR[node.type];
  const statusMark = node.status === "fail" || node.status === "scrapped" ? " ✕" : node.status === "pass" ? " ✓" : "";
  return {
    name: node.label + statusMark,
    value: node.lotSerial,
    itemStyle: { color, borderColor: node.status === "fail" ? T.danger : color, borderWidth: node.status === "fail" ? 3 : 1 },
    label: { color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono" },
    children: (node.children ?? []).map(buildEChartsTree),
  };
}

function treeOption(root: TraceNode) {
  return {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: (p: { data: { value: string } }) => p.data.value,
    },
    series: [{
      type: "tree",
      data: [buildEChartsTree(root)],
      top: "10%",
      left: "5%",
      bottom: "10%",
      right: "20%",
      symbolSize: 14,
      orient: "LR",
      label: { position: "right", verticalAlign: "middle", fontSize: 11, fontFamily: "IBM Plex Mono", color: T.text },
      lineStyle: { color: T.border, width: 1.5, curveness: 0.5 },
      expandAndCollapse: false,
      initialTreeDepth: 4,
      emphasis: { focus: "descendant" },
    }],
  };
}

function StatusBadge({ status }: { status: NodeStatus }) {
  const styles: Record<NodeStatus, { bg: string; color: string; label: string }> = {
    pass: { bg: T.successDim, color: T.success, label: "PASS" },
    fail: { bg: T.dangerDim, color: T.danger, label: "FAIL" },
    pending: { bg: T.warningDim, color: T.warning, label: "PENDING" },
    scrapped: { bg: T.neutralDim, color: T.neutral, label: "SCRAPPED" },
  };
  const s = styles[status];
  return <span style={{ background: s.bg, color: s.color, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>{s.label}</span>;
}

function NodeDetail({ node }: { node: TraceNode }) {
  return (
    <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10 }} className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: NODE_TYPE_COLOR[node.type], flexShrink: 0 }} />
        <span style={{ color: T.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{NODE_TYPE_LABEL[node.type]}</span>
        <StatusBadge status={node.status} />
      </div>
      <p style={{ color: T.text, fontSize: 14, fontWeight: 700, marginBottom: 4, fontFamily: "Familjen Grotesk, sans-serif" }}>{node.label}</p>
      <p style={{ color: T.muted, fontSize: 12, fontFamily: "IBM Plex Mono", marginBottom: 10 }}>{node.lotSerial}</p>
      <div className="space-y-2 text-xs" style={{ color: T.muted }}>
        {node.supplier && <div><span style={{ fontWeight: 600, color: T.text }}>Supplier:</span> {node.supplier}</div>}
        {node.machine && <div><span style={{ fontWeight: 600, color: T.text }}>Machine:</span> {node.machine}</div>}
        {node.operation && <div><span style={{ fontWeight: 600, color: T.text }}>Operation:</span> {node.operation}</div>}
        {node.quantity !== undefined && <div><span style={{ fontWeight: 600, color: T.text }}>Qty:</span> {node.quantity} units</div>}
        {node.inspectionResult && (
          <div style={{ background: node.status === "fail" ? T.dangerDim : T.successDim, borderRadius: 6, padding: "6px 8px", marginTop: 6 }}>
            <span style={{ fontWeight: 600, color: node.status === "fail" ? T.danger : T.success }}>Inspection: </span>
            <span style={{ color: node.status === "fail" ? T.danger : T.success }}>{node.inspectionResult}</span>
          </div>
        )}
        <div style={{ color: T.disabled, fontSize: 10 }}>{new Date(node.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
      </div>
    </div>
  );
}

export default function TraceabilityPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<TraceNode | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedNode, setSelectedNode] = useState<TraceNode | null>(null);

  function search(q: string) {
    const key = q.trim().toUpperCase();
    const found = MOCK_TRACES[key];
    if (found) {
      setResult(found);
      setSelectedNode(found);
      setNotFound(false);
    } else {
      setResult(null);
      setNotFound(true);
      setSelectedNode(null);
    }
  }

  const allNodes = useMemo(() => result ? flattenNodes(result) : [], [result]);

  return (
    <div style={{ background: T.bgSubtle, minHeight: "100vh" }} className="p-6 font-sans">

      <div className="mb-6">
        <h1 style={{ color: T.text, fontFamily: "Familjen Grotesk, sans-serif", fontSize: 24 }} className="font-bold">Genealogy & Traceability</h1>
        <p style={{ color: T.muted, fontSize: 13 }} className="mt-1">Lot / serial lineage · material genealogy · full production history</p>
      </div>

      <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="p-5 mb-6 shadow-sm">
        <div className="flex gap-3 items-center">
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.muted }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search(query)}
              placeholder="Search by serial number, lot number, or work order…"
              style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px 9px 36px", fontSize: 14, color: T.text, background: T.bg, fontFamily: "IBM Plex Mono" }}
            />
          </div>
          <button onClick={() => search(query)}
            style={{ background: T.brand, color: "#fff", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, border: "none" }}>
            Trace
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span style={{ color: T.muted, fontSize: 11 }}>Recent:</span>
          {RECENT_SEARCHES.map(s => (
            <button key={s} onClick={() => { setQuery(s); search(s); }}
              style={{ background: T.bgMuted, color: T.text, border: `1px solid ${T.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontFamily: "IBM Plex Mono" }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {notFound && (
        <div style={{ background: T.warningDim, border: `1px solid ${T.warning}`, borderRadius: 10, padding: "14px 16px", color: T.warning, fontSize: 13 }} className="mb-4">
          No traceability record found for &ldquo;{query}&rdquo;. Try a different serial number or lot ID.
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

          <div className="lg:col-span-3 space-y-4">

            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: result.status === "fail" ? T.danger : T.success }} />
                <div>
                  <span style={{ color: T.text, fontSize: 16, fontWeight: 700, fontFamily: "Familjen Grotesk, sans-serif" }}>{result.label}</span>
                  <span style={{ color: T.muted, fontSize: 12, fontFamily: "IBM Plex Mono", marginLeft: 10 }}>{result.lotSerial}</span>
                </div>
                <StatusBadge status={result.status} />
              </div>

              <div className="flex gap-4 flex-wrap mb-4">
                {[
                  { label: "Total Components", value: allNodes.length },
                  { label: "Passed", value: allNodes.filter(n => n.status === "pass").length, color: T.success },
                  { label: "Failed", value: allNodes.filter(n => n.status === "fail").length, color: T.danger },
                  { label: "Suppliers", value: new Set(allNodes.filter(n => n.supplier).map(n => n.supplier)).size },
                ].map(stat => (
                  <div key={stat.label} style={{ background: T.bgMuted, borderRadius: 8, padding: "10px 14px" }}>
                    <p style={{ color: T.muted, fontSize: 10, letterSpacing: "0.06em" }} className="uppercase font-medium">{stat.label}</p>
                    <p style={{ color: stat.color ?? T.text, fontSize: 22 }} className="font-mono font-black tabular-nums">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 flex-wrap mb-3">
                {(["finished", "subassembly", "component", "raw_material"] as NodeType[]).map(t => (
                  <div key={t} className="flex items-center gap-1.5">
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: NODE_TYPE_COLOR[t] }} />
                    <span style={{ color: T.muted, fontSize: 11 }}>{NODE_TYPE_LABEL[t]}</span>
                  </div>
                ))}
              </div>

              <ReactECharts
                option={treeOption(result)}
                style={{ height: 320 }}
                onEvents={{ click: (p: { data: { value: string } }) => {
                  const found = allNodes.find(n => n.lotSerial === p.data?.value);
                  if (found) setSelectedNode(found);
                }}}
              />
            </div>

            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="p-5 shadow-sm">
              <p style={{ color: T.text, fontSize: 14, fontWeight: 600, fontFamily: "Familjen Grotesk, sans-serif", marginBottom: 12 }}>All Components ({allNodes.length})</p>
              <div className="overflow-x-auto">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["Lot / Serial", "Component", "Type", "Machine / Supplier", "Inspection", "Status", "Timestamp"].map(h => (
                        <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: T.muted, fontSize: 10, letterSpacing: "0.06em", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allNodes.map(node => (
                      <tr key={node.id} onClick={() => setSelectedNode(node)} style={{ borderBottom: `1px solid ${T.grid}`, cursor: "pointer", background: selectedNode?.id === node.id ? T.bgMuted : "transparent" }}>
                        <td style={{ padding: "7px 10px", fontFamily: "IBM Plex Mono", color: T.text, fontSize: 11 }}>{node.lotSerial}</td>
                        <td style={{ padding: "7px 10px", color: T.text }}>{node.label}</td>
                        <td style={{ padding: "7px 10px" }}>
                          <span style={{ background: T.bgMuted, color: NODE_TYPE_COLOR[node.type], borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 600 }}>{NODE_TYPE_LABEL[node.type]}</span>
                        </td>
                        <td style={{ padding: "7px 10px", color: T.muted }}>{node.machine ?? node.supplier ?? "—"}</td>
                        <td style={{ padding: "7px 10px", color: T.muted, maxWidth: 200 }}>{node.inspectionResult ? node.inspectionResult.slice(0, 50) + (node.inspectionResult.length > 50 ? "…" : "") : "—"}</td>
                        <td style={{ padding: "7px 10px" }}><StatusBadge status={node.status} /></td>
                        <td style={{ padding: "7px 10px", color: T.disabled, fontSize: 10, fontFamily: "IBM Plex Mono" }}>{new Date(node.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            {selectedNode && <NodeDetail node={selectedNode} />}

            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="p-4 shadow-sm">
              <p style={{ color: T.text, fontSize: 13, fontWeight: 600, fontFamily: "Familjen Grotesk, sans-serif", marginBottom: 10 }}>All Nodes</p>
              <div className="space-y-1">
                {allNodes.map(node => (
                  <button key={node.id} onClick={() => setSelectedNode(node)}
                    style={{ width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 6, background: selectedNode?.id === node.id ? T.bgMuted : "transparent", border: "none", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: NODE_TYPE_COLOR[node.type], flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.lotSerial}</p>
                      <p style={{ color: T.muted, fontSize: 10 }}>{node.label}</p>
                    </div>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: node.status === "fail" ? T.danger : T.success, flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!result && !notFound && (
        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }} className="p-10 text-center shadow-sm">
          <Layers size={36} style={{ color: T.disabled, margin: "0 auto 12px" }} />
          <p style={{ color: T.text, fontSize: 16, fontWeight: 600, fontFamily: "Familjen Grotesk, sans-serif" }}>Enter a serial or lot number to trace</p>
          <p style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>Try <span style={{ fontFamily: "IBM Plex Mono", color: T.text }}>ENG-MNT-V2-S1234</span> for a full pass trace, or <span style={{ fontFamily: "IBM Plex Mono", color: T.danger }}>ENG-MNT-V2-S1231</span> for a failure example.</p>
        </div>
      )}
    </div>
  );
}
