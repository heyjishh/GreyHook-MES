"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Clock, Layers } from "lucide-react";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

interface ScheduledOrder {
  id: string;
  product: string;
  qty: number;
  machine: string;
  startHour: number;
  durationHours: number;
  status: "scheduled" | "in_progress" | "complete" | "delayed" | "conflict";
  priority: "urgent" | "high" | "normal" | "low";
  dueDate: string;
  setup: number;
}

const MACHINES = ["CNC-001", "PRESS-002", "WELD-003", "QC-004", "ASSY-005"];

const BASE_ORDERS: ScheduledOrder[] = [
  { id: "PO-2026-11-001", product: "ENG-MNT-V2", qty: 200, machine: "CNC-001", startHour: 6, durationHours: 3.5, status: "complete", priority: "high", dueDate: "2026-11-06", setup: 0.5 },
  { id: "PO-2026-11-002", product: "BRK-ASY-X4", qty: 150, machine: "CNC-001", startHour: 10, durationHours: 2.5, status: "in_progress", priority: "urgent", dueDate: "2026-11-06", setup: 0.5 },
  { id: "PO-2026-11-003", product: "SHAFT-V7", qty: 80, machine: "CNC-001", startHour: 13, durationHours: 4, status: "scheduled", priority: "normal", dueDate: "2026-11-07", setup: 0.5 },
  { id: "PO-2026-11-004", product: "FRAME-STL-02", qty: 50, machine: "PRESS-002", startHour: 7, durationHours: 5, status: "in_progress", priority: "high", dueDate: "2026-11-06", setup: 0.75 },
  { id: "PO-2026-11-005", product: "PLATE-4MM", qty: 300, machine: "PRESS-002", startHour: 13, durationHours: 3, status: "conflict", priority: "normal", dueDate: "2026-11-06", setup: 0.5 },
  { id: "PO-2026-11-006", product: "ARM-WELD-C3", qty: 40, machine: "WELD-003", startHour: 8, durationHours: 6, status: "in_progress", priority: "urgent", dueDate: "2026-11-06", setup: 1 },
  { id: "PO-2026-11-007", product: "TUBE-WELD-5", qty: 120, machine: "WELD-003", startHour: 15, durationHours: 3, status: "delayed", priority: "high", dueDate: "2026-11-06", setup: 0.5 },
  { id: "PO-2026-11-008", product: "ENG-MNT-V2", qty: 200, machine: "QC-004", startHour: 9.5, durationHours: 1.5, status: "in_progress", priority: "high", dueDate: "2026-11-06", setup: 0 },
  { id: "PO-2026-11-009", product: "SHAFT-V7", qty: 80, machine: "ASSY-005", startHour: 10, durationHours: 4, status: "scheduled", priority: "normal", dueDate: "2026-11-07", setup: 0.5 },
  { id: "PO-2026-11-010", product: "BRK-CABLE-01", qty: 500, machine: "ASSY-005", startHour: 15, durationHours: 3.5, status: "scheduled", priority: "low", dueDate: "2026-11-08", setup: 0.25 },
];

const STATUS_CONFIG = {
  scheduled:   { color: "#2563EB", bg: "rgba(37,99,235,0.15)", label: "Scheduled" },
  in_progress: { color: "#1A7A40", bg: "rgba(26,122,64,0.15)", label: "In Progress" },
  complete:    { color: "#6B7280", bg: "rgba(107,114,128,0.15)", label: "Complete" },
  delayed:     { color: "#CC1800", bg: "rgba(204,24,0,0.15)", label: "Delayed" },
  conflict:    { color: "#A85E00", bg: "rgba(168,94,0,0.15)", label: "Conflict" },
};

const PRIORITY_CONFIG = {
  urgent: { color: "#CC1800", label: "Urgent" },
  high:   { color: "#A85E00", label: "High" },
  normal: { color: "#2563EB", label: "Normal" },
  low:    { color: "#6B7280", label: "Low" },
};

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5);
const SHIFT_END = 23;
const SHIFT_START = 5;

function HourLabel({ h }: { h: number }) {
  const ampm = h < 12 ? "AM" : "PM";
  const disp = h === 12 ? 12 : h > 12 ? h - 12 : h;
  return <span>{disp}{ampm}</span>;
}

