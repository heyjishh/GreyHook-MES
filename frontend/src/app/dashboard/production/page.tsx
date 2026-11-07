"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { ProductionProgress } from "@/components/ui/ProductionProgress";
import { useProductionOrders, useCurrentProduction } from "@/hooks/api";
import type { ProductionOrderSchema, ProductionOrderStatus } from "@/types/api";

const T = {
  brand:    "#F05230", brandDim:   "#FEF0EB",
  success:  "#1A7A40", successDim: "#E8F5EC",
  warning:  "#A85E00", warningDim: "#FEF0D6",
  danger:   "#CC1800", dangerDim:  "#FDE8E4",
  neutral:  "#6A8A9A", neutralDim: "#F0ECE8",
  border:   "#E8E4DF", text:       "#001C2E",
  muted:    "#6A8A9A", disabled:   "#B0C4CE",
  bg:       "#FFFFFF", bgSubtle:   "#FAFAF8",
  bgMuted:  "#F4F0EC", grid:       "#F0ECE8",
  axis:     "#B0C4CE",
};

const MOCK_UNITS_PER_HOUR = [42, 45, 38, 44, 29, 43, 46, 44];
const SHIFT_HOURS = ["06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00"];
const UNIT_TARGET = 50;

const STATUS_CFG: Record<ProductionOrderStatus, { label: string; color: string; bg: string }> = {
  running:   { label: "Running",   color: T.success, bg: T.successDim },
  scheduled: { label: "Scheduled", color: T.brand,   bg: T.brandDim   },
  paused:    { label: "Paused",    color: T.warning,  bg: T.warningDim },
  completed: { label: "Completed", color: T.neutral,  bg: T.neutralDim },
  cancelled: { label: "Cancelled", color: T.danger,   bg: T.dangerDim  },
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: ProductionOrderStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className="inline-block font-mono text-2xs font-bold px-2.5 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function throughputOption() {
  const colors = MOCK_UNITS_PER_HOUR.map((v) =>
    v >= UNIT_TARGET ? T.success : v >= 40 ? T.brand : T.warning
  );
  return {
    grid: { top: 24, bottom: 36, left: 44, right: 20 },
    xAxis: {
      type: "category", data: SHIFT_HOURS,
      axisLine: { lineStyle: { color: T.border } },
      axisTick: { show: false },
      axisLabel: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
    },
    yAxis: {
      type: "value", min: 0, max: 60,
      axisLabel: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
      splitLine: { lineStyle: { color: T.grid, type: "dashed" } },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [{
      type: "bar",
      data: MOCK_UNITS_PER_HOUR.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [3, 3, 0, 0] } })),
      barMaxWidth: 40,
      markLine: {
        silent: true, symbol: "none",
        data: [{ yAxis: UNIT_TARGET, lineStyle: { color: T.success, type: "dashed", width: 1.5 },
          label: { formatter: `Target ${UNIT_TARGET}/hr`, fontSize: 10, color: T.success, fontFamily: "IBM Plex Mono", position: "insideStartTop" } }],
      },
    }],
    tooltip: {
      trigger: "axis", backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 8,
      textStyle: { color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono" },
      formatter: (p: { name: string; value: number }[]) => `${p[0].name}: <b>${p[0].value} units</b>`,
    },
    animation: true,
  };
}

