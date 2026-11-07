"use client";

import { useState } from "react";
import { AlertTriangle, Package, Plus, Search } from "lucide-react";

type LotStatus = "available" | "reserved" | "quarantine" | "in_wip" | "consumed" | "scrapped";

interface StockLot {
  id: string;
  item: string;
  description: string;
  supplier: string;
  receivedDate: string;
  expiryDate?: string;
  qty: number;
  unit: string;
  location: string;
  status: LotStatus;
  linkedWO?: string;
  qcStatus: "pending" | "passed" | "failed";
  costPerUnit: number;
}

interface MaterialNeed {
  item: string;
  workOrder: string;
  required: number;
  transferred: number;
  consumed: number;
  unit: string;
  status: "ok" | "low" | "critical";
}

const MOCK_LOTS: StockLot[] = [
  { id: "LOT-ENG-20261101", item: "ENG-MNT-V2-RAW", description: "Raw CNC Billet — Aluminium 6061", supplier: "Patel Precision", receivedDate: "2026-11-01", qty: 350, unit: "pcs", location: "RACK-A-01", status: "available", qcStatus: "passed", costPerUnit: 85 },
  { id: "LOT-BRK-20261103", item: "BRK-CABLE-WIRE", description: "Brake Cable Wire 3mm", supplier: "Sunrise Components", receivedDate: "2026-11-03", qty: 1200, unit: "m", location: "RACK-B-04", status: "available", qcStatus: "passed", costPerUnit: 12 },
  { id: "LOT-SHF-20261105", item: "SHAFT-V7-ROD", description: "EN8 Steel Rod 25mm dia", supplier: "Sunrise Components", receivedDate: "2026-11-05", qty: 180, unit: "m", location: "RACK-C-02", status: "available", qcStatus: "passed", costPerUnit: 220 },
  { id: "LOT-SV-20261105", item: "SHAFT-V7", description: "Machined Shaft V7 — in WIP", supplier: "In-house", receivedDate: "2026-11-05", qty: 55, unit: "pcs", location: "WIP-ZONE-3", status: "in_wip", linkedWO: "PO-2026-11-003", qcStatus: "pending", costPerUnit: 650 },
  { id: "LOT-AW-20261105", item: "ARM-WELD-C3", description: "Welded Arm — 3 pcs porosity defect", supplier: "In-house", receivedDate: "2026-11-05", qty: 3, unit: "pcs", location: "QUARANTINE-B7", status: "quarantine", linkedWO: "PO-2026-11-006", qcStatus: "failed", costPerUnit: 1200 },
  { id: "LOT-FR-20261104", item: "FRAME-STL-02", description: "Steel Frame blank — reserved for PO", supplier: "Metro Steel", receivedDate: "2026-11-04", qty: 50, unit: "pcs", location: "RACK-D-01", status: "reserved", linkedWO: "PO-2026-11-004", qcStatus: "passed", costPerUnit: 420 },
  { id: "LOT-WELD-WIRE", item: "WELD-WIRE-ER70S", description: "MIG Welding Wire ER70S-6", supplier: "Lincoln Electric", receivedDate: "2026-10-28", qty: 2, unit: "spool", location: "WELD-CONSUMABLES", status: "available", qcStatus: "passed", costPerUnit: 3400 },
  { id: "LOT-SCRAP-20261105", item: "SHAFT-V7", description: "Scrapped — OOL bore diameter", supplier: "In-house", receivedDate: "2026-11-05", qty: 4, unit: "pcs", location: "SCRAP-BIN-1", status: "scrapped", qcStatus: "failed", costPerUnit: 650 },
];

const MATERIAL_NEEDS: MaterialNeed[] = [
  { item: "ENG-MNT-V2-RAW", workOrder: "PO-2026-11-001", required: 200, transferred: 200, consumed: 200, unit: "pcs", status: "ok" },
  { item: "BRK-CABLE-WIRE", workOrder: "PO-2026-11-002", required: 300, transferred: 300, consumed: 180, unit: "m", status: "ok" },
  { item: "SHAFT-V7-ROD", workOrder: "PO-2026-11-003", required: 32, transferred: 32, consumed: 20, unit: "m", status: "ok" },
  { item: "FRAME-STL-02", workOrder: "PO-2026-11-004", required: 50, transferred: 50, consumed: 30, unit: "pcs", status: "ok" },
  { item: "WELD-WIRE-ER70S", workOrder: "PO-2026-11-006", required: 3, transferred: 1, consumed: 1, unit: "spool", status: "low" },
  { item: "COOLANT-CUT", workOrder: "PO-2026-11-003", required: 20, transferred: 0, consumed: 0, unit: "L", status: "critical" },
];

