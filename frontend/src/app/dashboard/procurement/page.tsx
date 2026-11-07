"use client";

import { useState } from "react";
import ReactECharts from "echarts-for-react";
import { PLANTS } from "@/lib/enterprise-config";
import {
  ShoppingCart,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Factory,
  TrendingDown,
  Star,
  FileText,
} from "lucide-react";

type POStatus = "Open" | "Received" | "Pending Approval" | "Cancelled";
type POPriority = "Critical" | "High" | "Normal" | "Low";

interface PurchaseOrder {
  id: string;
  supplier: string;
  material: string;
  category: string;
  plantId: string;
  qty: string;
  value: string;
  requested: string;
  expected: string;
  status: POStatus;
  priority: POPriority;
}

const POS: PurchaseOrder[] = [
  { id: "PO-2026-1142", supplier: "Tata Steel",    material: "HR Coil 2mm",          category: "Raw Material", plantId: "plant-chennai",    qty: "500 kg",     value: "₹2.8L",  requested: "Nov 1",  expected: "Nov 10", status: "Open",             priority: "High"     },
  { id: "PO-2026-1141", supplier: "Cipla APIs",    material: "Paracetamol Base",     category: "Raw Material", plantId: "plant-hyderabad",  qty: "200 kg",     value: "₹8.4L",  requested: "Nov 2",  expected: "Nov 8",  status: "Received",         priority: "Critical" },
  { id: "PO-2026-1139", supplier: "Molex India",   material: "PCB Connectors",       category: "Consumables",  plantId: "plant-bangalore",  qty: "5,000 pcs",  value: "₹1.2L",  requested: "Oct 30", expected: "Nov 5",  status: "Received",         priority: "Normal"   },
  { id: "PO-2026-1138", supplier: "GCT Textiles",  material: "Polyester Yarn",       category: "Raw Material", plantId: "plant-pune",       qty: "2,000 kg",   value: "₹4.6L",  requested: "Oct 28", expected: "Nov 12", status: "Open",             priority: "Normal"   },
  { id: "PO-2026-1137", supplier: "Castrol MRO",   material: "Lubricants",           category: "MRO",          plantId: "plant-chennai",    qty: "50 L",       value: "₹0.4L",  requested: "Nov 3",  expected: "Nov 6",  status: "Open",             priority: "Low"      },
  { id: "PO-2026-1136", supplier: "Bosch India",   material: "Spare Parts (CNC)",    category: "Spare Parts",  plantId: "plant-chennai",    qty: "12 pcs",     value: "₹3.1L",  requested: "Oct 25", expected: "Nov 15", status: "Pending Approval", priority: "High"     },
  { id: "PO-2026-1135", supplier: "Sun Pharma",    material: "Excipients",           category: "Raw Material", plantId: "plant-hyderabad",  qty: "100 kg",     value: "₹2.9L",  requested: "Oct 20", expected: "Nov 20", status: "Open",             priority: "Normal"   },
  { id: "PO-2026-1134", supplier: "Hirose Japan",  material: "SMT Connectors",       category: "Consumables",  plantId: "plant-bangalore",  qty: "10,000 pcs", value: "₹5.6L",  requested: "Nov 4",  expected: "Nov 18", status: "Pending Approval", priority: "High"     },
];

const SUPPLIERS = [
  { name: "Cipla APIs",   category: "Pharma Raw",   otif: 98,  quality: 99.1, lead: 6,  lastPO: "Nov 2" },
  { name: "Molex India",  category: "Electronics",  otif: 94,  quality: 98.4, lead: 5,  lastPO: "Oct 30" },
  { name: "Tata Steel",   category: "Metals",       otif: 88,  quality: 96.2, lead: 9,  lastPO: "Nov 1" },
  { name: "GCT Textiles", category: "Textile",      otif: 81,  quality: 97.8, lead: 14, lastPO: "Oct 28" },
  { name: "Bosch India",  category: "Auto Parts",   otif: 76,  quality: 99.0, lead: 20, lastPO: "Oct 25" },
];

const MRS = [
  { id: "MR-1041", by: "K. Nair",           material: "Solder Paste SN63",  plantId: "plant-bangalore",  qty: "20 kg",   status: "Approved" as const },
  { id: "MR-1040", by: "R. Krishnamurthy",  material: "Cutting Inserts",    plantId: "plant-chennai",    qty: "48 pcs",  status: "Pending"  as const },
  { id: "MR-1039", by: "Dr. S. Reddy",      material: "Gelatin Capsules",   plantId: "plant-hyderabad",  qty: "50,000",  status: "Approved" as const },
  { id: "MR-1038", by: "M. Sharma",         material: "OEKO Dyes (Blue)",   plantId: "plant-pune",       qty: "15 kg",   status: "Rejected" as const },
];