function TimelineBar({ order }: { order: ProductionOrderSchema }) {
  const cfg = STATUS_CFG[order.status];
  const dayStart = new Date(order.planned_start);
  dayStart.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;

  const pStart = (new Date(order.planned_start).getTime() - dayStart.getTime()) / dayMs * 100;
  const pEnd   = (new Date(order.planned_end).getTime()   - dayStart.getTime()) / dayMs * 100;
  const pWidth = pEnd - pStart;

  const aStart = order.actual_start
    ? (new Date(order.actual_start).getTime() - dayStart.getTime()) / dayMs * 100
    : null;
  const aEnd = order.actual_end
    ? (new Date(order.actual_end).getTime() - dayStart.getTime()) / dayMs * 100
    : order.status === "running" ? (Date.now() - dayStart.getTime()) / dayMs * 100 : null;
  const aWidth = aStart !== null && aEnd !== null ? aEnd - aStart : null;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <div className="w-32 shrink-0">
        <p className="font-mono text-xs font-bold text-text-primary">{order.order_number}</p>
        <p className="font-sans text-2xs text-text-disabled truncate">{order.product_code}</p>
      </div>
      <div className="flex-1 relative h-6 bg-bg-muted rounded-md overflow-hidden">
        <div
          className="absolute top-0 bottom-0 rounded"
          title={`Planned: ${formatTimeOnly(order.planned_start)} – ${formatTimeOnly(order.planned_end)}`}
          style={{ left: `${pStart}%`, width: `${pWidth}%`, background: cfg.color + "30", border: `1px solid ${cfg.color}60` }}
        />
        {aStart !== null && aWidth !== null && (
          <div
            className="absolute top-1 bottom-1 rounded"
            title={`Actual: ${formatTimeOnly(order.actual_start!)}${order.actual_end ? ` – ${formatTimeOnly(order.actual_end)}` : " (open)"}`}
            style={{ left: `${aStart}%`, width: `${Math.max(aWidth, 0.5)}%`, background: cfg.color + "CC" }}
          />
        )}
      </div>
      <StatusBadge status={order.status} />
    </div>
  );
}

