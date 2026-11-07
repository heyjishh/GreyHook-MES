"use client";

import { useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Link,
  Package,
  Layers,
  Calendar,
  Zap,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

type SyncStatus = "synced" | "pending" | "error" | "partial";
type OrderStatus = "planned" | "released" | "in_progress" | "completed" | "overdue";

interface ProductionOrder {
  id: string;
  erpRef: string;
  product: string;
  qty: number;
  unit: string;
  dueDate: string;
  line: string;
  status: OrderStatus;
  mesConfirmed: boolean;
  confirmedQty?: number;
  syncedAt: string;
  bomStatus: "matched" | "mismatch" | "pending";
  materialStatus: "available" | "partial" | "shortage";
}

interface SyncEntity {
  entity: string;
  lastSync: string;
  status: SyncStatus;
  recordCount: number;
  errorCount: number;
  direction: "erp→mes" | "mes→erp" | "bidirectional";
}

const SYNC_ENTITIES: SyncEntity[] = [
  { entity: "Production Orders",   lastSync: "2026-11-06 11:30", status: "synced",   recordCount: 48,   errorCount: 0, direction: "erp→mes" },
  { entity: "BOM (Bill of Material)",lastSync: "2026-11-06 06:00", status: "synced",   recordCount: 312,  errorCount: 0, direction: "erp→mes" },
  { entity: "Materials / Inventory",lastSync: "2026-11-06 11:28", status: "partial",  recordCount: 1840, errorCount: 3, direction: "erp→mes" },
  { entity: "Production Confirmations",lastSync:"2026-11-06 11:25",status: "synced",  recordCount: 18,   errorCount: 0, direction: "mes→erp" },
  { entity: "Quality Results (NCR)", lastSync: "2026-11-06 10:55", status: "error",   recordCount: 4,    errorCount: 2, direction: "mes→erp" },
  { entity: "Master Data (Machines)",lastSync: "2026-11-05 22:00", status: "synced",  recordCount: 24,   errorCount: 0, direction: "erp→mes" },
];

const PRODUCTION_ORDERS: ProductionOrder[] = [
  { id: "PO-2026-11-0124", erpRef: "SAP-MFG-9001241", product: "Shaft Assembly SH-4400", qty: 200, unit: "pcs", dueDate: "2026-11-08", line: "Line 3 — CNC Bay",  status: "in_progress", mesConfirmed: true,  confirmedQty: 112, syncedAt: "11:30", bomStatus: "matched",   materialStatus: "available" },
  { id: "PO-2026-11-0125", erpRef: "SAP-MFG-9001242", product: "Brake Disc BD-700",      qty: 500, unit: "pcs", dueDate: "2026-11-09", line: "Line 1 — Assembly", status: "released",     mesConfirmed: true,  confirmedQty: 0,   syncedAt: "11:30", bomStatus: "matched",   materialStatus: "partial" },
  { id: "PO-2026-11-0126", erpRef: "SAP-MFG-9001243", product: "Engine Mount EM-220",    qty: 100, unit: "pcs", dueDate: "2026-11-07", line: "Cell 7 — Moulding", status: "overdue",      mesConfirmed: false, syncedAt: "11:30", bomStatus: "mismatch",  materialStatus: "shortage" },
  { id: "PO-2026-11-0127", erpRef: "SAP-MFG-9001244", product: "Bearing Housing BH-110", qty: 150, unit: "pcs", dueDate: "2026-11-12", line: "Line 2 — CNC",    status: "planned",      mesConfirmed: false, syncedAt: "11:30", bomStatus: "matched",   materialStatus: "available" },
  { id: "PO-2026-11-0128", erpRef: "SAP-MFG-9001245", product: "Shaft Assembly SH-4400", qty: 100, unit: "pcs", dueDate: "2026-11-14", line: "Line 3 — CNC Bay",  status: "planned",      mesConfirmed: false, syncedAt: "11:30", bomStatus: "pending",   materialStatus: "available" },
  { id: "PO-2026-11-0119", erpRef: "SAP-MFG-9001236", product: "Brake Disc BD-700",      qty: 400, unit: "pcs", dueDate: "2026-11-05", line: "Line 1 — Assembly", status: "completed",    mesConfirmed: true,  confirmedQty: 400, syncedAt: "11:25", bomStatus: "matched",   materialStatus: "available" },
];

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  planned:     { label: "Planned",     color: "text-text-secondary bg-surface border-border" },
  released:    { label: "Released",    color: "text-brand bg-brand/10 border-brand/20" },
  in_progress: { label: "In Progress", color: "text-warning bg-warning/10 border-warning/20" },
  completed:   { label: "Completed",   color: "text-success bg-success/10 border-success/20" },
  overdue:     { label: "Overdue",     color: "text-danger bg-danger/10 border-danger/20" },
};