const STATUS_CFG: Record<POStatus, { color: string; bg: string }> = {
  "Open":             { color: "#A85E00", bg: "#FEF0D6" },
  "Received":         { color: "#1A7A40", bg: "#E8F5EC" },
  "Pending Approval": { color: "#F05230", bg: "#FEF0EB" },
  "Cancelled":        { color: "#6A8A9A", bg: "#F4F0EC" },
};

const PRIORITY_CFG: Record<POPriority, { color: string }> = {
  Critical: { color: "#CC1800" },
  High:     { color: "#A85E00" },
  Normal:   { color: "#0057CC" },
  Low:      { color: "#6A8A9A" },
};

const MR_STATUS_CFG = {
  Pending:  { color: "#A85E00", bg: "#FEF0D6" },
  Approved: { color: "#1A7A40", bg: "#E8F5EC" },
  Rejected: { color: "#CC1800", bg: "#FDE8E4" },
};

function otifColor(v: number) {
  return v >= 95 ? "#1A7A40" : v >= 85 ? "#A85E00" : "#CC1800";
}

function PlantChip({ plantId }: { plantId: string }) {
  const p = PLANTS.find((x) => x.id === plantId);
  if (!p) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-2xs" style={{ background: p.industryColor + "15", color: p.industryColor }}>
      <Factory size={8} />
      {p.name.replace("Sunrise ", "").replace("Electronics BLR", "BLR").replace("Textiles Pune", "Pune").replace("Pharma Hyd", "Hyd")}
    </span>
  );
}

const TAB_FILTERS: Record<string, (po: PurchaseOrder) => boolean> = {
  All:      () => true,
  Open:     (po) => po.status === "Open",
  Pending:  (po) => po.status === "Pending Approval",
  Received: (po) => po.status === "Received",
  Cancelled:(po) => po.status === "Cancelled",
};

function spendByCategoryChart() {
  const data = [
    { name: "Raw Material", value: 38.5 },
    { name: "Consumables",  value: 13.2 },
    { name: "Spare Parts",  value: 10.4 },
    { name: "MRO",          value: 4.8  },
    { name: "Packaging",    value: 1.5  },
  ].sort((a, b) => a.value - b.value);

  return {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: (p: { name: string; value: number }[]) => `${p[0].name}: ₹${p[0].value}L` },
    grid: { left: 100, right: 20, top: 10, bottom: 10 },
    xAxis: { type: "value", axisLabel: { formatter: (v: number) => `₹${v}L`, fontFamily: "IBM Plex Mono", fontSize: 10, color: "#6A8A9A" }, splitLine: { lineStyle: { color: "#E8E4DF" } } },
    yAxis: { type: "category", data: data.map((d) => d.name), axisLabel: { fontFamily: "IBM Plex Mono", fontSize: 10, color: "#6A8A9A" } },
    series: [{ type: "bar", data: data.map((d) => d.value), barMaxWidth: 20, itemStyle: { color: "#F05230", borderRadius: [0, 4, 4, 0] } }],
  };
}

function spendByPlantChart() {
  const categories = ["Raw Material", "Spare Parts", "MRO", "Consumables"];
  const plantData = [
    { plant: "Chennai",    values: [2.8, 3.1, 0.4, 0.3] },
    { plant: "Hyderabad",  values: [11.3, 0.4, 0.2, 0.5] },
    { plant: "Bangalore",  values: [1.4, 1.2, 0.3, 6.8] },
    { plant: "Pune",       values: [4.6, 0.8, 0.5, 0.2] },
  ];
  const colors = ["#F05230", "#1A7A40", "#0057CC", "#7C3AED"];

  return {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { data: categories, bottom: 0, textStyle: { fontFamily: "IBM Plex Mono", fontSize: 10, color: "#6A8A9A" } },
    grid: { left: 70, right: 20, top: 10, bottom: 40 },
    xAxis: { type: "category", data: plantData.map((d) => d.plant), axisLabel: { fontFamily: "IBM Plex Mono", fontSize: 10, color: "#6A8A9A" } },
    yAxis: { type: "value", axisLabel: { formatter: (v: number) => `₹${v}L`, fontFamily: "IBM Plex Mono", fontSize: 10, color: "#6A8A9A" }, splitLine: { lineStyle: { color: "#E8E4DF" } } },
    series: categories.map((cat, ci) => ({
      name: cat,
      type: "bar",
      stack: "spend",
      data: plantData.map((p) => p.values[ci]),
      itemStyle: { color: colors[ci] },
      barMaxWidth: 40,
    })),
  };
}

