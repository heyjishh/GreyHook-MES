"use client";

import { useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  ClipboardList, Plus, Play, Pause, CheckCircle2,
  AlertCircle, Clock, Package, ChevronRight, RefreshCw,
} from "lucide-react";
import { useProductionOrders } from "@/hooks/api";
import { productionApi } from "@/lib/api";
import type { ProductionOrderSchema, ProductionOrderStatus } from "@/types/api";

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
};

type DisplayStatus = "running" | "scheduled" | "on_hold" | "completed" | "overdue" | "paused" | "cancelled";

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> }> = {
  running:   { label:"Running",   color: T.success, bg: T.successDim, icon: Play },
  scheduled: { label:"Scheduled", color: T.neutral, bg: T.neutralDim, icon: Clock },
  on_hold:   { label:"On Hold",   color: T.warning, bg: T.warningDim, icon: Pause },
  paused:    { label:"On Hold",   color: T.warning, bg: T.warningDim, icon: Pause },
  completed: { label:"Done",      color: T.muted,   bg: T.bgMuted,    icon: CheckCircle2 },
  cancelled: { label:"Cancelled", color: T.muted,   bg: T.bgMuted,    icon: CheckCircle2 },
  overdue:   { label:"Overdue",   color: T.danger,  bg: T.dangerDim,  icon: AlertCircle },
};

function computeElapsedPct(order: ProductionOrderSchema): number {
  if (!order.actual_start) return 0;
  const start = new Date(order.actual_start).getTime();
  const end   = new Date(order.planned_end).getTime();
  const now   = Date.now();
  if (end <= start) return 0;
  return Math.min((now - start) / (end - start), 1);
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch { return "—"; }
}