export default function SchedulingPage() {
  const [selectedOrder, setSelectedOrder] = useState<ScheduledOrder | null>(null);
  const [view, setView] = useState<"gantt" | "list">("gantt");
  const [filterMachine, setFilterMachine] = useState<string>("all");

  const totalHours = SHIFT_END - SHIFT_START;
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const nowPct = Math.max(0, Math.min(100, ((currentHour - SHIFT_START) / totalHours) * 100));

  const filteredOrders = filterMachine === "all" ? BASE_ORDERS : BASE_ORDERS.filter(o => o.machine === filterMachine);

  const conflicts = BASE_ORDERS.filter(o => o.status === "conflict");
  const delayed = BASE_ORDERS.filter(o => o.status === "delayed");
  const utilization = MACHINES.map(m => {
    const machineOrders = BASE_ORDERS.filter(o => o.machine === m && o.status !== "scheduled");
    const busy = machineOrders.reduce((s, o) => s + o.durationHours, 0);
    return { machine: m, pct: Math.round((busy / 16) * 100) };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary">Production Scheduling</h1>
          <p className="font-sans text-xs text-text-tertiary mt-0.5">Gantt dispatch board · Shift: 05:00 – 23:00 · Today</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {conflicts.length > 0 && (
            <div className="flex items-center gap-1.5 bg-warning/10 border border-warning/30 rounded-lg px-3 py-1.5">
              <AlertTriangle size={12} className="text-warning" />
              <span className="font-sans text-xs text-warning font-medium">{conflicts.length} conflict{conflicts.length > 1 ? "s" : ""}</span>
            </div>
          )}
          {delayed.length > 0 && (
            <div className="flex items-center gap-1.5 bg-danger/10 border border-danger/30 rounded-lg px-3 py-1.5">
              <Clock size={12} className="text-danger" />
              <span className="font-sans text-xs text-danger font-medium">{delayed.length} delayed</span>
            </div>
          )}
          <div className="flex border border-border rounded-lg overflow-hidden">
            {(["gantt", "list"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 font-mono text-2xs uppercase tracking-widest transition-colors ${view === v ? "bg-brand text-white" : "text-text-tertiary hover:text-text-primary"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Machine utilization strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {utilization.map(u => (
          <div key={u.machine} className="bg-surface border border-border rounded-xl p-3">
            <div className="flex justify-between items-baseline mb-2">
              <span className="font-mono text-2xs text-text-secondary">{u.machine}</span>
              <span className={`font-mono text-xs font-bold ${u.pct >= 85 ? "text-danger" : u.pct >= 70 ? "text-warning" : "text-success"}`}>{u.pct}%</span>
            </div>
            <div className="h-1.5 bg-bg rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${u.pct}%`, background: u.pct >= 85 ? "#CC1800" : u.pct >= 70 ? "#A85E00" : "#1A7A40" }} />
            </div>
          </div>
        ))}
      </div>

      {view === "gantt" ? (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {/* Filter bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-wrap">
            <span className="font-mono text-2xs text-text-tertiary uppercase tracking-widest">Filter:</span>
            {["all", ...MACHINES].map(m => (
              <button key={m} onClick={() => setFilterMachine(m)}
                className={`px-2 py-0.5 rounded font-mono text-2xs uppercase tracking-widest transition-colors ${filterMachine === m ? "bg-brand text-white" : "bg-bg text-text-tertiary hover:text-text-primary border border-border"}`}>
                {m}
              </button>
            ))}
          </div>

          {/* Gantt chart */}
          <div className="overflow-x-auto">
            <div style={{ minWidth: 760 }}>
              {/* Time header */}
              <div className="flex border-b border-border">
                <div className="w-28 shrink-0 px-3 py-2 font-mono text-2xs text-text-tertiary uppercase tracking-widest border-r border-border">Machine</div>
                <div className="flex-1 relative">
                  <div className="flex">
                    {HOURS.map(h => (
                      <div key={h} className="flex-1 text-center py-2 font-mono text-2xs text-text-tertiary border-r border-border/40 last:border-r-0">
                        <HourLabel h={h} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Machine rows */}
              {MACHINES.filter(m => filterMachine === "all" || m === filterMachine).map(machine => {
                const orders = filteredOrders.filter(o => o.machine === machine);
                return (
                  <div key={machine} className="flex border-b border-border hover:bg-bg/40 transition-colors" style={{ minHeight: 52 }}>
                    <div className="w-28 shrink-0 px-3 py-2 font-mono text-xs text-text-secondary border-r border-border flex items-center">{machine}</div>
                    <div className="flex-1 relative py-1">
                      {/* Hour grid lines */}
                      {HOURS.map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 border-r border-border/20"
                          style={{ left: `${(i / HOURS.length) * 100}%` }} />
                      ))}
                      {/* Now indicator */}
                      <div className="absolute top-0 bottom-0 w-px bg-brand/60 z-10" style={{ left: `${nowPct}%` }}>
                        <div className="absolute -top-0 left-0.5 font-mono text-2xs text-brand">NOW</div>
                      </div>
                      {/* Order blocks */}
                      {orders.map(order => {
                        const left = ((order.startHour - SHIFT_START) / totalHours) * 100;
                        const width = (order.durationHours / totalHours) * 100;
                        const setupWidth = (order.setup / totalHours) * 100;
                        const cfg = STATUS_CONFIG[order.status];
                        return (
                          <div key={order.id} className="absolute top-1 bottom-1 group cursor-pointer"
                            style={{ left: `${left}%`, width: `${width + setupWidth}%` }}
                            onClick={() => setSelectedOrder(order === selectedOrder ? null : order)}>
                            {/* Setup time block */}
                            {order.setup > 0 && (
                              <div className="absolute top-0 bottom-0 bg-bg border border-border/60 rounded-l opacity-80"
                                style={{ width: `${(setupWidth / (width + setupWidth)) * 100}%` }}>
                                <div className="h-full flex items-center justify-center">
                                  <span className="font-mono text-2xs text-text-tertiary rotate-0 leading-none">S</span>
                                </div>
                              </div>
                            )}
                            {/* Main order block */}
                            <div className="absolute top-0 bottom-0 rounded flex items-center px-1.5 overflow-hidden transition-all group-hover:ring-1 ring-white/30"
                              style={{
                                left: `${(setupWidth / (width + setupWidth)) * 100}%`,
                                right: 0,
                                background: cfg.bg,
                                borderLeft: `2.5px solid ${cfg.color}`,
                              }}>
                              <span className="font-mono text-2xs truncate leading-none" style={{ color: cfg.color }}>
                                {order.product} ×{order.qty}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 px-4 py-3 border-t border-border">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: v.color }} />
                <span className="font-mono text-2xs text-text-tertiary">{v.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-bg border border-border" />
              <span className="font-mono text-2xs text-text-tertiary">Setup</span>
            </div>
          </div>
        </div>
      ) : (
        /* List view */
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead className="border-b border-border">
                <tr>
                  {["Order", "Product", "Qty", "Machine", "Start", "Duration", "Status", "Priority", "Due Date"].map(h => (
                    <th key={h} className="text-left text-text-tertiary font-medium py-3 px-3 uppercase tracking-widest text-2xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {BASE_ORDERS.map(o => {
                  const cfg = STATUS_CONFIG[o.status];
                  const pc = PRIORITY_CONFIG[o.priority];
                  const startStr = `${String(Math.floor(o.startHour)).padStart(2, "0")}:${String(Math.round((o.startHour % 1) * 60)).padStart(2, "0")}`;
                  return (
                    <tr key={o.id} className="hover:bg-bg/50 cursor-pointer" onClick={() => setSelectedOrder(o === selectedOrder ? null : o)}>
                      <td className="py-2 px-3 text-brand font-semibold">{o.id}</td>
                      <td className="py-2 px-3 text-text-primary">{o.product}</td>
                      <td className="py-2 px-3 text-text-secondary">{o.qty}</td>
                      <td className="py-2 px-3 text-text-secondary">{o.machine}</td>
                      <td className="py-2 px-3 text-text-secondary">{startStr}</td>
                      <td className="py-2 px-3 text-text-secondary">{o.durationHours}h</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-full text-2xs" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-semibold" style={{ color: pc.color }}>{pc.label}</span>
                      </td>
                      <td className="py-2 px-3 text-text-tertiary">{o.dueDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order detail panel */}
      {selectedOrder && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-heading text-sm font-bold text-text-primary">{selectedOrder.id}</p>
              <p className="font-sans text-xs text-text-tertiary">{selectedOrder.product} · {selectedOrder.machine}</p>
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-1 rounded-full font-mono text-2xs uppercase" style={{ background: STATUS_CONFIG[selectedOrder.status].bg, color: STATUS_CONFIG[selectedOrder.status].color }}>
                {STATUS_CONFIG[selectedOrder.status].label}
              </span>
              <span className="px-2 py-1 rounded-full font-mono text-2xs uppercase bg-bg border border-border" style={{ color: PRIORITY_CONFIG[selectedOrder.priority].color }}>
                {PRIORITY_CONFIG[selectedOrder.priority].label}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Quantity", value: selectedOrder.qty.toString() },
              { label: "Duration", value: `${selectedOrder.durationHours}h` },
              { label: "Setup Time", value: `${selectedOrder.setup * 60}m` },
              { label: "Due Date", value: selectedOrder.dueDate },
            ].map(d => (
              <div key={d.label} className="bg-bg rounded-lg p-3 border border-border">
                <p className="font-mono text-2xs text-text-tertiary uppercase tracking-widest mb-1">{d.label}</p>
                <p className="font-mono text-sm font-bold text-text-primary">{d.value}</p>
              </div>
            ))}
          </div>
          {selectedOrder.status === "conflict" && (
            <div className="mt-3 flex items-center gap-2 bg-warning/8 border border-warning/20 rounded-lg px-3 py-2">
              <AlertTriangle size={13} className="text-warning shrink-0" />
              <p className="font-sans text-xs text-warning">Schedule conflict detected — overlap with another order on {selectedOrder.machine}. Reschedule or reassign machine.</p>
            </div>
          )}
          {selectedOrder.status === "delayed" && (
            <div className="mt-3 flex items-center gap-2 bg-danger/8 border border-danger/20 rounded-lg px-3 py-2">
              <Clock size={13} className="text-danger shrink-0" />
              <p className="font-sans text-xs text-danger">Order is running behind schedule — started late due to upstream downtime event. Due date at risk.</p>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button className="px-4 py-1.5 bg-brand text-white rounded-lg font-sans text-xs font-semibold hover:bg-brand/90 transition-colors">Reschedule</button>
            <button className="px-4 py-1.5 bg-surface border border-border text-text-primary rounded-lg font-sans text-xs hover:bg-bg transition-colors">Reassign Machine</button>
            <button className="px-4 py-1.5 bg-surface border border-border text-text-primary rounded-lg font-sans text-xs hover:bg-bg transition-colors">View Work Order</button>
          </div>
        </div>
      )}
    </div>
  );
}