export default function ProcurementPage() {
  const [tab, setTab] = useState("All");

  const filtered = POS.filter(TAB_FILTERS[tab] ?? (() => true));

  return (
    <div className="min-h-screen bg-bg-subtle px-6 py-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
            <ShoppingCart size={16} className="text-brand" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Procurement</h1>
        </div>
        <p className="font-sans text-sm text-text-secondary ml-11">Purchase Orders · Vendor Performance · Spend Analytics</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Open POs",          value: "23",     sub: "₹1.2 Cr value",          icon: <ShoppingCart size={14} />, color: "#0057CC" },
          { label: "Pending Approvals", value: "7",      sub: "awaiting sign-off",       icon: <Clock size={14} />,        color: "#A85E00" },
          { label: "Supplier OTIF",     value: "87.4%",  sub: "on-time in-full",         icon: <Truck size={14} />,        color: "#1A7A40" },
          { label: "MTD Spend",         value: "₹68.4L", sub: "vs ₹72L budget (95%)",   icon: <BarChart3 size={14} />,     color: "#F05230" },
        ].map((tile) => (
          <div key={tile.label} className="bg-white rounded-xl border border-border shadow-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: tile.color }}>{tile.icon}</span>
              <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{tile.label}</p>
            </div>
            <p className="font-mono text-3xl font-bold" style={{ color: tile.color }}>{tile.value}</p>
            <p className="font-sans text-xs text-text-tertiary mt-0.5">{tile.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Main: PO table + charts */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* PO table */}
          <div className="bg-white rounded-xl border border-border shadow-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-mono text-xs font-bold text-text-primary uppercase tracking-widest">Purchase Orders</h2>
              <div className="flex items-center gap-1">
                {["All", "Open", "Pending", "Received", "Cancelled"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-2xs font-semibold transition-colors ${
                      tab === t ? "bg-brand text-white" : "text-text-secondary hover:bg-bg-subtle"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    {["PO ID", "Supplier", "Material / Category", "Plant", "Qty", "Value", "Expected", "Status", "Priority"].map((h) => (
                      <th key={h} className="px-4 py-2.5 font-mono text-2xs text-text-disabled uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((po) => {
                    const sc = STATUS_CFG[po.status];
                    const pc = PRIORITY_CFG[po.priority];
                    return (
                      <tr key={po.id} className="hover:bg-bg-subtle transition-colors">
                        <td className="px-4 py-2.5 font-mono text-2xs font-bold text-text-disabled whitespace-nowrap">{po.id}</td>
                        <td className="px-4 py-2.5 font-sans text-xs font-semibold text-text-primary whitespace-nowrap">{po.supplier}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-sans text-xs text-text-primary">{po.material}</p>
                          <p className="font-mono text-2xs text-text-disabled">{po.category}</p>
                        </td>
                        <td className="px-4 py-2.5"><PlantChip plantId={po.plantId} /></td>
                        <td className="px-4 py-2.5 font-mono text-xs text-text-secondary whitespace-nowrap">{po.qty}</td>
                        <td className="px-4 py-2.5 font-mono text-xs font-semibold text-text-primary whitespace-nowrap">{po.value}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-text-secondary whitespace-nowrap">{po.expected}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-2xs font-semibold" style={{ color: sc.color, background: sc.bg }}>
                            {po.status === "Received" && <CheckCircle2 size={9} />}
                            {po.status === "Open" && <Clock size={9} />}
                            {po.status === "Pending Approval" && <AlertTriangle size={9} />}
                            {po.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-2xs font-bold whitespace-nowrap" style={{ color: pc.color }}>{po.priority}</td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center font-sans text-sm text-text-disabled">No purchase orders match this filter</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-border shadow-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={13} className="text-brand" />
                <h3 className="font-mono text-xs font-bold text-text-primary uppercase tracking-widest">Spend by Category</h3>
              </div>
              <ReactECharts option={spendByCategoryChart()} style={{ height: 180 }} />
            </div>
            <div className="bg-white rounded-xl border border-border shadow-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Factory size={13} className="text-brand" />
                <h3 className="font-mono text-xs font-bold text-text-primary uppercase tracking-widest">Spend by Plant</h3>
              </div>
              <ReactECharts option={spendByPlantChart()} style={{ height: 180 }} />
            </div>
          </div>

          {/* Material Requisitions */}
          <div className="bg-white rounded-xl border border-border shadow-card">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <FileText size={13} className="text-brand" />
              <h2 className="font-mono text-xs font-bold text-text-primary uppercase tracking-widest">Material Requisitions</h2>
            </div>
            <div className="divide-y divide-border">
              {MRS.map((mr) => {
                const sc = MR_STATUS_CFG[mr.status];
                return (
                  <div key={mr.id} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-bg-subtle transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-2xs font-bold text-text-disabled">{mr.id}</span>
                      <div>
                        <p className="font-sans text-xs font-semibold text-text-primary">{mr.material}</p>
                        <p className="font-mono text-2xs text-text-disabled">{mr.by}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <PlantChip plantId={mr.plantId} />
                      <span className="font-mono text-xs text-text-secondary">{mr.qty}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-2xs font-semibold" style={{ color: sc.color, background: sc.bg }}>{mr.status}</span>
                      <ChevronRight size={12} className="text-text-disabled" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Supplier Scorecard */}
        <div className="w-72 shrink-0">
          <div className="bg-white rounded-xl border border-border shadow-card sticky top-6">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <Star size={13} className="text-brand" />
              <h2 className="font-mono text-xs font-bold text-text-primary uppercase tracking-widest">Supplier Scorecard</h2>
            </div>
            <div className="divide-y divide-border">
              {SUPPLIERS.map((s, idx) => (
                <div key={s.name} className="px-5 py-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-2xs font-bold text-text-disabled">#{idx + 1}</span>
                    <div className="flex-1">
                      <p className="font-sans text-xs font-semibold text-text-primary">{s.name}</p>
                      <p className="font-mono text-2xs text-text-disabled">{s.category}</p>
                    </div>
                    <span className="font-mono text-sm font-bold" style={{ color: otifColor(s.otif) }}>{s.otif}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-muted overflow-hidden mb-2">
                    <div className="h-full rounded-full" style={{ width: `${s.otif}%`, background: otifColor(s.otif) }} />
                  </div>
                  <div className="flex justify-between font-mono text-2xs text-text-disabled">
                    <span>Quality {s.quality}</span>
                    <span>Lead {s.lead}d</span>
                    <span>{s.lastPO}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-border">
              <div className="flex items-center gap-4 font-mono text-2xs text-text-disabled">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block" />≥95%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning inline-block" />≥85%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger inline-block" />&lt;85%</span>
              </div>
            </div>
          </div>

          {/* Quick alerts */}
          <div className="mt-4 bg-white rounded-xl border border-border shadow-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={13} className="text-warning" />
              <p className="font-mono text-xs font-bold text-text-primary uppercase tracking-widest">Alerts</p>
            </div>
            <div className="space-y-2.5">
              {[
                { text: "PO-2026-1136 awaiting CFO approval — 12 days pending", color: "#CC1800", bg: "#FDE8E4" },
                { text: "GCT Textiles OTIF dropped 6pp this month — review SLA", color: "#A85E00", bg: "#FEF0D6" },
                { text: "PO-2026-1134 (Hirose Japan) critical for BLR line start Nov 18", color: "#0057CC", bg: "#E8F0FF" },
                { text: "MRO spend on track — 4% under budget MTD", color: "#1A7A40", bg: "#E8F5EC" },
              ].map((a, i) => (
                <div key={i} className="flex gap-2 p-2 rounded-lg border-l-2 text-xs font-sans" style={{ background: a.bg, borderColor: a.color, color: "#001C2E" }}>
                  {a.text}
                </div>
              ))}
            </div>
          </div>

          {/* Budget tracker */}
          <div className="mt-4 bg-white rounded-xl border border-border shadow-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={13} className="text-brand" />
              <p className="font-mono text-xs font-bold text-text-primary uppercase tracking-widest">MTD Budget</p>
            </div>
            {[
              { label: "Raw Material", spent: 38.5, budget: 42, color: "#F05230" },
              { label: "MRO",          spent: 4.8,  budget: 5,  color: "#A85E00" },
              { label: "Spare Parts",  spent: 10.4, budget: 10, color: "#CC1800" },
              { label: "Consumables",  spent: 13.2, budget: 14, color: "#0057CC" },
              { label: "Packaging",    spent: 1.5,  budget: 1.0,color: "#7C3AED" },
            ].map((b) => {
              const pct = Math.min((b.spent / b.budget) * 100, 110);
              const over = b.spent > b.budget;
              return (
                <div key={b.label} className="mb-2.5 last:mb-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-mono text-2xs text-text-secondary">{b.label}</span>
                    <span className="font-mono text-2xs font-bold" style={{ color: over ? "#CC1800" : b.color }}>
                      ₹{b.spent}L / ₹{b.budget}L
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: over ? "#CC1800" : b.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