const LOT_STATUS_CONFIG: Record<LotStatus, { label: string; color: string; bg: string; dot: string }> = {
  available:  { label: "Available",  color: "text-success", bg: "bg-success/12",  dot: "bg-success" },
  reserved:   { label: "Reserved",   color: "text-brand",   bg: "bg-brand/12",    dot: "bg-brand" },
  in_wip:     { label: "In WIP",     color: "text-warning", bg: "bg-warning/12",  dot: "bg-warning" },
  quarantine: { label: "Quarantine", color: "text-danger",  bg: "bg-danger/12",   dot: "bg-danger" },
  consumed:   { label: "Consumed",   color: "text-text-tertiary", bg: "bg-bg", dot: "bg-text-disabled" },
  scrapped:   { label: "Scrapped",   color: "text-text-secondary", bg: "bg-bg border border-dashed border-border", dot: "bg-text-disabled" },
};

const QC_CONFIG = {
  passed:  { label: "QC Pass", color: "text-success" },
  failed:  { label: "QC Fail", color: "text-danger" },
  pending: { label: "QC Pending", color: "text-warning" },
};

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<LotStatus | "all">("all");
  const [activeTab, setActiveTab] = useState<"lots" | "consumption" | "receive">("lots");

  const filteredLots = MOCK_LOTS.filter(lot => {
    const matchSearch = search === "" || lot.item.toLowerCase().includes(search.toLowerCase()) || lot.id.toLowerCase().includes(search.toLowerCase()) || lot.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || lot.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const quarantineCount = MOCK_LOTS.filter(l => l.status === "quarantine").length;
  const criticalCount = MATERIAL_NEEDS.filter(m => m.status === "critical").length;
  const totalValue = MOCK_LOTS.filter(l => l.status !== "scrapped").reduce((s, l) => s + l.qty * l.costPerUnit, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary">Inventory & WIP</h1>
          <p className="font-sans text-xs text-text-tertiary mt-0.5">Lot/serial tracking · material consumption · incoming receipt</p>
        </div>
        <button onClick={() => setActiveTab("receive")}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg font-sans text-xs font-semibold hover:bg-brand/90 transition-colors">
          <Plus size={14} />
          Goods Receipt
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Lots", value: `${MOCK_LOTS.length}`, color: "text-text-primary" },
          { label: "Quarantine", value: `${quarantineCount}`, color: quarantineCount > 0 ? "text-danger" : "text-success" },
          { label: "Material Shorts", value: `${criticalCount}`, color: criticalCount > 0 ? "text-danger" : "text-success" },
          { label: "Stock Value", value: `₹${(totalValue / 1000).toFixed(0)}K`, color: "text-text-primary" },
        ].map(k => (
          <div key={k.label} className="bg-surface border border-border rounded-xl p-3">
            <p className="font-mono text-2xs text-text-tertiary uppercase tracking-widest mb-1">{k.label}</p>
            <p className={`font-mono text-lg font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {quarantineCount > 0 && (
        <div className="flex items-center gap-2 bg-danger/8 border border-danger/20 rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="text-danger shrink-0" />
          <p className="font-sans text-xs text-danger">{quarantineCount} lot(s) on quarantine hold — awaiting QE disposition. Do not issue to production.</p>
        </div>
      )}

      <div className="flex border-b border-border gap-1">
        {([["lots", "Lot Status Board"], ["consumption", "Material Consumption"], ["receive", "Goods Receipt"]] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-sans text-xs font-medium transition-colors border-b-2 -mb-px ${activeTab === tab ? "border-brand text-brand" : "border-transparent text-text-tertiary hover:text-text-primary"}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "lots" && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lot, item, location..."
                className="w-full pl-8 pr-3 py-1.5 font-sans text-xs bg-surface border border-border rounded-lg text-text-primary focus:border-brand focus:outline-none" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as LotStatus | "all")}
              className="font-mono text-xs bg-surface border border-border rounded-lg px-3 py-1.5 text-text-primary focus:border-brand focus:outline-none">
              <option value="all">All Statuses</option>
              {Object.entries(LOT_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono" style={{ minWidth: 760 }}>
                <thead className="border-b border-border">
                  <tr>
                    {["Lot ID", "Item", "Description", "Supplier", "Qty", "Location", "Status", "QC", "Cost", "WO"].map(h => (
                      <th key={h} className="text-left text-text-tertiary font-medium py-3 px-3 uppercase tracking-widest text-2xs whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLots.map(lot => {
                    const sc = LOT_STATUS_CONFIG[lot.status];
                    const qc = QC_CONFIG[lot.qcStatus];
                    return (
                      <tr key={lot.id} className={`hover:bg-bg/50 ${lot.status === "quarantine" ? "bg-danger/4" : ""}`}>
                        <td className="py-2 px-3 text-brand font-semibold whitespace-nowrap">{lot.id}</td>
                        <td className="py-2 px-3 text-text-primary font-semibold">{lot.item}</td>
                        <td className="py-2 px-3 text-text-secondary" style={{ maxWidth: 160 }}>
                          <span className="block truncate">{lot.description}</span>
                        </td>
                        <td className="py-2 px-3 text-text-tertiary whitespace-nowrap">{lot.supplier}</td>
                        <td className="py-2 px-3 text-text-primary font-bold whitespace-nowrap">{lot.qty} {lot.unit}</td>
                        <td className="py-2 px-3 text-text-secondary whitespace-nowrap">{lot.location}</td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs ${sc.bg} ${sc.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} shrink-0`} />
                            {sc.label}
                          </span>
                        </td>
                        <td className={`py-2 px-3 whitespace-nowrap ${qc.color}`}>{qc.label}</td>
                        <td className="py-2 px-3 text-text-tertiary whitespace-nowrap">₹{lot.costPerUnit}/u</td>
                        <td className="py-2 px-3 text-brand text-2xs whitespace-nowrap">{lot.linkedWO || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredLots.length === 0 && (
                <div className="text-center py-8 text-text-tertiary font-sans text-xs">No lots match your filter</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "consumption" && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead className="border-b border-border">
                <tr>
                  {["Item", "Work Order", "Required", "Transferred", "Consumed", "Unit", "Balance", "Status"].map(h => (
                    <th key={h} className="text-left text-text-tertiary font-medium py-3 px-3 uppercase tracking-widest text-2xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MATERIAL_NEEDS.map(m => {
                  const balance = m.transferred - m.consumed;
                  return (
                    <tr key={`${m.item}-${m.workOrder}`} className={m.status === "critical" ? "bg-danger/4" : m.status === "low" ? "bg-warning/4" : ""}>
                      <td className="py-2 px-3 text-text-primary font-semibold">{m.item}</td>
                      <td className="py-2 px-3 text-brand">{m.workOrder}</td>
                      <td className="py-2 px-3 text-text-secondary">{m.required}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-bg rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (m.transferred / m.required) * 100)}%` }} />
                          </div>
                          <span className={m.transferred >= m.required ? "text-success" : "text-warning"}>{m.transferred}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-text-secondary">{m.consumed}</td>
                      <td className="py-2 px-3 text-text-tertiary">{m.unit}</td>
                      <td className={`py-2 px-3 font-bold ${balance > 0 ? "text-success" : balance === 0 ? "text-text-secondary" : "text-danger"}`}>{balance}</td>
                      <td className="py-2 px-3">
                        {m.status === "critical" ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-2xs bg-danger/12 text-danger">Critical — Not Transferred</span>
                            <button className="text-brand text-2xs underline whitespace-nowrap">Create PO</button>
                          </div>
                        ) : m.status === "low" ? (
                          <span className="px-2 py-0.5 rounded-full text-2xs bg-warning/12 text-warning">Low Stock</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-2xs bg-success/12 text-success">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "receive" && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <p className="font-heading text-sm font-bold text-text-primary">Goods Receipt — New Incoming Lot</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Item Code", placeholder: "e.g. ENG-MNT-V2-RAW" },
              { label: "Supplier", placeholder: "Supplier name" },
              { label: "PO Reference", placeholder: "e.g. PO-REC-20261106-016" },
              { label: "Lot / Batch Number", placeholder: "e.g. LOT-ENG-20261106" },
              { label: "Quantity Received", placeholder: "0" },
              { label: "Unit", placeholder: "pcs / m / kg / L" },
              { label: "Location / Bin", placeholder: "e.g. RACK-A-02" },
              { label: "Expiry Date (optional)", placeholder: "YYYY-MM-DD" },
            ].map(f => (
              <div key={f.label}>
                <label className="font-mono text-2xs text-text-tertiary uppercase tracking-widest block mb-1">{f.label}</label>
                <input placeholder={f.placeholder}
                  className="w-full font-sans text-xs bg-bg border border-border rounded-lg px-3 py-2 text-text-primary focus:border-brand focus:outline-none" />
              </div>
            ))}
          </div>
          <div>
            <label className="font-mono text-2xs text-text-tertiary uppercase tracking-widest block mb-1">Trigger Quality Inspection</label>
            <div className="flex gap-2">
              {["Yes — block until QC passed", "No — accept directly"].map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="qc_trigger" className="accent-brand" defaultChecked={opt.startsWith("Yes")} />
                  <span className="font-sans text-xs text-text-secondary">{opt}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <button className="px-5 py-2 bg-brand text-white rounded-lg font-sans text-xs font-semibold hover:bg-brand/90 transition-colors">Submit Receipt</button>
            <button className="px-5 py-2 bg-surface border border-border text-text-primary rounded-lg font-sans text-xs hover:bg-bg transition-colors">Save Draft</button>
          </div>
        </div>
      )}
    </div>
  );
}
