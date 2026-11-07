"use client";

import { useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  ClipboardList, Plus, Play, Pause, CheckCircle2,
  AlertCircle, Clock, Package, ChevronRight, Filter,
} from "lucide-react";

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

type OrderStatus = "running" | "scheduled" | "on_hold" | "completed" | "overdue";

interface WorkOrder {
  id: string;
  orderNo: string;
  product: string;
  partCode: string;
  machine: string;
  machineId: string;
  priority: "critical" | "high" | "normal";
  status: OrderStatus;
  planned: number;
  actual: number;
  rejected: number;
  startTime: string;
  endTime: string;
  elapsedPct: number;
  cycle: string;
}

const ORDERS: WorkOrder[] = [
  {
    id:"WO-2024-091", orderNo:"WO-2024-091", product:"Engine Mount Bracket — Type V2",
    partCode:"AP-EMB-V2-LH", machine:"AP-ENGINE-MOUNT-V2", machineId:"M-01",
    priority:"critical", status:"running",
    planned:500, actual:312, rejected:8, startTime:"16:00", endTime:"00:00",
    elapsedPct:0.72, cycle:"45s",
  },
  {
    id:"WO-2024-092", orderNo:"WO-2024-092", product:"Chassis Frame Weldment",
    partCode:"AP-CFW-003-RH", machine:"AP-FRAME-WELD-01", machineId:"M-02",
    priority:"high", status:"running",
    planned:200, actual:72, rejected:6, startTime:"17:00", endTime:"01:00",
    elapsedPct:0.44, cycle:"2m10s",
  },
  {
    id:"WO-2024-093", orderNo:"WO-2024-093", product:"Stamped Body Panel — Rear Quarter",
    partCode:"AP-BP-RQ-004", machine:"AP-PRESS-FORM-03", machineId:"M-03",
    priority:"normal", status:"on_hold",
    planned:800, actual:31, rejected:3, startTime:"18:00", endTime:"04:00",
    elapsedPct:0.12, cycle:"28s",
  },
  {
    id:"WO-2024-094", orderNo:"WO-2024-094", product:"Final Assembly — Suspension Kit",
    partCode:"AP-SK-FRT-A", machine:"AP-ASSEM-LINE-A", machineId:"M-04",
    priority:"high", status:"running",
    planned:100, actual:68, rejected:1, startTime:"16:00", endTime:"21:00",
    elapsedPct:0.80, cycle:"4m30s",
  },
  {
    id:"WO-2024-089", orderNo:"WO-2024-089", product:"Engine Mount Bracket — Type V1",
    partCode:"AP-EMB-V1-LH", machine:"AP-ENGINE-MOUNT-V2", machineId:"M-01",
    priority:"normal", status:"completed",
    planned:400, actual:400, rejected:4, startTime:"08:00", endTime:"16:00",
    elapsedPct:1.0, cycle:"45s",
  },
  {
    id:"WO-2024-095", orderNo:"WO-2024-095", product:"Gear Housing — Type 7",
    partCode:"AP-GH-T7-003", machine:"AP-PRESS-FORM-03", machineId:"M-03",
    priority:"high", status:"scheduled",
    planned:600, actual:0, rejected:0, startTime:"04:00", endTime:"12:00",
    elapsedPct:0, cycle:"28s",
  },
  {
    id:"WO-2024-090", orderNo:"WO-2024-090", product:"Chassis Frame Weldment — Batch B",
    partCode:"AP-CFW-003-LH", machine:"AP-FRAME-WELD-01", machineId:"M-02",
    priority:"high", status:"overdue",
    planned:150, actual:88, rejected:12, startTime:"12:00", endTime:"16:00",
    elapsedPct:1.0, cycle:"2m10s",
  },
];

const STATUS_CFG: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> }> = {
  running:   { label:"Running",   color: T.success, bg: T.successDim, icon: Play },
  scheduled: { label:"Scheduled", color: T.neutral, bg: T.neutralDim, icon: Clock },
  on_hold:   { label:"On Hold",   color: T.warning, bg: T.warningDim, icon: Pause },
  completed: { label:"Done",      color: T.muted,   bg: T.bgMuted,    icon: CheckCircle2 },
  overdue:   { label:"Overdue",   color: T.danger,  bg: T.dangerDim,  icon: AlertCircle },
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: T.danger,
  high:     T.brand,
  normal:   T.neutral,
};