function OrderCard({ order }: { order: ProductionOrderSchema }) {
  const pct     = order.planned_qty > 0 ? order.actual_qty / order.planned_qty : 0;
  const goodQty = order.actual_qty - order.rejected_qty;
  const cfg     = STATUS_CFG[order.status];

  return (
    <div className="bg-bg-subtle rounded-xl p-4 border border-border">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-mono text-xs text-text-disabled">{order.order_number}</p>
          <p className="font-sans text-base font-semibold text-text-primary mt-0.5">{order.product_code}</p>
        </div>
        <span className="inline-block font-mono text-2xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
          {cfg.label}
        </span>
      </div>
      <ProductionProgress actual={order.actual_qty} planned={order.planned_qty} />
      <div className="flex gap-6 mt-3">
        {[
          { label: "Good",     v: goodQty.toLocaleString(),              color: T.success },
          { label: "Rejected", v: order.rejected_qty.toLocaleString(),   color: T.danger  },
          { label: "Progress", v: `${(pct * 100).toFixed(1)}%`,          color: T.brand   },
        ].map(({ label, v, color }) => (
          <div key={label}>
            <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{label}</p>
            <p className="font-mono text-sm font-bold tabular-nums mt-0.5" style={{ color }}>{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProductionPage() {
  const { data: orders,      isLoading: ordersLoading  } = useProductionOrders();
  const { data: currentProd, isLoading: currentLoading } = useCurrentProduction();

  const { activeOrders, completedOrders, cancelledOrders } = useMemo(() => {
    const all = orders ?? [];
    return {
      activeOrders:    all.filter((o) => o.status === "running" || o.status === "scheduled" || o.status === "paused"),
      completedOrders: all.filter((o) => o.status === "completed"),
      cancelledOrders: all.filter((o) => o.status === "cancelled"),
    };
  }, [orders]);

  const avgUph  = Math.round(MOCK_UNITS_PER_HOUR.reduce((s, v) => s + v, 0) / MOCK_UNITS_PER_HOUR.length);
  const fpy     = currentProd ? (((currentProd.actual_qty - currentProd.rejected_qty) / Math.max(currentProd.actual_qty, 1)) * 100).toFixed(1) : "—";
  const compPct = currentProd ? (currentProd.completion_pct * 100).toFixed(1) : "—";

  return (
    <div className="max-w-[1280px] mx-auto space-y-5">

      <div>
        <h1 className="text-lg font-semibold text-text-primary">Production Tracking</h1>
        <p className="font-mono text-xs text-text-tertiary mt-0.5">Shift 2 · {currentProd?.product_code ?? "—"} · current order</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active Orders",  value: activeOrders.length.toString(),                            color: T.success, bg: T.successDim },
          { label: "Completed",      value: completedOrders.length.toString(),                         color: T.text,    bg: T.bgSubtle   },
          { label: "Cancelled",      value: cancelledOrders.length.toString(),                         color: T.danger,  bg: T.dangerDim  },
          { label: "Units Today",    value: currentProd?.actual_qty.toLocaleString() ?? "—",           color: T.brand,   bg: T.brandDim   },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-card">
            <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mb-2">{label}</p>
            <p className="font-mono text-3xl font-black tabular-nums leading-none" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {[
          { label: "FPY",        value: `${fpy}%`,       color: T.success, bg: T.successDim },
          { label: "Rejected",   value: currentProd?.rejected_qty.toString() ?? "—", color: T.danger,  bg: T.dangerDim  },
          { label: "Completion", value: `${compPct}%`,   color: T.brand,   bg: T.brandDim   },
          { label: "Avg pts/hr", value: `${avgUph}`,     color: T.text,    bg: T.bgSubtle   },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: bg }}>
            <span className="font-mono text-2xs text-text-disabled">{label}</span>
            <span className="font-mono text-xs font-bold" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-text-primary">Throughput — Units / Hour</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: T.success }} />
              <span className="font-mono text-2xs text-text-disabled">At / above target</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: T.brand }} />
              <span className="font-mono text-2xs text-text-disabled">Below target</span>
            </div>
          </div>
        </div>
        <p className="font-mono text-2xs text-text-disabled mb-3">Shift 1 · 06:00 – 14:00 · target {UNIT_TARGET} units/hr</p>
        <ReactECharts option={throughputOption()} style={{ height: 180 }} opts={{ renderer: "svg" }} />
      </div>

      <section>
        {ordersLoading || currentLoading ? (
          <LoadingCard rows={3} />
        ) : (
          <div className="bg-white rounded-xl p-5 shadow-card">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Active Orders</h2>
            {activeOrders.length > 0 ? (
              <div className="space-y-3">
                {activeOrders.map((order) => <OrderCard key={order.id} order={order} />)}
              </div>
            ) : (
              <p className="font-sans text-sm text-text-disabled py-4 text-center">No active orders</p>
            )}
          </div>
        )}
      </section>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-xs font-bold text-text-primary">Shift Timeline</h2>
          <p className="font-mono text-2xs text-text-disabled mt-0.5">Planned (outline) vs actual (filled) · 24h scale</p>
        </div>
        <div className="px-5 py-3">
          <div className="flex items-center gap-3 mb-2 pb-2 border-b border-border">
            <div className="w-32 shrink-0 font-mono text-2xs text-text-disabled">Order</div>
            <div className="flex-1 flex justify-between font-mono text-2xs text-text-disabled">
              {["00:00","06:00","12:00","18:00","24:00"].map((t) => <span key={t}>{t}</span>)}
            </div>
            <div className="w-20 shrink-0" />
          </div>
          {(orders ?? []).map((order) => <TimelineBar key={order.id} order={order} />)}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden pb-2">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-xs font-bold text-text-primary">All Orders</h2>
        </div>
        {ordersLoading ? (
          <div className="h-32 bg-bg-subtle animate-pulse m-4 rounded-xl" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-subtle">
                  {["Order #","Product","Status","Planned","Actual","Rejected","Start","End"].map((col) => (
                    <th key={col} className="text-left font-mono text-2xs text-text-disabled px-5 py-3 uppercase tracking-widest whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(orders ?? []).map((order) => (
                  <tr key={order.id} className="border-t border-border hover:bg-bg-subtle transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-bold whitespace-nowrap" style={{ color: T.brand }}>{order.order_number}</td>
                    <td className="px-5 py-3 font-mono text-xs text-text-primary whitespace-nowrap">{order.product_code}</td>
                    <td className="px-5 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-5 py-3 font-mono text-xs text-text-secondary text-right tabular-nums">{order.planned_qty.toLocaleString()}</td>
                    <td className="px-5 py-3 font-mono text-xs text-text-secondary text-right tabular-nums">{order.actual_qty.toLocaleString()}</td>
                    <td className="px-5 py-3 font-mono text-xs text-right tabular-nums" style={{ color: order.rejected_qty > 0 ? T.danger : T.muted }}>
                      {order.rejected_qty.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-text-disabled whitespace-nowrap">{formatDateTime(order.planned_start)}</td>
                    <td className="px-5 py-3 font-mono text-xs text-text-disabled whitespace-nowrap">{formatDateTime(order.planned_end)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