const SYNC_STATUS: Record<SyncStatus, { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  synced:  { label: "Synced",  color: "text-success", icon: CheckCircle2 },
  pending: { label: "Pending", color: "text-warning",  icon: Clock },
  error:   { label: "Error",   color: "text-danger",   icon: XCircle },
  partial: { label: "Partial", color: "text-warning",  icon: AlertTriangle },
};

const BOM_STATUS: Record<"matched"|"mismatch"|"pending", { icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  matched:  { icon: CheckCircle2, color: "text-success" },
  mismatch: { icon: AlertTriangle, color: "text-danger" },
  pending:  { icon: Clock, color: "text-text-disabled" },
};

const MAT_STATUS: Record<"available"|"partial"|"shortage", { label: string; color: string }> = {
  available: { label: "Available", color: "text-success" },
  partial:   { label: "Partial",   color: "text-warning" },
  shortage:  { label: "Shortage",  color: "text-danger" },
};

function lcg(seed: number) {
  let s = seed;
  return () => { s = (1664525 * s + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };
}

const rng = lcg(42);
const CONFIRMATION_TREND = Array.from({ length: 7 }, (_, i) => {
  const planned = Math.round(80 + rng() * 40);
  const actual = Math.round(planned * (0.75 + rng() * 0.3));
  return { planned, actual };
});

export default function ERPSyncPage() {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [lastRefresh] = useState("2026-11-06 11:30");

  const filtered = PRODUCTION_ORDERS.filter(
    (o) => statusFilter === "all" || o.status === statusFilter
  );

  const errors = SYNC_ENTITIES.filter((e) => e.status === "error" || e.status === "partial");
  const overdueOrders = PRODUCTION_ORDERS.filter((o) => o.status === "overdue");
  const shortageOrders = PRODUCTION_ORDERS.filter((o) => o.materialStatus === "shortage");

  const confirmationOption = {
    animation: false,
    tooltip: { trigger: "axis" },
    legend: { data: ["Planned qty", "Confirmed qty"], textStyle: { fontSize: 10 } },
    xAxis: {
      type: "category",
      data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      axisLabel: { fontSize: 10 },
    },
    yAxis: { type: "value", name: "pcs", axisLabel: { fontSize: 10 } },
    series: [
      {
        name: "Planned qty",
        type: "bar",
        data: CONFIRMATION_TREND.map((d) => d.planned),
        itemStyle: { color: "rgba(0,119,255,0.4)", borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 32,
      },
      {
        name: "Confirmed qty",
        type: "bar",
        data: CONFIRMATION_TREND.map((d) => d.actual),
        itemStyle: { color: "#1A7A40", borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 32,
      },
    ],
    grid: { left: 46, right: 20, top: 36, bottom: 24 },
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-lg font-bold text-text-primary">ERP Integration</h1>
            <p className="font-sans text-xs text-text-secondary mt-0.5">
              Production orders from SAP · BOM sync · confirmation writeback · integration health
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xs text-text-disabled">Last sync: {lastRefresh}</span>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-sans text-text-secondary hover:border-brand hover:text-brand transition-colors">
              <RefreshCw size={12} />
              Sync Now
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-5">
        {/* Alert strip */}
        {(errors.length > 0 || overdueOrders.length > 0 || shortageOrders.length > 0) && (
          <div className="flex flex-col gap-2">
            {errors.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-danger/5 border border-danger/20">
                <XCircle size={12} className="text-danger shrink-0" />
                <p className="font-sans text-xs text-text-secondary">
                  <strong className="text-danger">Sync error:</strong> {errors.length} entity{errors.length > 1 ? "ies" : "y"} have sync issues — {errors.map((e) => e.entity).join(", ")}.
                </p>
              </div>
            )}
            {overdueOrders.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-warning/5 border border-warning/20">
                <AlertTriangle size={12} className="text-warning shrink-0" />
                <p className="font-sans text-xs text-text-secondary">
                  <strong className="text-warning">{overdueOrders.length} overdue order{overdueOrders.length > 1 ? "s" : ""}.</strong> {overdueOrders.map((o) => o.id).join(", ")} past due date.
                </p>
              </div>
            )}
            {shortageOrders.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-warning/5 border border-warning/20">
                <Package size={12} className="text-warning shrink-0" />
                <p className="font-sans text-xs text-text-secondary">
                  <strong className="text-warning">Material shortage</strong> blocking {shortageOrders.length} order{shortageOrders.length > 1 ? "s" : ""}. Create PO in ERP to resolve.
                </p>
              </div>
            )}
          </div>
        )}

        {/* KPI tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Open Orders",        value: PRODUCTION_ORDERS.filter((o) => o.status !== "completed").length, sub: "from ERP", icon: Layers, color: "text-brand" },
            { label: "Confirmed Today",    value: PRODUCTION_ORDERS.filter((o) => o.mesConfirmed).reduce((a, o) => a + (o.confirmedQty ?? 0), 0), sub: "pcs confirmed to ERP", icon: CheckCircle2, color: "text-success" },
            { label: "BOM Mismatches",     value: PRODUCTION_ORDERS.filter((o) => o.bomStatus === "mismatch").length, sub: "need resolution", icon: AlertTriangle, color: "text-danger" },
            { label: "Sync Entities",      value: `${SYNC_ENTITIES.filter((e) => e.status === "synced").length}/${SYNC_ENTITIES.length}`, sub: "entities healthy", icon: Zap, color: "text-text-secondary" },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="p-4 rounded-xl bg-surface border border-border">
              <Icon size={16} className={cn("mb-2", color)} />
              <div className="font-mono text-xl font-bold text-text-primary">{value}</div>
              <div className="font-sans text-xs text-text-secondary mt-0.5">{label}</div>
              <div className="font-mono text-2xs text-text-disabled">{sub}</div>
            </div>
          ))}
        </div>

        {/* Sync health table + confirmation chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-bg overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="font-sans text-xs font-semibold text-text-primary">Integration Health</span>
            </div>
            <div className="divide-y divide-border">
              {SYNC_ENTITIES.map((e) => {
                const cfg = SYNC_STATUS[e.status];
                const SIcon = cfg.icon;
                return (
                  <div key={e.entity} className="flex items-center gap-3 px-4 py-2.5">
                    <SIcon size={13} className={cfg.color} />
                    <div className="flex-1 min-w-0">
                      <div className="font-sans text-xs font-semibold text-text-primary truncate">{e.entity}</div>
                      <div className="flex items-center gap-2 font-mono text-2xs text-text-disabled">
                        <ArrowUpDown size={8} />
                        {e.direction}
                        <span>· {e.recordCount} records · {e.lastSync}</span>
                      </div>
                    </div>
                    {e.errorCount > 0 && (
                      <span className="font-mono text-2xs text-danger">{e.errorCount} err</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-bg p-4">
            <div className="mb-3">
              <span className="font-sans text-xs font-semibold text-text-primary">Week — Planned vs Confirmed (pcs)</span>
            </div>
            <ReactECharts option={confirmationOption} style={{ height: 180 }} />
          </div>
        </div>

        {/* Production orders table */}
        <div className="rounded-xl border border-border bg-bg overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-3">
            <span className="font-sans text-xs font-semibold text-text-primary">Production Orders</span>
            <select
              className="ml-auto px-2 py-1 bg-surface border border-border rounded-lg font-sans text-xs text-text-primary focus:outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="released">Released</option>
              <option value="in_progress">In Progress</option>
              <option value="planned">Planned</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((order) => {
              const cfg = STATUS_CONFIG[order.status];
              const BomIcon = BOM_STATUS[order.bomStatus].icon;
              const progress = order.confirmedQty !== undefined ? Math.round((order.confirmedQty / order.qty) * 100) : 0;
              return (
                <div key={order.id}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface transition-colors"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-text-primary">{order.id}</span>
                        <span className={cn("px-1.5 py-0.5 rounded text-2xs border", cfg.color)}>{cfg.label}</span>
                        {!order.mesConfirmed && (
                          <span className="px-1.5 py-0.5 rounded text-2xs border border-border text-text-disabled font-mono">
                            Unconfirmed
                          </span>
                        )}
                      </div>
                      <div className="font-sans text-xs text-text-secondary mt-0.5">{order.product}</div>
                      <div className="font-mono text-2xs text-text-disabled">{order.line} · {order.qty} {order.unit} · Due {order.dueDate}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1">
                        <BomIcon size={11} className={BOM_STATUS[order.bomStatus].color} />
                        <span className={cn("font-mono text-2xs", MAT_STATUS[order.materialStatus].color)}>
                          {MAT_STATUS[order.materialStatus].label}
                        </span>
                      </div>
                      {expandedOrder === order.id ? <ChevronUp size={12} className="text-text-disabled" /> : <ChevronDown size={12} className="text-text-disabled" />}
                    </div>
                  </button>
                  {expandedOrder === order.id && (
                    <div className="px-4 pb-4 border-t border-border">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div className="p-2 rounded-lg bg-surface border border-border">
                          <div className="font-mono text-2xs text-text-disabled">ERP Reference</div>
                          <div className="font-mono text-xs text-text-primary">{order.erpRef}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-surface border border-border">
                          <div className="font-mono text-2xs text-text-disabled">BOM Status</div>
                          <div className={cn("font-mono text-xs font-semibold", BOM_STATUS[order.bomStatus].color)}>
                            {order.bomStatus.charAt(0).toUpperCase() + order.bomStatus.slice(1)}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-surface border border-border">
                          <div className="font-mono text-2xs text-text-disabled">Progress</div>
                          <div className="font-mono text-xs text-text-primary">
                            {order.confirmedQty ?? 0} / {order.qty} pcs
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-surface border border-border">
                          <div className="font-mono text-2xs text-text-disabled">Last Sync</div>
                          <div className="font-mono text-xs text-text-primary">{order.syncedAt}</div>
                        </div>
                      </div>
                      {order.confirmedQty !== undefined && order.confirmedQty > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between font-mono text-2xs text-text-disabled mb-1">
                            <span>Completion</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-border overflow-hidden">
                            <div className="h-full bg-success rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        {order.bomStatus === "mismatch" && (
                          <button className="px-2.5 py-1.5 rounded-lg border border-danger text-danger text-xs font-sans hover:bg-danger/5 transition-colors">
                            Resolve BOM Mismatch
                          </button>
                        )}
                        {order.materialStatus === "shortage" && (
                          <button className="px-2.5 py-1.5 rounded-lg border border-warning text-warning text-xs font-sans hover:bg-warning/5 transition-colors">
                            Create Purchase Order
                          </button>
                        )}
                        {!order.mesConfirmed && order.status === "released" && (
                          <button className="px-2.5 py-1.5 rounded-lg bg-brand text-white text-xs font-sans font-semibold hover:bg-brand/90 transition-colors">
                            Release to MES Floor
                          </button>
                        )}
                        {order.mesConfirmed && order.status === "in_progress" && (
                          <button className="px-2.5 py-1.5 rounded-lg bg-success text-white text-xs font-sans font-semibold hover:bg-success/90 transition-colors">
                            Post Confirmation to ERP
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