function ganttOption(orders: WorkOrder[]) {
  const machines = ["M-01","M-02","M-03","M-04"];
  const colorMap: Record<OrderStatus, string> = {
    running:   T.brand + "CC",
    scheduled: T.neutral + "88",
    on_hold:   T.warning + "AA",
    completed: T.success + "66",
    overdue:   T.danger + "AA",
  };

  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return ((h < 8 ? h + 24 : h) - 8) * 60 + m;
  };

  const data = orders.flatMap((o) => {
    const mi = machines.indexOf(o.machineId);
    if (mi < 0) return [];
    const start = toMin(o.startTime);
    const end   = toMin(o.endTime);
    return [{
      value: [mi, start, end, o.orderNo, o.status, o.product],
      itemStyle: { color: colorMap[o.status], borderRadius: 4 },
    }];
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
      type: "category", data: machines,
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
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const visible = statusFilter === "all"
    ? ORDERS
    : ORDERS.filter((o) => o.status === statusFilter);

  const running   = ORDERS.filter((o) => o.status === "running").length;
  const scheduled = ORDERS.filter((o) => o.status === "scheduled").length;
  const overdue   = ORDERS.filter((o) => o.status === "overdue").length;
  const totalGood = ORDERS.reduce((s, o) => s + (o.actual - o.rejected), 0);

  return (
    <div className="max-w-[1280px] mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Work Orders</h1>
          <p className="font-mono text-xs text-text-tertiary mt-0.5">Production queue · machine assignment · progress tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 font-mono text-xs text-text-secondary border border-border rounded-lg px-3 py-2 hover:bg-bg-subtle transition-colors">
            <Filter size={12} /> Filter
          </button>
          <button className="inline-flex items-center gap-1.5 font-mono text-xs font-bold rounded-lg px-3 py-2" style={{ background: T.brand, color: "#fff" }}>
            <Plus size={12} /> New Order
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Running",    value: running.toString(),           color: T.success, bg: T.successDim, icon: Play },
          { label:"Scheduled",  value: scheduled.toString(),         color: T.neutral, bg: T.neutralDim, icon: Clock },
          { label:"Overdue",    value: overdue.toString(),           color: T.danger,  bg: T.dangerDim,  icon: AlertCircle },
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

      {/* Gantt */}
      <div className="bg-white rounded-xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-text-primary">Machine Schedule — Gantt</h2>
          <div className="flex items-center gap-4">
            {(["running","scheduled","on_hold","completed","overdue"] as OrderStatus[]).map((s) => {
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
        <ReactECharts option={ganttOption(ORDERS)} style={{ height: 200 }} opts={{ renderer: "svg" }} />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-bg-subtle border border-border rounded-lg p-0.5 w-fit">
        {(["all","running","scheduled","on_hold","overdue","completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f as typeof statusFilter)}
            className="font-mono text-xs px-3 py-1.5 rounded-md capitalize transition-all"
            style={statusFilter === f ? { background: T.brand, color: "#fff", fontWeight: 700 } : { color: T.muted }}
          >
            {f.replace("_"," ")}
          </button>
        ))}
      </div>

      {/* Order list */}
      <div className="space-y-2 pb-8">
        {visible.map((order) => {
          const st = STATUS_CFG[order.status];
          const StIcon = st.icon;
          const pct = order.planned > 0 ? order.actual / order.planned : 0;
          const fpy = order.actual > 0 ? ((order.actual - order.rejected) / order.actual) * 100 : null;
          const isOpen = expanded === order.id;

          return (
            <div key={order.id} className="bg-white rounded-xl shadow-card overflow-hidden">
              {/* Row */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-bg-subtle transition-colors"
                onClick={() => setExpanded(isOpen ? null : order.id)}
              >
                <div className="w-1 self-stretch rounded-full" style={{ background: PRIORITY_COLOR[order.priority] }} />

                <div className="min-w-0 flex-1 grid grid-cols-[1fr_6rem_8rem_8rem_6rem_2rem] items-center gap-4">

                  {/* Order info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-text-primary">{order.orderNo}</span>
                      <span
                        className="inline-flex items-center gap-1 font-mono text-2xs font-semibold rounded-full px-2 py-0.5"
                        style={{ background: st.bg, color: st.color }}
                      >
                        <StIcon size={9} />
                        {st.label}
                      </span>
                      <span
                        className="font-mono text-2xs rounded px-1.5 py-0.5"
                        style={{ background: PRIORITY_COLOR[order.priority] + "15", color: PRIORITY_COLOR[order.priority] }}
                      >
                        {order.priority}
                      </span>
                    </div>
                    <p className="font-sans text-xs text-text-secondary truncate mt-0.5">{order.product}</p>
                    <p className="font-mono text-2xs text-text-disabled">{order.partCode} · {order.machine}</p>
                  </div>

                  {/* Cycle */}
                  <div>
                    <p className="font-mono text-xs text-text-secondary tabular-nums">{order.cycle}</p>
                    <p className="font-mono text-2xs text-text-disabled">cycle time</p>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-sm font-black tabular-nums" style={{ color: T.brand }}>{order.actual}</span>
                      <span className="font-mono text-2xs text-text-disabled">/ {order.planned}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-bg-muted mt-1 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(pct * 100, 100)}%`,
                          background: order.status === "overdue" ? T.danger : T.brand,
                        }}
                      />
                    </div>
                  </div>

                  {/* FPY */}
                  <div>
                    <p className="font-mono text-xs font-bold tabular-nums" style={{ color: fpy !== null && fpy >= 97 ? T.success : T.warning }}>
                      {fpy !== null ? `${fpy.toFixed(1)}%` : "—"}
                    </p>
                    <p className="font-mono text-2xs text-text-disabled">{order.rejected} rejected</p>
                  </div>

                  {/* Time */}
                  <div>
                    <p className="font-mono text-xs text-text-secondary tabular-nums">{order.startTime} → {order.endTime}</p>
                    <p className="font-mono text-2xs text-text-disabled">{Math.round(order.elapsedPct * 100)}% elapsed</p>
                  </div>

                  {/* Expand */}
                  <ChevronRight
                    size={14}
                    className="text-text-disabled transition-transform"
                    style={{ transform: isOpen ? "rotate(90deg)" : "none" }}
                  />
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-border px-5 py-4 bg-bg-subtle">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                      { label: "Good Parts",   value: (order.actual - order.rejected).toLocaleString(), color: T.success },
                      { label: "Rejected",     value: order.rejected.toString(),                        color: T.danger },
                      { label: "Remaining",    value: Math.max(order.planned - order.actual, 0).toLocaleString(), color: T.neutral },
                      { label: "FPY",          value: fpy !== null ? `${fpy.toFixed(2)}%` : "—",      color: fpy !== null && fpy >= 97 ? T.success : T.warning },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mb-1">{label}</p>
                        <p className="font-mono text-xl font-black tabular-nums" style={{ color }}>{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    {order.status === "running" && (
                      <>
                        <button className="font-mono text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-bg-muted transition-colors inline-flex items-center gap-1.5">
                          <Pause size={11} /> Hold Order
                        </button>
                        <button className="font-mono text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5" style={{ background: T.success, color:"#fff" }}>
                          <CheckCircle2 size={11} /> Complete
                        </button>
                      </>
                    )}
                    {order.status === "on_hold" && (
                      <button className="font-mono text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5" style={{ background: T.brand, color:"#fff" }}>
                        <Play size={11} /> Resume
                      </button>
                    )}
                    {order.status === "scheduled" && (
                      <button className="font-mono text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5" style={{ background: T.brand, color:"#fff" }}>
                        <Play size={11} /> Start Now
                      </button>
                    )}
                    <button className="font-mono text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-bg-muted transition-colors">
                      View Details
                    </button>
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
