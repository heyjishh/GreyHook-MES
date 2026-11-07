"use client";

import { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { ChevronRight, ChevronDown, AlertTriangle, CheckCircle2, Package, FileDown, PlusCircle } from "lucide-react";

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

type StockStatus = "ok" | "low" | "critical" | "na";

interface BOMItem {
  id: string;
  level: number;
  partCode: string;
  description: string;
  unit: string;
  qtyPer: number;
  baseQtyRequired: number;
  stockOnHand: number;
  stockStatus: StockStatus;
  supplier: string;
  leadTimeDays: number;
  operation: string;
  children?: BOMItem[];
}

const BASE_BOM: BOMItem[] = [
  {
    id: "root",
    level: 0,
    partCode: "AP-ENGINE-MOUNT-V2",
    description: "Engine Mount Assembly V2",
    unit: "pc",
    qtyPer: 1,
    baseQtyRequired: 500,
    stockOnHand: 0,
    stockStatus: "na",
    supplier: "—",
    leadTimeDays: 0,
    operation: "—",
    children: [
      {
        id: "hsg",
        level: 1,
        partCode: "ENG-HSG-V2",
        description: "CNC Machined Housing",
        unit: "pc",
        qtyPer: 1,
        baseQtyRequired: 500,
        stockOnHand: 0,
        stockStatus: "na",
        supplier: "In-house",
        leadTimeDays: 0,
        operation: "OP-020",
        children: [
          {
            id: "ss-2",
            level: 2,
            partCode: "MAT-SS-304-2.0",
            description: "Steel Sheet 304SS 2.0mm",
            unit: "kg",
            qtyPer: 0.4,
            baseQtyRequired: 200,
            stockOnHand: 180,
            stockStatus: "low",
            supplier: "TataSteels",
            leadTimeDays: 7,
            operation: "OP-020",
          },
          {
            id: "drill",
            level: 2,
            partCode: "CONS-DRILL-10MM",
            description: "Drill Bit 10mm",
            unit: "pc",
            qtyPer: 0.03,
            baseQtyRequired: 15,
            stockOnHand: 48,
            stockStatus: "ok",
            supplier: "MahindraCutting",
            leadTimeDays: 2,
            operation: "OP-020",
          },
        ],
      },
      {
        id: "bkt",
        level: 1,
        partCode: "ENG-BKT-V2",
        description: "Press Formed Bracket",
        unit: "pc",
        qtyPer: 1,
        baseQtyRequired: 500,
        stockOnHand: 0,
        stockStatus: "na",
        supplier: "In-house",
        leadTimeDays: 0,
        operation: "OP-030",
        children: [
          {
            id: "ss-15",
            level: 2,
            partCode: "MAT-SS-304-1.5",
            description: "Steel Sheet 304SS 1.5mm",
            unit: "kg",
            qtyPer: 0.15,
            baseQtyRequired: 75,
            stockOnHand: 120,
            stockStatus: "ok",
            supplier: "TataSteels",
            leadTimeDays: 7,
            operation: "OP-030",
          },
        ],
      },
      {
        id: "wld",
        level: 1,
        partCode: "ENG-WLD-V2",
        description: "Welded Subframe",
        unit: "pc",
        qtyPer: 1,
        baseQtyRequired: 500,
        stockOnHand: 0,
        stockStatus: "na",
        supplier: "In-house",
        leadTimeDays: 0,
        operation: "OP-040",
        children: [
          {
            id: "ss-2b",
            level: 2,
            partCode: "MAT-SS-304-2.0",
            description: "Steel Sheet 304SS 2.0mm (shared)",
            unit: "kg",
            qtyPer: 0.3,
            baseQtyRequired: 150,
            stockOnHand: 180,
            stockStatus: "low",
            supplier: "TataSteels",
            leadTimeDays: 7,
            operation: "OP-040",
          },
          {
            id: "rod",
            level: 2,
            partCode: "MAT-ROD-20MM",
            description: "Steel Rod 20mm",
            unit: "kg",
            qtyPer: 0.5,
            baseQtyRequired: 250,
            stockOnHand: 310,
            stockStatus: "ok",
            supplier: "TataSteels",
            leadTimeDays: 7,
            operation: "OP-040",
          },
          {
            id: "wire",
            level: 2,
            partCode: "CONS-WIRE-ER70",
            description: "MIG Weld Wire ER70S-6",
            unit: "kg",
            qtyPer: 0.08,
            baseQtyRequired: 40,
            stockOnHand: 12,
            stockStatus: "critical",
            supplier: "WeldSupply",
            leadTimeDays: 3,
            operation: "OP-040",
          },
        ],
      },
      {
        id: "lub",
        level: 1,
        partCode: "CONS-LUBRICANT",
        description: "Assembly Grease",
        unit: "g",
        qtyPer: 2,
        baseQtyRequired: 1000,
        stockOnHand: 2200,
        stockStatus: "ok",
        supplier: "ChemStore",
        leadTimeDays: 1,
        operation: "OP-050",
      },
      {
        id: "bolt",
        level: 1,
        partCode: "HDW-BOLT-M8",
        description: "M8×25 Bolt Grade 8.8",
        unit: "pc",
        qtyPer: 4,
        baseQtyRequired: 2000,
        stockOnHand: 1850,
        stockStatus: "low",
        supplier: "FastenerHub",
        leadTimeDays: 3,
        operation: "OP-050",
      },
    ],
  },
];

function scaleQty(base: number, orderQty: number): number {
  return Math.round((base / 500) * orderQty * 100) / 100;
}

function statusConfig(s: StockStatus) {
  if (s === "ok")       return { label: "OK",       bg: T.successDim, color: T.success };
  if (s === "low")      return { label: "Low",      bg: T.warningDim, color: T.warning };
  if (s === "critical") return { label: "Critical", bg: T.dangerDim,  color: T.danger  };
  return                       { label: "N/A",      bg: T.neutralDim, color: T.neutral };
}

function flattenBOM(items: BOMItem[], expanded: Set<string>): BOMItem[] {
  const rows: BOMItem[] = [];
  for (const item of items) {
    rows.push(item);
    if (item.children && (item.level === 0 || expanded.has(item.id))) {
      rows.push(...flattenBOM(item.children, expanded));
    }
  }
  return rows;
}

function allLeaves(items: BOMItem[]): BOMItem[] {
  const leaves: BOMItem[] = [];
  for (const item of items) {
    if (item.children) leaves.push(...allLeaves(item.children));
    else leaves.push(item);
  }
  return leaves;
}

export default function BOMPage() {
  const [orderQty, setOrderQty]       = useState(500);
  const [expanded, setExpanded]       = useState<Set<string>>(new Set(["hsg", "bkt", "wld"]));
  const [exportDone, setExportDone]   = useState(false);
  const [poCreated, setPoCreated]     = useState(false);
  const [poStates, setPoStates]       = useState<Record<string, boolean>>({});

  const leaves = useMemo(() => allLeaves(BASE_BOM), []);
  const statusCounts = useMemo(() => ({
    ok:       leaves.filter(l => l.stockStatus === "ok").length,
    low:      leaves.filter(l => l.stockStatus === "low").length,
    critical: leaves.filter(l => l.stockStatus === "critical").length,
  }), [leaves]);

  const alertItems = useMemo(
    () => leaves.filter(l => l.stockStatus === "critical" || l.stockStatus === "low"),
    [leaves]
  );

  const rows = useMemo(() => flattenBOM(BASE_BOM, expanded), [expanded]);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleExport() {
    setExportDone(true);
    setTimeout(() => setExportDone(false), 2500);
  }

  function handleCreatePO() {
    setPoCreated(true);
    setTimeout(() => setPoCreated(false), 3000);
  }

  function handleItemPO(id: string) {
    setPoStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setPoStates(prev => ({ ...prev, [id]: false })), 2500);
  }

  const donutOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "item", formatter: "{b}: {c}" },
    series: [{
      type: "pie",
      radius: ["52%", "78%"],
      data: [
        { value: statusCounts.ok,       name: "OK",       itemStyle: { color: T.success } },
        { value: statusCounts.low,      name: "Low",      itemStyle: { color: T.warning } },
        { value: statusCounts.critical, name: "Critical", itemStyle: { color: T.danger  } },
      ],
      label: { show: false },
      emphasis: { scale: true, scaleSize: 4 },
    }],
  };

  return (
    <div className="flex flex-col gap-6 p-6" style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: T.text, background: T.bgSubtle, minHeight: "100vh" }}>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Familjen Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: T.text }}>
            Bill of Materials
          </h1>
          <p style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
            Component tree · stock availability · procurement status
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExport}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              border: `1px solid ${T.border}`, borderRadius: 8,
              padding: "7px 14px", fontSize: 13, fontWeight: 500,
              background: T.bg, color: exportDone ? T.success : T.text,
              cursor: "pointer",
            }}
          >
            <FileDown size={14} />
            {exportDone ? "Exported ✓" : "Export BOM"}
          </button>
          <button
            disabled
            style={{
              display: "flex", alignItems: "center", gap: 6,
              border: `1px solid ${T.border}`, borderRadius: 8,
              padding: "7px 14px", fontSize: 13, fontWeight: 500,
              background: T.bgMuted, color: T.disabled,
              cursor: "not-allowed",
            }}
          >
            Compare Revisions
          </button>
          <button
            onClick={handleCreatePO}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              border: "none", borderRadius: 8,
              padding: "7px 16px", fontSize: 13, fontWeight: 600,
              background: poCreated ? T.success : T.brand,
              color: "#fff", cursor: "pointer",
            }}
          >
            <PlusCircle size={14} />
            {poCreated ? "PO-2026-11-006 Created ✓" : "Create Production Order"}
          </button>
        </div>
      </div>

      <div
        style={{
          background: T.bg, borderRadius: 12, border: `1px solid ${T.border}`,
          padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: T.muted }}>Product</label>
          <select
            style={{
              border: `1px solid ${T.border}`, borderRadius: 8,
              padding: "6px 10px", fontSize: 13, color: T.text, background: T.bg,
            }}
          >
            <option>AP-ENGINE-MOUNT-V2 (Active)</option>
            <option>AP-BRAKE-DISC-V1 (Inactive)</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: T.muted }}>Order Qty</label>
          <input
            type="number"
            value={orderQty}
            onChange={e => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              border: `1px solid ${T.border}`, borderRadius: 8,
              padding: "6px 10px", fontSize: 13, color: T.text,
              background: T.bg, width: 90,
            }}
          />
          <span style={{ fontSize: 13, color: T.muted }}>units</span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: `${leaves.length} Line Items`, bg: T.neutralDim, color: T.neutral },
            { label: `${statusCounts.ok} OK`,       bg: T.successDim, color: T.success },
            { label: `${statusCounts.low} Low`,     bg: T.warningDim, color: T.warning },
            { label: `${statusCounts.critical} Critical`, bg: T.dangerDim, color: T.danger },
          ].map(chip => (
            <span
              key={chip.label}
              style={{
                fontSize: 12, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace",
                padding: "4px 10px", borderRadius: 20,
                background: chip.bg, color: chip.color,
              }}
            >
              {chip.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div
          className="lg:col-span-3"
          style={{ background: T.bg, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.bgMuted, borderBottom: `1px solid ${T.border}` }}>
                  {["Part Code", "Description", "Unit", "Qty/Unit", "Qty Required", "Stock On Hand", "Availability", "Supplier", "Lead Time", "Operation"].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px", textAlign: "left",
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        fontSize: 11, fontWeight: 600, color: T.muted,
                        letterSpacing: "0.04em", textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const qtyRequired = scaleQty(row.baseQtyRequired, orderQty);
                  const sc = statusConfig(row.stockStatus);
                  const hasChildren = !!row.children;
                  const isExpanded = expanded.has(row.id);
                  const indent = row.level * 20;

                  return (
                    <tr
                      key={`${row.id}-${idx}`}
                      style={{
                        borderBottom: `1px solid ${T.border}`,
                        background: row.level === 0 ? T.bgSubtle : row.level === 1 ? T.bg : T.bgSubtle,
                      }}
                    >
                      <td style={{ padding: "10px 14px", paddingLeft: 14 + indent }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {hasChildren && row.level > 0 && (
                            <button
                              onClick={() => toggleExpand(row.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: T.muted, display: "flex" }}
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          )}
                          {row.level === 0 && <Package size={14} style={{ color: T.brand, flexShrink: 0 }} />}
                          <span
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: row.level === 0 ? 13 : row.level === 1 ? 12 : 11,
                              fontWeight: row.level === 0 ? 700 : row.level === 1 ? 600 : 400,
                              color: row.level === 0 ? T.brand : T.text,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.partCode}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", color: row.level === 2 ? T.muted : T.text, fontSize: row.level === 2 ? 12 : 13 }}>
                        {row.description}
                      </td>
                      <td style={{ padding: "10px 14px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: T.muted }}>
                        {row.unit}
                      </td>
                      <td style={{ padding: "10px 14px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                        {row.stockStatus === "na" ? "—" : row.qtyPer}
                      </td>
                      <td style={{ padding: "10px 14px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600 }}>
                        {row.stockStatus === "na" ? "—" : qtyRequired}
                      </td>
                      <td style={{ padding: "10px 14px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                        {row.stockStatus === "na" ? "—" : row.stockOnHand}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {row.stockStatus !== "na" && (
                          <span
                            style={{
                              fontSize: 11, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace",
                              padding: "3px 8px", borderRadius: 12,
                              background: sc.bg, color: sc.color,
                            }}
                          >
                            {sc.label}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: T.muted, whiteSpace: "nowrap" }}>
                        {row.supplier}
                      </td>
                      <td style={{ padding: "10px 14px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: T.muted }}>
                        {row.leadTimeDays > 0 ? `${row.leadTimeDays}d` : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: T.neutral }}>
                        {row.operation !== "—" ? row.operation : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-1" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: T.bg, borderRadius: 12, border: `1px solid ${T.border}`, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Stock Availability
            </p>
            <ReactECharts option={donutOption} style={{ height: 160 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              {[
                { label: "OK",       color: T.success, count: statusCounts.ok       },
                { label: "Low Stock",color: T.warning, count: statusCounts.low      },
                { label: "Critical", color: T.danger,  count: statusCounts.critical },
              ].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, flex: 1 }}>{l.label}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, color: l.color }}>{l.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: T.bg, borderRadius: 12, border: `1px solid ${T.border}`, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Cost Estimate / Unit
            </p>
            {[
              { label: "Material Cost",    value: "₹ 24,500" },
              { label: "Labor Cost (est.)", value: "₹ 8,200"  },
              { label: "Total Est.",        value: "₹ 32,700", bold: true },
            ].map(r => (
              <div
                key={r.label}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "7px 0",
                  borderTop: r.bold ? `1px solid ${T.border}` : "none",
                  marginTop: r.bold ? 4 : 0,
                }}
              >
                <span style={{ fontSize: 12, color: r.bold ? T.text : T.muted, fontWeight: r.bold ? 600 : 400 }}>{r.label}</span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 13, fontWeight: r.bold ? 700 : 500,
                  color: r.bold ? T.brand : T.text,
                }}>
                  {r.value}
                </span>
              </div>
            ))}
            <p style={{ fontSize: 11, color: T.disabled, marginTop: 8 }}>Estimates based on last purchase prices</p>
          </div>

          <div style={{ background: T.bg, borderRadius: 12, border: `1px solid ${T.border}`, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Action Required
            </p>
            {alertItems.map(item => {
              const sc = statusConfig(item.stockStatus);
              const qtyReq = scaleQty(item.baseQtyRequired, orderQty);
              const shortfall = Math.max(0, qtyReq - item.stockOnHand);
              return (
                <div
                  key={item.id}
                  style={{
                    padding: "10px 12px", borderRadius: 8, marginBottom: 8,
                    background: sc.bg, border: `1px solid ${sc.color}22`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <AlertTriangle size={12} color={sc.color} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, color: sc.color }}>
                      {item.partCode}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: T.text, marginBottom: 6 }}>{item.description}</p>
                  <p style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>
                    Shortfall: <strong style={{ color: sc.color }}>{shortfall} {item.unit}</strong>
                    {" · "}Lead: {item.leadTimeDays}d
                  </p>
                  <button
                    onClick={() => handleItemPO(item.id)}
                    style={{
                      border: `1px solid ${T.brand}`, borderRadius: 6,
                      padding: "4px 10px", fontSize: 11, fontWeight: 600,
                      background: poStates[item.id] ? T.brandDim : T.bg,
                      color: poStates[item.id] ? T.success : T.brand,
                      cursor: "pointer", width: "100%",
                    }}
                  >
                    {poStates[item.id] ? "PO Created ✓" : "Create PO"}
                  </button>
                </div>
              );
            })}
            {alertItems.length === 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
                <CheckCircle2 size={14} color={T.success} />
                <span style={{ fontSize: 13, color: T.success }}>All materials in stock</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
