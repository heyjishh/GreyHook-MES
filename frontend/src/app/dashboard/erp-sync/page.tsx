"use client";

import { useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  RefreshCw, CheckCircle2, Clock, AlertTriangle, XCircle, ArrowUpDown,
  Package, Layers, Zap, ChevronDown, ChevronUp, Settings2, Database,
  Link2, Server, Shield, Truck, Wrench, FlaskConical, ShoppingBag,
  BarChart3, Building2, Factory, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SyncStatus = "synced" | "pending" | "error" | "partial" | "disabled";
type OrderStatus = "planned" | "released" | "in_progress" | "completed" | "overdue";

interface ConnectorConfig {
  id: string;
  name: string;
  system: "SAP S/4HANA" | "SAP ECC" | "Oracle ERP Cloud" | "Oracle EBS";
  plant: string;
  team: string;
  url: string;
  lastTest: string;
  testOk: boolean;
}

interface ModuleRow {
  id: string;
  display: string;
  system: "SAP" | "Oracle";
  direction: "erp→mes" | "mes→erp" | "bidirectional";
  status: SyncStatus;
  lastSync: string;
  records: number;
  errors: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface ProductionOrder {
  id: string;
  erpRef: string;
  system: "SAP" | "Oracle";
  module: "PP" | "MFG" | "QM";
  product: string;
  qty: number;
  confirmedQty?: number;
  unit: string;
  dueDate: string;
  line: string;
  status: OrderStatus;
  plant: string;
  bomStatus: "matched" | "mismatch" | "pending";
  materialStatus: "available" | "partial" | "shortage";
  syncedAt: string;
}

const CONNECTORS: ConnectorConfig[] = [
  { id: "c1", name: "SAP S/4HANA — Plant IN01", system: "SAP S/4HANA", plant: "IN01", team: "Plant 1 — Pune", url: "https://sap.internal:8080", lastTest: "11:30", testOk: true },
  { id: "c2", name: "SAP S/4HANA — Plant IN02", system: "SAP S/4HANA", plant: "IN02", team: "Plant 2 — Chennai", url: "https://sap.internal:8080", lastTest: "11:30", testOk: true },
  { id: "c3", name: "Oracle ERP Cloud — Org MFG01", system: "Oracle ERP Cloud", plant: "MFG01", team: "Global MFG", url: "https://oracle.internal", lastTest: "10:15", testOk: false },
];

const MODULES: ModuleRow[] = [
  { id: "PP",      display: "Production Planning (PP)",   system: "SAP",    direction: "bidirectional", status: "synced",  lastSync: "11:30", records: 48,   errors: 0, icon: Activity },
  { id: "MM",      display: "Materials Management (MM)",  system: "SAP",    direction: "bidirectional", status: "partial", lastSync: "11:28", records: 1840, errors: 3, icon: Package },
  { id: "QM",      display: "Quality Management (QM)",    system: "SAP",    direction: "bidirectional", status: "error",   lastSync: "10:55", records: 4,    errors: 2, icon: FlaskConical },
  { id: "PM",      display: "Plant Maintenance (PM)",     system: "SAP",    direction: "bidirectional", status: "synced",  lastSync: "11:00", records: 24,   errors: 0, icon: Wrench },
  { id: "SD",      display: "Sales & Distribution (SD)",  system: "SAP",    direction: "erp→mes",       status: "synced",  lastSync: "11:20", records: 36,   errors: 0, icon: Truck },
  { id: "WM",      display: "Warehouse Mgmt (WM)",        system: "SAP",    direction: "erp→mes",       status: "synced",  lastSync: "11:00", records: 312,  errors: 0, icon: Database },
  { id: "MFG",     display: "Oracle Manufacturing",       system: "Oracle", direction: "bidirectional", status: "error",   lastSync: "10:15", records: 0,    errors: 1, icon: Factory },
  { id: "WMS",     display: "Oracle WMS / Inventory",     system: "Oracle", direction: "bidirectional", status: "error",   lastSync: "10:15", records: 0,    errors: 1, icon: Layers },
  { id: "QUALITY", display: "Oracle Quality",             system: "Oracle", direction: "bidirectional", status: "error",   lastSync: "10:15", records: 0,    errors: 1, icon: Shield },
];

const ORDERS: ProductionOrder[] = [
  { id: "PO-9001241", erpRef: "SAP-PP-9001241", system: "SAP", module: "PP", product: "Shaft Assembly SH-4400",  qty: 200, confirmedQty: 112, unit: "pcs", dueDate: "2026-11-08", line: "Line 3 — CNC Bay",    plant: "IN01", status: "in_progress", bomStatus: "matched",   materialStatus: "available", syncedAt: "11:30" },
  { id: "PO-9001242", erpRef: "SAP-PP-9001242", system: "SAP", module: "PP", product: "Brake Disc BD-700",       qty: 500, confirmedQty: 0,   unit: "pcs", dueDate: "2026-11-09", line: "Line 1 — Assembly",   plant: "IN01", status: "released",     bomStatus: "matched",   materialStatus: "partial",   syncedAt: "11:30" },
  { id: "PO-9001243", erpRef: "SAP-PP-9001243", system: "SAP", module: "PP", product: "Engine Mount EM-220",     qty: 100, unit: "pcs",                    dueDate: "2026-11-07", line: "Cell 7 — Moulding",   plant: "IN02", status: "overdue",      bomStatus: "mismatch",  materialStatus: "shortage",  syncedAt: "11:30" },
  { id: "PO-9001244", erpRef: "SAP-PP-9001244", system: "SAP", module: "PP", product: "Bearing Housing BH-110",  qty: 150, unit: "pcs",                    dueDate: "2026-11-12", line: "Line 2 — CNC",       plant: "IN01", status: "planned",      bomStatus: "matched",   materialStatus: "available", syncedAt: "11:30" },
  { id: "QI-00482",   erpRef: "SAP-QM-00482",   system: "SAP", module: "QM", product: "Inspection Lot — BD-700",qty: 100, unit: "pcs",                    dueDate: "2026-11-09", line: "QC Bay 2",            plant: "IN01", status: "released",     bomStatus: "matched",   materialStatus: "available", syncedAt: "10:55" },
  { id: "WO-10021",   erpRef: "ORA-MFG-10021",  system: "Oracle", module: "MFG", product: "Gear Housing GH-55",  qty: 80, unit: "pcs",                     dueDate: "2026-11-11", line: "Oracle Line A",      plant: "MFG01", status: "error" as any, bomStatus: "pending",   materialStatus: "available", syncedAt: "10:15" },
];

const STATUS_ICON: Record<SyncStatus, React.ComponentType<{ size?: number; className?: string }>> = {
  synced:   CheckCircle2,
  pending:  Clock,
  error:    XCircle,
  partial:  AlertTriangle,
  disabled: Clock,
};

const STATUS_COLOR: Record<SyncStatus, string> = {
  synced:   "text-success",
  pending:  "text-warning",
  error:    "text-danger",
  partial:  "text-warning",
  disabled: "text-text-disabled",
};

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  planned:     { label: "Planned",     color: "text-text-secondary bg-surface border-border" },
  released:    { label: "Released",    color: "text-brand bg-brand/10 border-brand/20" },
  in_progress: { label: "In Progress", color: "text-warning bg-warning/10 border-warning/20" },
  completed:   { label: "Completed",   color: "text-success bg-success/10 border-success/20" },
  overdue:     { label: "Overdue",     color: "text-danger bg-danger/10 border-danger/20" },
  error:       { label: "Sync Error",  color: "text-danger bg-danger/10 border-danger/20" },
};

function lcg(seed: number) {
  let s = seed;
  return () => { s = (1664525 * s + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };
}
const rng = lcg(42);
const TREND = Array.from({ length: 7 }, () => {
  const p = Math.round(80 + rng() * 40);
  return { planned: p, actual: Math.round(p * (0.75 + rng() * 0.3)) };
});

type TabId = "overview" | "sap" | "oracle" | "connectors";

export default function IntegrationHubPage() {
  const [tab, setTab] = useState<TabId>("overview");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState<"all" | "SAP" | "Oracle">("all");
  const [lastRefresh] = useState("2026-11-08 11:30");

  const sapModules = MODULES.filter((m) => m.system === "SAP");
  const oracleModules = MODULES.filter((m) => m.system === "Oracle");
  const displayModules = moduleFilter === "all" ? MODULES : MODULES.filter((m) => m.system === moduleFilter);

  const errorCount = MODULES.filter((m) => m.status === "error" || m.status === "partial").reduce((s, m) => s + m.errors, 0);
  const overdueOrders = ORDERS.filter((o) => o.status === "overdue");
  const shortages = ORDERS.filter((o) => o.materialStatus === "shortage");
  const filteredOrders = ORDERS.filter((o) => orderFilter === "all" || o.status === orderFilter || o.module === orderFilter);

  const trendOption = {
    animation: false,
    tooltip: { trigger: "axis" },
    legend: { data: ["Planned", "Confirmed"], textStyle: { fontSize: 10 } },
    xAxis: { type: "category", data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], axisLabel: { fontSize: 10 } },
    yAxis: { type: "value", name: "pcs", axisLabel: { fontSize: 10 } },
    series: [
      { name: "Planned",   type: "bar", data: TREND.map((d) => d.planned), itemStyle: { color: "rgba(0,119,255,0.4)", borderRadius: [3, 3, 0, 0] }, barMaxWidth: 32 },
      { name: "Confirmed", type: "bar", data: TREND.map((d) => d.actual),  itemStyle: { color: "#1A7A40", borderRadius: [3, 3, 0, 0] }, barMaxWidth: 32 },
    ],
    grid: { left: 46, right: 20, top: 36, bottom: 24 },
  };

  const moduleStatusOption = {
    animation: false,
    tooltip: { formatter: "{b}: {c}" },
    series: [{
      type: "pie", radius: ["55%", "80%"], itemStyle: { borderRadius: 4 },
      label: { show: false },
      data: [
        { value: MODULES.filter((m) => m.status === "synced").length,  name: "Synced",  itemStyle: { color: "#1A7A40" } },
        { value: MODULES.filter((m) => m.status === "partial").length, name: "Partial", itemStyle: { color: "#E6A817" } },
        { value: MODULES.filter((m) => m.status === "error").length,   name: "Error",   itemStyle: { color: "#D94B3B" } },
      ],
    }],
  };

  const TABS: { id: TabId; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { id: "overview",    label: "All Modules",    icon: BarChart3 },
    { id: "sap",         label: "SAP",            icon: Server },
    { id: "oracle",      label: "Oracle",         icon: Database },
    { id: "connectors",  label: "Connectors",     icon: Link2 },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-lg font-bold text-text-primary">SAP & Oracle Integration Hub</h1>
            <p className="font-sans text-xs text-text-secondary mt-0.5">
              Unified connector for SAP (PP · MM · QM · PM · SD · WM) and Oracle (MFG · WMS · Quality) · per plant/team · bidirectional sync
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-2xs text-text-disabled">Last sync: {lastRefresh}</span>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-sans text-text-secondary hover:border-brand hover:text-brand transition-colors">
              <Settings2 size={12} />
              Configure
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-xs font-sans font-semibold hover:bg-brand/90 transition-colors">
              <RefreshCw size={12} />
              Sync All
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-colors",
                tab === id
                  ? "bg-brand/10 text-brand font-semibold"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface"
              )}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-5 space-y-5">
        {/* Alert strip */}
        {(errorCount > 0 || overdueOrders.length > 0 || shortages.length > 0) && (
          <div className="flex flex-col gap-2">
            {errorCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-danger/5 border border-danger/20">
                <XCircle size={12} className="text-danger shrink-0" />
                <p className="font-sans text-xs text-text-secondary">
                  <strong className="text-danger">Sync errors:</strong>{" "}
                  {MODULES.filter((m) => m.errors > 0).map((m) => `${m.display} (${m.errors} err)`).join(" · ")}
                </p>
              </div>
            )}
            {overdueOrders.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-warning/5 border border-warning/20">
                <AlertTriangle size={12} className="text-warning shrink-0" />
                <p className="font-sans text-xs text-text-secondary">
                  <strong className="text-warning">{overdueOrders.length} overdue orders:</strong>{" "}
                  {overdueOrders.map((o) => o.id).join(" · ")}
                </p>
              </div>
            )}
            {shortages.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-warning/5 border border-warning/20">
                <Package size={12} className="text-warning shrink-0" />
                <p className="font-sans text-xs text-text-secondary">
                  <strong className="text-warning">Material shortage</strong> blocking {shortages.length} order(s)
                </p>
              </div>
            )}
          </div>
        )}

        {/* KPI tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Modules",    value: `${MODULES.filter((m) => m.status === "synced").length}/${MODULES.length}`, sub: "healthy",        icon: Zap,         color: "text-brand" },
            { label: "SAP Modules",      value: `${sapModules.filter((m) => m.status === "synced").length}/${sapModules.length}`, sub: "SAP synced",  icon: Server,      color: "text-success" },
            { label: "Oracle Modules",   value: `${oracleModules.filter((m) => m.status === "synced").length}/${oracleModules.length}`, sub: "Oracle synced", icon: Database, color: "text-warning" },
            { label: "Live Connectors",  value: `${CONNECTORS.filter((c) => c.testOk).length}/${CONNECTORS.length}`, sub: "connected systems", icon: Link2,       color: "text-text-secondary" },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="p-4 rounded-xl bg-surface border border-border">
              <Icon size={16} className={cn("mb-2", color)} />
              <div className="font-mono text-xl font-bold text-text-primary">{value}</div>
              <div className="font-sans text-xs text-text-secondary mt-0.5">{label}</div>
              <div className="font-mono text-2xs text-text-disabled">{sub}</div>
            </div>
          ))}
        </div>

        {/* Overview tab */}
        {(tab === "overview") && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Module health table */}
              <div className="rounded-xl border border-border bg-bg overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <span className="font-sans text-xs font-semibold text-text-primary">Module Integration Health</span>
                  <div className="flex gap-1">
                    {(["all", "SAP", "Oracle"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setModuleFilter(f)}
                        className={cn(
                          "px-2 py-0.5 rounded text-2xs font-mono font-semibold transition-colors",
                          moduleFilter === f ? "bg-brand/10 text-brand" : "text-text-disabled hover:text-text-secondary"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {displayModules.map((m) => {
                    const SIcon = STATUS_ICON[m.status];
                    const MIcon = m.icon;
                    return (
                      <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                        <MIcon size={12} className="text-text-disabled shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-sans text-xs font-semibold text-text-primary truncate">{m.display}</div>
                          <div className="flex items-center gap-2 font-mono text-2xs text-text-disabled">
                            <ArrowUpDown size={8} />
                            {m.direction}
                            <span>· {m.records.toLocaleString()} records · {m.lastSync}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <SIcon size={12} className={STATUS_COLOR[m.status]} />
                          {m.errors > 0 && <span className="font-mono text-2xs text-danger">{m.errors} err</span>}
                          <span className={cn("font-mono text-2xs px-1.5 py-0.5 rounded border", m.system === "SAP" ? "text-brand border-brand/20 bg-brand/5" : "text-warning border-warning/20 bg-warning/5")}>
                            {m.system}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart + donut */}
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-border bg-bg p-4">
                  <div className="mb-2">
                    <span className="font-sans text-xs font-semibold text-text-primary">Week — Planned vs Confirmed (pcs)</span>
                  </div>
                  <ReactECharts option={trendOption} style={{ height: 160 }} />
                </div>
                <div className="rounded-xl border border-border bg-bg p-4 flex items-center gap-6">
                  <ReactECharts option={moduleStatusOption} style={{ width: 100, height: 100 }} />
                  <div className="space-y-1.5">
                    {[
                      { label: "Synced",  color: "bg-success", count: MODULES.filter((m) => m.status === "synced").length },
                      { label: "Partial", color: "bg-warning", count: MODULES.filter((m) => m.status === "partial").length },
                      { label: "Error",   color: "bg-danger",  count: MODULES.filter((m) => m.status === "error").length },
                    ].map(({ label, color, count }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", color)} />
                        <span className="font-sans text-xs text-text-secondary">{label}</span>
                        <span className="font-mono text-xs text-text-primary font-bold ml-auto">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Production orders table */}
            <OrdersTable
              orders={filteredOrders}
              filter={orderFilter}
              onFilterChange={setOrderFilter}
              expanded={expanded}
              onExpand={setExpanded}
            />
          </>
        )}

        {/* SAP tab */}
        {tab === "sap" && (
          <SAPModulesPanel modules={sapModules} orders={ORDERS.filter((o) => o.system === "SAP")} />
        )}

        {/* Oracle tab */}
        {tab === "oracle" && (
          <OracleModulesPanel modules={oracleModules} connectors={CONNECTORS.filter((c) => c.system.startsWith("Oracle"))} />
        )}

        {/* Connectors tab */}
        {tab === "connectors" && <ConnectorsPanel connectors={CONNECTORS} />}
      </div>
    </div>
  );
}

function OrdersTable({
  orders, filter, onFilterChange, expanded, onExpand,
}: {
  orders: ProductionOrder[];
  filter: string;
  onFilterChange: (f: string) => void;
  expanded: string | null;
  onExpand: (id: string | null) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-wrap">
        <span className="font-sans text-xs font-semibold text-text-primary">ERP Production Orders</span>
        <select
          className="ml-auto px-2 py-1 bg-surface border border-border rounded-lg font-sans text-xs text-text-primary focus:outline-none"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
        >
          <option value="all">All</option>
          <option value="released">Released</option>
          <option value="in_progress">In Progress</option>
          <option value="planned">Planned</option>
          <option value="overdue">Overdue</option>
          <option value="completed">Completed</option>
          <option value="PP">SAP PP</option>
          <option value="QM">SAP QM</option>
          <option value="MFG">Oracle MFG</option>
        </select>
      </div>
      <div className="divide-y divide-border">
        {orders.map((order) => {
          const cfg = ORDER_STATUS[order.status] ?? ORDER_STATUS.planned;
          const progress = order.confirmedQty !== undefined && order.qty > 0
            ? Math.round((order.confirmedQty / order.qty) * 100)
            : 0;
          return (
            <div key={order.id}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface transition-colors"
                onClick={() => onExpand(expanded === order.id ? null : order.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-text-primary">{order.id}</span>
                    <span className={cn("px-1.5 py-0.5 rounded text-2xs border", cfg.color)}>{cfg.label}</span>
                    <span className={cn("px-1.5 py-0.5 rounded text-2xs border font-mono", order.system === "SAP" ? "text-brand border-brand/20" : "text-warning border-warning/20")}>
                      {order.system} · {order.module}
                    </span>
                  </div>
                  <div className="font-sans text-xs text-text-secondary mt-0.5">{order.product}</div>
                  <div className="font-mono text-2xs text-text-disabled">{order.line} · {order.qty} {order.unit} · Due {order.dueDate} · Plant {order.plant}</div>
                </div>
                <div className="shrink-0">
                  {expanded === order.id ? <ChevronUp size={12} className="text-text-disabled" /> : <ChevronDown size={12} className="text-text-disabled" />}
                </div>
              </button>
              {expanded === order.id && (
                <div className="px-4 pb-4 border-t border-border">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <InfoCell label="ERP Reference" value={order.erpRef} />
                    <InfoCell label="BOM Status" value={order.bomStatus} valueClass={order.bomStatus === "matched" ? "text-success" : order.bomStatus === "mismatch" ? "text-danger" : "text-warning"} />
                    <InfoCell label="Progress" value={`${order.confirmedQty ?? 0} / ${order.qty} ${order.unit}`} />
                    <InfoCell label="Last Sync" value={order.syncedAt} />
                  </div>
                  {order.confirmedQty !== undefined && order.confirmedQty > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between font-mono text-2xs text-text-disabled mb-1">
                        <span>Completion</span><span>{progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-border overflow-hidden">
                        <div className="h-full bg-success rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {order.bomStatus === "mismatch" && (
                      <button className="px-2.5 py-1.5 rounded-lg border border-danger text-danger text-xs font-sans hover:bg-danger/5 transition-colors">
                        Resolve BOM Mismatch
                      </button>
                    )}
                    {order.materialStatus === "shortage" && (
                      <button className="px-2.5 py-1.5 rounded-lg border border-warning text-warning text-xs font-sans hover:bg-warning/5 transition-colors">
                        Create PO in ERP
                      </button>
                    )}
                    {order.status === "released" && (
                      <button className="px-2.5 py-1.5 rounded-lg bg-brand text-white text-xs font-sans font-semibold hover:bg-brand/90 transition-colors">
                        Release to MES Floor
                      </button>
                    )}
                    {order.status === "in_progress" && order.confirmedQty !== undefined && (
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
  );
}

function InfoCell({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="p-2 rounded-lg bg-surface border border-border">
      <div className="font-mono text-2xs text-text-disabled">{label}</div>
      <div className={cn("font-mono text-xs text-text-primary font-semibold", valueClass)}>{value}</div>
    </div>
  );
}

function SAPModulesPanel({ modules, orders }: { modules: ModuleRow[]; orders: ProductionOrder[] }) {
  const SAP_MODULE_DETAIL = [
    { id: "PP", desc: "Receive production orders, BOMs, routings. Post confirmations, actual quantities, scrap back to SAP." },
    { id: "MM", desc: "Sync material master, stock levels, purchase orders. Post goods receipts (GR101) and issue (GI261) from MES." },
    { id: "QM", desc: "Pull inspection lots from SAP. Record inspection results, defects, usage decisions in real time." },
    { id: "PM", desc: "Receive maintenance orders and equipment data. Push fault notifications (PM M2) on machine downtime." },
    { id: "SD", desc: "Pull sales orders and delivery schedules to drive production priority on the MES floor." },
    { id: "WM", desc: "Sync warehouse stock, transfer orders, storage bin levels for WIP and finished goods." },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {SAP_MODULE_DETAIL.map(({ id, desc }) => {
          const mod = modules.find((m) => m.id === id);
          const SIcon = mod ? STATUS_ICON[mod.status] : Clock;
          const MIcon = mod?.icon ?? Activity;
          return (
            <div key={id} className="rounded-xl border border-border bg-surface p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MIcon size={14} className="text-brand" />
                  <span className="font-mono text-xs font-bold text-text-primary">{id}</span>
                </div>
                {mod && <SIcon size={13} className={STATUS_COLOR[mod.status]} />}
              </div>
              <div className="font-sans text-xs text-text-primary font-semibold">{mod?.display ?? id}</div>
              <div className="font-sans text-2xs text-text-secondary leading-relaxed">{desc}</div>
              {mod && (
                <div className="pt-1 flex items-center justify-between font-mono text-2xs text-text-disabled">
                  <span>{mod.records.toLocaleString()} records</span>
                  <span className={cn(mod.errors > 0 ? "text-danger" : "text-text-disabled")}>
                    {mod.errors > 0 ? `${mod.errors} errors` : "✓ clean"}
                  </span>
                </div>
              )}
              <div className="flex gap-1.5 pt-1">
                <button className="px-2 py-1 text-2xs font-mono rounded border border-border text-text-secondary hover:border-brand hover:text-brand transition-colors">
                  Sync Now
                </button>
                <button className="px-2 py-1 text-2xs font-mono rounded border border-border text-text-secondary hover:border-brand hover:text-brand transition-colors">
                  View Logs
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {orders.length > 0 && (
        <div className="rounded-xl border border-border bg-bg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <span className="font-sans text-xs font-semibold text-text-primary">SAP Production Orders</span>
          </div>
          <div className="divide-y divide-border">
            {orders.slice(0, 10).map((o) => {
              const cfg = ORDER_STATUS[o.status] ?? ORDER_STATUS.planned;
              return (
                <div key={o.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-text-primary">{o.id}</span>
                      <span className={cn("px-1.5 py-0.5 rounded text-2xs border", cfg.color)}>{cfg.label}</span>
                      <span className="font-mono text-2xs text-brand">{o.module}</span>
                    </div>
                    <div className="font-sans text-2xs text-text-disabled">{o.product} · {o.qty} {o.unit} · {o.line}</div>
                  </div>
                  <span className="font-mono text-2xs text-text-disabled shrink-0">Due {o.dueDate}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function OracleModulesPanel({ modules, connectors }: { modules: ModuleRow[]; connectors: ConnectorConfig[] }) {
  const ORACLE_DETAIL = [
    { id: "MFG",     desc: "Oracle Discrete/Process Manufacturing jobs. Sync work orders, operations, resources, and post completions from MES." },
    { id: "WMS",     desc: "Oracle Warehouse Management. Pull on-hand quantities, subinventories. Post WIP issues and completions." },
    { id: "QUALITY", desc: "Oracle Quality Management. Receive inspection plans, post results and dispositions (Accept/Reject) from MES QC." },
  ];

  const hasOracleConn = connectors.length > 0;

  return (
    <div className="space-y-4">
      {!hasOracleConn || connectors.every((c) => !c.testOk) ? (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-5 text-center">
          <Database size={24} className="text-warning mx-auto mb-2" />
          <div className="font-sans text-sm font-semibold text-text-primary mb-1">Oracle connector unreachable</div>
          <div className="font-sans text-xs text-text-secondary">Configure an Oracle ERP Cloud or Oracle EBS connector in the Connectors tab to enable these modules.</div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ORACLE_DETAIL.map(({ id, desc }) => {
          const mod = modules.find((m) => m.id === id);
          const SIcon = mod ? STATUS_ICON[mod.status] : Clock;
          const MIcon = mod?.icon ?? Database;
          return (
            <div key={id} className={cn("rounded-xl border bg-surface p-4 space-y-2", !hasOracleConn ? "opacity-50" : "border-border")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MIcon size={14} className="text-warning" />
                  <span className="font-mono text-xs font-bold text-text-primary">{id}</span>
                </div>
                {mod && <SIcon size={13} className={STATUS_COLOR[mod.status]} />}
              </div>
              <div className="font-sans text-xs text-text-primary font-semibold">{mod?.display ?? id}</div>
              <div className="font-sans text-2xs text-text-secondary leading-relaxed">{desc}</div>
              {mod && (
                <div className="pt-1 flex items-center justify-between font-mono text-2xs text-text-disabled">
                  <span>{mod.records.toLocaleString()} records</span>
                  <span className={cn(mod.errors > 0 ? "text-danger" : "")}>{mod.errors > 0 ? `${mod.errors} err` : "✓ clean"}</span>
                </div>
              )}
              <div className="flex gap-1.5 pt-1">
                <button disabled={!hasOracleConn} className="px-2 py-1 text-2xs font-mono rounded border border-border text-text-secondary hover:border-warning hover:text-warning transition-colors disabled:opacity-40">
                  Sync Now
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConnectorsPanel({ connectors }: { connectors: ConnectorConfig[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-sans text-xs font-semibold text-text-primary">Configured Connectors ({connectors.length})</span>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-sans font-semibold hover:bg-brand/90 transition-colors">
          + Add Connector
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connectors.map((c) => {
          const isSAP = c.system.startsWith("SAP");
          return (
            <div key={c.id} className="rounded-xl border border-border bg-surface p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {isSAP ? <Server size={16} className="text-brand" /> : <Database size={16} className="text-warning" />}
                  <div>
                    <div className="font-sans text-sm font-semibold text-text-primary">{c.name}</div>
                    <div className="font-mono text-2xs text-text-disabled">{c.url}</div>
                  </div>
                </div>
                <div className={cn("flex items-center gap-1 shrink-0 font-mono text-2xs px-2 py-1 rounded-full border", c.testOk ? "text-success border-success/30 bg-success/5" : "text-danger border-danger/30 bg-danger/5")}>
                  {c.testOk ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  {c.testOk ? "Connected" : "Unreachable"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <InfoCell label="System"   value={c.system} />
                <InfoCell label="Plant/Org" value={c.plant} />
                <InfoCell label="Team"     value={c.team} />
                <InfoCell label="Last Test" value={c.lastTest} />
              </div>

              <div className="flex gap-2 pt-1">
                <button className="flex-1 py-1.5 rounded-lg border border-border text-xs font-sans text-text-secondary hover:border-brand hover:text-brand transition-colors">
                  Test Connection
                </button>
                <button className="flex-1 py-1.5 rounded-lg border border-border text-xs font-sans text-text-secondary hover:border-brand hover:text-brand transition-colors">
                  Edit
                </button>
                <button className="flex-1 py-1.5 rounded-lg bg-brand/10 text-brand text-xs font-sans font-semibold hover:bg-brand/20 transition-colors">
                  Sync All Modules
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Teams & plants mapping */}
      <div className="rounded-xl border border-border bg-bg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="font-sans text-xs font-semibold text-text-primary">Team → ERP Plant / Org Mapping</span>
        </div>
        <div className="divide-y divide-border">
          {[
            { team: "Plant 1 — Pune",   erp: "SAP S/4HANA", plant: "IN01", modules: ["PP", "MM", "QM", "PM", "SD"] },
            { team: "Plant 2 — Chennai", erp: "SAP S/4HANA", plant: "IN02", modules: ["PP", "MM", "PM"] },
            { team: "Global MFG",        erp: "Oracle ERP Cloud", plant: "MFG01", modules: ["MFG", "WMS", "QUALITY"] },
          ].map(({ team, erp, plant, modules }) => (
            <div key={team} className="flex items-center gap-3 px-4 py-3">
              <Building2 size={12} className="text-text-disabled shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-sans text-xs font-semibold text-text-primary">{team}</div>
                <div className="font-mono text-2xs text-text-disabled">{erp} · Plant/Org {plant}</div>
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                {modules.map((m) => (
                  <span key={m} className="px-1.5 py-0.5 rounded text-2xs font-mono border border-border text-text-secondary">{m}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