function ganttOption(orders: ProductionOrderSchema[]) {
  const statusColors: Record<string, string> = {
    running:   T.brand + "CC",
    scheduled: T.neutral + "88",
    paused:    T.warning + "AA",
    on_hold:   T.warning + "AA",
    completed: T.success + "66",
    cancelled: T.muted + "55",
    overdue:   T.danger + "AA",
  };

  const toMin = (iso: string) => {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    return ((h < 8 ? h + 24 : h) - 8) * 60 + m;
  };

  const lineIds = Array.from(new Set(orders.map((o) => o.line_id)));

  const data = orders.map((o) => {
    const li = lineIds.indexOf(o.line_id);
    const start = toMin(o.planned_start);
    const end   = toMin(o.planned_end);
    return {
      value: [li, start, end, o.order_number, o.status, o.product_code],
      itemStyle: { color: statusColors[o.status] ?? T.muted + "88", borderRadius: 4 },
    };
  });

  return {
    grid: { top: 24, bottom: 32, left: 60, right: 24 },
    xAxis: {
      type: "value", min: 0, max: 960,
      axisLabel: {
        formatter: (v: number) => {
          const h = Math.floor(v / 60) + 8;
          return `${String(h % 24).padStart(2,"0")}:00`;
        },
        fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono", interval: 60,
      },
      splitLine: { lineStyle: { color: T.grid, type: "dashed" } },
      axisLine: { lineStyle: { color: T.border } }, axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: lineIds.map((_, i) => `Line ${i + 1}`),
      axisLabel: { fontSize: 11, color: T.text, fontFamily: "IBM Plex Mono", fontWeight: 700 },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [{
      type: "custom",
      renderItem: (_: unknown, api: { value: (i: number) => number; coord: (v: number[]) => number[]; size: (v: number[]) => number[]; style: () => unknown }) => {
        const mi    = api.value(0);
        const start = api.value(1);
        const end   = api.value(2);
        const [x0, y0] = api.coord([start, mi]);
        const [x1]     = api.coord([end,   mi]);
        const height   = api.size([0, 1])[1] * 0.55;
        return {
          type: "rect",
          shape: { x: x0, y: y0 - height / 2, width: Math.max(x1 - x0, 4), height },
          style: api.style(),
        };
      },
      encode: { x: [1, 2], y: 0 },
      data,
    }],
    tooltip: {
      trigger: "item", backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 8,
      textStyle: { color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono" },
      formatter: (p: { value: unknown[] }) => {
        const v = p.value as [number, number, number, string, string, string];
        return `<b>${v[3]}</b><br/>${v[5]}<br/>Status: ${v[4]}`;
      },
    },
    animation: false,
  };
}

export default function WorkOrdersPage() {
  const { data: apiOrders = [], isLoading, refetch } = useProductionOrders();
  const [localOrders, setLocalOrders] = useState<ProductionOrderSchema[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | ProductionOrderStatus>("all");
  const [expanded, setExpanded]  = useState<string | null>(null);
  const [updating, setUpdating]  = useState<string | null>(null);

  const orders = localOrders ?? apiOrders;

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const updated = await productionApi.updateOrderStatus(orderId, newStatus);
      setLocalOrders((prev) => (prev ?? orders).map((o) => o.id === orderId ? updated : o));
    } catch {}
    setUpdating(null);
  };

  const visible = statusFilter === "all"
    ? orders
    : orders.filter((o) => o.status === statusFilter);

  const running   = orders.filter((o) => o.status === "running").length;
  const scheduled = orders.filter((o) => o.status === "scheduled").length;
  const totalGood = orders.reduce((s, o) => s + (o.actual_qty - o.rejected_qty), 0);

  return (
    <div className="max-w-[1280px] mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Work Orders</h1>
          <p className="font-mono text-xs text-text-tertiary mt-0.5">Production queue · machine assignment · progress tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setLocalOrders(null); refetch(); }}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-text-secondary border border-border rounded-lg px-3 py-2 hover:bg-bg-subtle transition-colors"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Running",    value: running.toString(),           color: T.success, bg: T.successDim, icon: Play },
          { label:"Scheduled",  value: scheduled.toString(),         color: T.neutral, bg: T.neutralDim, icon: Clock },
          { label:"Orders",     value: orders.length.toString(),     color: T.brand,   bg: T.brandDim,   icon: ClipboardList },
          { label:"Good Parts", value: totalGood.toLocaleString(),   color: T.brand,   bg: T.brandDim,   icon: Package },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                <Icon size={13} style={{ color }} />
              </div>
            </div>
            <p className="font-mono text-2xl font-black leading-none tabular-nums" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {orders.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-text-primary">Machine Schedule — Gantt</h2>
            <div className="flex items-center gap-4">
              {(["running","scheduled","on_hold","completed"] as const).map((s) => {
                const cfg = STATUS_CFG[s];
                return (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded" style={{ background: cfg.color + "AA" }} />
                    <span className="font-mono text-2xs text-text-disabled">{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <ReactECharts option={ganttOption(orders)} style={{ height: 160 }} opts={{ renderer: "svg" }} />
        </div>
      )}

      <div className="flex items-center gap-1 bg-bg-subtle border border-border rounded-lg p-0.5 w-fit">
        {(["all","running","scheduled","paused","completed","cancelled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f === "all" ? "all" : f as ProductionOrderStatus)}
            className="font-mono text-xs px-3 py-1.5 rounded-md capitalize transition-all"
            style={statusFilter === f ? { background: T.brand, color: "#fff", fontWeight: 700 } : { color: T.muted }}
          >
            {f.replace("_"," ")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center font-mono text-xs text-text-disabled py-10">Loading work orders…</div>
      ) : visible.length === 0 ? (
        <div className="text-center font-mono text-xs text-text-disabled py-10">No work orders found</div>
      ) : (
        <div className="space-y-2 pb-8">
          {visible.map((order) => {
            const st = STATUS_CFG[order.status] ?? STATUS_CFG.scheduled;
            const StIcon = st.icon;
            const pct = order.planned_qty > 0 ? order.actual_qty / order.planned_qty : 0;
            const fpy = order.actual_qty > 0 ? ((order.actual_qty - order.rejected_qty) / order.actual_qty) * 100 : null;
            const isOpen = expanded === order.id;
            const elapsedPct = computeElapsedPct(order);
            const isUpdating = updating === order.id;

            return (
              <div key={order.id} className="bg-white rounded-xl shadow-card overflow-hidden">
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-bg-subtle transition-colors"
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                >
                  <div className="w-1 self-stretch rounded-full" style={{ background: T.brand }} />

                  <div className="min-w-0 flex-1 grid grid-cols-[1fr_8rem_8rem_6rem_2rem] items-center gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-text-primary">{order.order_number}</span>
                        <span
                          className="inline-flex items-center gap-1 font-mono text-2xs font-semibold rounded-full px-2 py-0.5"
                          style={{ background: st.bg, color: st.color }}
                        >
                          <StIcon size={9} />
                          {st.label}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-text-disabled mt-0.5">{order.product_code}</p>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-sm font-black tabular-nums" style={{ color: T.brand }}>{order.actual_qty}</span>
                        <span className="font-mono text-2xs text-text-disabled">/ {order.planned_qty}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-bg-muted mt-1 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(pct * 100, 100)}%`, background: T.brand }}
                        />
                      </div>
                    </div>

                    <div>
                      <p className="font-mono text-xs font-bold tabular-nums" style={{ color: fpy !== null && fpy >= 97 ? T.success : T.warning }}>
                        {fpy !== null ? `${fpy.toFixed(1)}%` : "—"}
                      </p>
                      <p className="font-mono text-2xs text-text-disabled">{order.rejected_qty} rejected</p>
                    </div>

                    <div>
                      <p className="font-mono text-xs text-text-secondary tabular-nums">{formatTime(order.planned_start)} → {formatTime(order.planned_end)}</p>
                      <p className="font-mono text-2xs text-text-disabled">{Math.round(elapsedPct * 100)}% elapsed</p>
                    </div>

                    <ChevronRight
                      size={14}
                      className="text-text-disabled transition-transform"
                      style={{ transform: isOpen ? "rotate(90deg)" : "none" }}
                    />
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border px-5 py-4 bg-bg-subtle">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-4">
                      {[
                        { label: "Good Parts",   value: (order.actual_qty - order.rejected_qty).toLocaleString(), color: T.success },
                        { label: "Rejected",     value: order.rejected_qty.toString(),                             color: T.danger },
                        { label: "Remaining",    value: Math.max(order.planned_qty - order.actual_qty, 0).toLocaleString(), color: T.neutral },
                        { label: "FPY",          value: fpy !== null ? `${fpy.toFixed(2)}%` : "—",                color: fpy !== null && fpy >= 97 ? T.success : T.warning },
                      ].map(({ label, value, color }) => (
                        <div key={label}>
                          <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mb-1">{label}</p>
                          <p className="font-mono text-xl font-black tabular-nums" style={{ color }}>{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      {order.status === "running" && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(order.id, "paused")}
                            disabled={isUpdating}
                            className="font-mono text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-bg-muted transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Pause size={11} /> Hold Order
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(order.id, "completed")}
                            disabled={isUpdating}
                            className="font-mono text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50"
                            style={{ background: T.success, color:"#fff" }}
                          >
                            <CheckCircle2 size={11} /> Complete
                          </button>
                        </>
                      )}
                      {(order.status === "paused") && (
                        <button
                          onClick={() => handleStatusUpdate(order.id, "running")}
                          disabled={isUpdating}
                          className="font-mono text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50"
                          style={{ background: T.brand, color:"#fff" }}
                        >
                          <Play size={11} /> Resume
                        </button>
                      )}
                      {order.status === "scheduled" && (
                        <button
                          onClick={() => handleStatusUpdate(order.id, "running")}
                          disabled={isUpdating}
                          className="font-mono text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50"
                          style={{ background: T.brand, color:"#fff" }}
                        >
                          <Play size={11} /> Start Now
                        </button>
                      )}
                      {isUpdating && <RefreshCw size={12} className="animate-spin text-text-disabled" />}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
