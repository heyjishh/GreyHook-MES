"use client";

import { useState } from "react";
import { PLANTS, type PlantConfig } from "@/lib/enterprise-config";
import ReactECharts from "echarts-for-react";
import { CalendarDays, TrendingUp, Factory, Package, ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function lcg(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

type OrderPriority = "critical" | "high" | "normal" | "low";
type OrderStatus = "scheduled" | "routing" | "in_progress" | "completed" | "overdue";

interface EnterpriseOrder {
  id: string;
  orderNo: string;
  customer: string;
  product: string;
  quantity: string;
  unit: string;
  dueDate: string;
  priority: OrderPriority;
  status: OrderStatus;
  assignedPlant: PlantConfig | null;
  candidatePlants: PlantConfig[];
  capacityScore: Record<string, number>;
  leadTimeDays: number;
  revenueValue: string;
  routingReason: string;
}

const STATUS_CFG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  scheduled:   { label: "Scheduled",   color: "#1A7A40", bg: "#E8F5EC" },
  routing:     { label: "Routing…",    color: "#0057CC", bg: "#E8F0FF" },
  in_progress: { label: "In Progress", color: "#A85E00", bg: "#FEF0D6" },
  completed:   { label: "Completed",   color: "#6A8A9A", bg: "#F4F0EC" },
  overdue:     { label: "Overdue",     color: "#CC1800", bg: "#FDE8E4" },
};

const PRIORITY_CFG: Record<OrderPriority, { label: string; color: string }> = {
  critical: { label: "Critical", color: "#CC1800" },
  high:     { label: "High",     color: "#A85E00" },
  normal:   { label: "Normal",   color: "#0057CC" },
  low:      { label: "Low",      color: "#6A8A9A" },
};

function buildOrders(): EnterpriseOrder[] {
  const rng = lcg(55);
  const customers = ["Maruti Suzuki", "Apollo Hospitals", "Tata Electronics", "Westside Retail", "Bosch India", "CIPLA Ltd", "Foxconn India", "Arvind Mills"];
  const reasons = [
    "Assigned to best OEE plant with spare capacity",
    "Specialised equipment only at this plant",
    "Proximity to customer delivery location",
    "Idle capacity identified by AI scheduler",
    "Customer preference for certified plant",
    "Overflow: primary plant at max utilisation",
  ];

  const orders: EnterpriseOrder[] = [];
  Array.from({ length: 8 }).forEach((_, i) => {
    const plant = PLANTS[Math.floor(rng() * PLANTS.length)];
    const candidates = PLANTS.filter(p => p.industry === plant.industry || rng() > 0.6);
    const statuses: OrderStatus[] = ["scheduled", "routing", "in_progress", "completed", "overdue"];
    const priorities: OrderPriority[] = ["critical", "high", "normal", "normal", "low"];

    orders.push({
      id: `ord-${i}`,
      orderNo: `ENT-${String(i + 1).padStart(4, "0")}`,
      customer: customers[i % customers.length],
      product: `${plant.industry} Assembly ${String.fromCharCode(65 + i)}`,
      quantity: String(Math.floor(rng() * 1000 + 100)),
      unit: plant.unit,
      dueDate: `2026-11-${String(Math.floor(rng() * 20) + 8).padStart(2, "0")}`,
      priority: priorities[Math.floor(rng() * priorities.length)],
      status: statuses[Math.floor(rng() * statuses.length)],
      assignedPlant: rng() > 0.3 ? plant : null,
      candidatePlants: candidates.slice(0, Math.floor(rng() * 3) + 1),
      capacityScore: Object.fromEntries(candidates.map(p => [p.id, Math.round(rng() * 60 + 40)])),
      leadTimeDays: Math.floor(rng() * 14 + 2),
      revenueValue: `₹${(rng() * 15 + 2).toFixed(1)}L`,
      routingReason: reasons[Math.floor(rng() * reasons.length)],
    });
  });

  return orders;
}

const ORDERS = buildOrders();

function CapacityGanttChart() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const rng = lcg(77);

  const series = PLANTS.map((plant, pi) => ({
    name: plant.name.replace("Sunrise ", ""),
    type: "bar",
    stack: `plant-${pi}`,
    data: days.map(() => Math.round(rng() * 40 + 50)),
    itemStyle: { color: plant.industryColor + "CC", borderRadius: [2, 2, 0, 0] },
    barWidth: 18,
  }));

  const opt = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, textStyle: { fontSize: 10, fontFamily: "IBM Plex Mono" } },
    legend: { bottom: 0, textStyle: { fontSize: 9, fontFamily: "IBM Plex Mono" }, itemWidth: 10 },
    grid: { top: 8, bottom: 50, left: 40, right: 16 },
    xAxis: { type: "category", data: days, axisLabel: { fontSize: 10, fontFamily: "IBM Plex Mono" } },
    yAxis: { type: "value", max: 100, axisLabel: { fontSize: 10, fontFamily: "IBM Plex Mono", formatter: "{value}%" }, splitLine: { lineStyle: { color: "#F4F0EC" } } },
    series,
  };

  return <ReactECharts option={opt} style={{ height: "220px", width: "100%" }} />;
}

function RoutingMatrix() {
  const opt = {
    backgroundColor: "transparent",
    tooltip: { textStyle: { fontSize: 10, fontFamily: "IBM Plex Mono" } },
    grid: { top: 30, bottom: 30, left: 100, right: 16 },
    xAxis: {
      type: "category",
      data: PLANTS.map(p => p.name.replace("Sunrise ", "")),
      axisLabel: { fontSize: 9, fontFamily: "IBM Plex Mono", rotate: 10 },
    },
    yAxis: {
      type: "category",
      data: ["Automotive", "Pharma", "Electronics", "Textile"],
      axisLabel: { fontSize: 9, fontFamily: "IBM Plex Mono" },
    },
    visualMap: { min: 0, max: 100, inRange: { color: ["#FEF0EB", "#F05230"] }, show: false },
    series: [{
      type: "heatmap",
      data: (() => {
        const rng = lcg(33);
        return [0, 1, 2, 3].flatMap(y => [0, 1, 2, 3].map(x => [x, y, Math.round(rng() * 100)]));
      })(),
      label: { show: true, fontSize: 9, fontFamily: "IBM Plex Mono" },
    }],
  };

  return <ReactECharts option={opt} style={{ height: "200px", width: "100%" }} />;
}

function OrderRow({ order }: { order: EnterpriseOrder }) {
  const [expanded, setExpanded] = useState(false);
  const st = STATUS_CFG[order.status];
  const pr = PRIORITY_CFG[order.priority];

  return (
    <>
      <tr className="border-b border-border/50 hover:bg-bgSubtle transition-colors cursor-pointer"
          onClick={() => setExpanded(v => !v)}>
        <td className="py-2.5 px-3">
          {expanded ? <ChevronDown size={12} className="text-muted" /> : <ChevronRight size={12} className="text-muted" />}
        </td>
        <td className="py-2.5 px-3 font-mono text-2xs text-brand">{order.orderNo}</td>
        <td className="py-2.5 px-3 font-semibold text-text">{order.customer}</td>
        <td className="py-2.5 px-3 font-mono text-2xs text-muted">{order.product}</td>
        <td className="py-2.5 px-3 font-mono text-2xs">{order.quantity} {order.unit}</td>
        <td className="py-2.5 px-3">
          <span className="font-mono text-2xs font-semibold" style={{ color: pr.color }}>{pr.label}</span>
        </td>
        <td className="py-2.5 px-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-2xs font-semibold"
                style={{ background: st.bg, color: st.color }}>{st.label}</span>
        </td>
        <td className="py-2.5 px-3">
          {order.assignedPlant ? (
            <span className="flex items-center gap-1 font-mono text-2xs text-text">
              {order.assignedPlant.industryEmoji} {order.assignedPlant.name.replace("Sunrise ", "")}
            </span>
          ) : (
            <span className="font-mono text-2xs text-muted italic">Unassigned</span>
          )}
        </td>
        <td className="py-2.5 px-3 font-mono text-2xs text-text">{order.dueDate}</td>
        <td className="py-2.5 px-3 font-mono text-2xs font-bold text-text">{order.revenueValue}</td>
      </tr>
      {expanded && (
        <tr className="bg-bgSubtle">
          <td colSpan={10} className="px-6 py-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="font-mono text-2xs text-muted mb-1">Routing Decision</div>
                <div className="font-mono text-xs text-text">{order.routingReason}</div>
              </div>
              <div>
                <div className="font-mono text-2xs text-muted mb-1">Lead Time</div>
                <div className="font-heading text-sm font-bold text-text">{order.leadTimeDays} days</div>
              </div>
              <div>
                <div className="font-mono text-2xs text-muted mb-2">Plant Capacity Scores</div>
                <div className="flex flex-col gap-1">
                  {order.candidatePlants.map(p => (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="text-sm">{p.industryEmoji}</span>
                      <span className="font-mono text-2xs text-muted w-24 truncate">{p.name.replace("Sunrise ","")}</span>
                      <div className="flex-1 h-1.5 bg-bgMuted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${order.capacityScore[p.id] ?? 0}%`, background: p.industryColor }} />
                      </div>
                      <span className="font-mono text-2xs text-muted w-8 text-right">{order.capacityScore[p.id] ?? 0}%</span>
                      {order.assignedPlant?.id === p.id && <span className="font-mono text-2xs text-brand">✓ Assigned</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function EnterpriseSchedulingPage() {
  const [priorityFilter, setPriorityFilter] = useState<OrderPriority | "all">("all");

  const totalRev = ORDERS.reduce((s, o) => s + parseFloat(o.revenueValue.replace("₹","").replace("L","")), 0);
  const unassigned = ORDERS.filter(o => !o.assignedPlant).length;
  const overdue = ORDERS.filter(o => o.status === "overdue").length;

  const filtered = ORDERS.filter(o => priorityFilter === "all" || o.priority === priorityFilter);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays size={16} className="text-brand" />
          <span className="font-mono text-2xs text-brand font-semibold uppercase tracking-widest">Enterprise</span>
        </div>
        <h1 className="font-heading text-2xl font-bold text-text">Enterprise Order Routing</h1>
        <p className="font-mono text-xs text-muted mt-0.5">AI-assisted scheduling and cross-plant order allocation</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Orders", value: ORDERS.length, icon: Package },
          { label: "Total Revenue", value: `₹${totalRev.toFixed(1)}L`, icon: TrendingUp },
          { label: "Unassigned", value: unassigned, icon: Factory },
          { label: "Overdue", value: overdue, icon: CalendarDays },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={12} className="text-muted" />
                <span className="font-mono text-2xs text-muted">{item.label}</span>
              </div>
              <div className="font-heading text-2xl font-bold text-text">{item.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-border rounded-xl p-5">
          <h2 className="font-heading text-sm font-bold text-text mb-4">Plant Capacity This Week</h2>
          <CapacityGanttChart />
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <h2 className="font-heading text-sm font-bold text-text mb-4">Order-Plant Routing Matrix</h2>
          <RoutingMatrix />
          <p className="font-mono text-2xs text-muted mt-2 text-center">Routing affinity score (0–100) by industry × plant</p>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h2 className="font-heading text-sm font-bold text-text">Order Queue</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-bgMuted rounded-lg p-1">
              {(["all", "critical", "high", "normal", "low"] as const).map(p => (
                <button key={p} onClick={() => setPriorityFilter(p)}
                  className={cn("px-2.5 py-1 rounded-md font-mono text-2xs capitalize transition-all",
                    priorityFilter === p ? "bg-white text-text shadow-sm font-semibold" : "text-muted hover:text-text")}>
                  {p}
                </button>
              ))}
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded-lg font-mono text-2xs font-semibold hover:opacity-90 transition-opacity">
              <ArrowRight size={11} /> Auto-Route All
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-sans">
            <thead>
              <tr className="border-b border-border">
                <th className="w-8"></th>
                {["Order No.", "Customer", "Product", "Qty", "Priority", "Status", "Plant", "Due", "Revenue"].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-mono text-2xs text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => <OrderRow key={order.id} order={order} />)}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="py-8 text-center font-mono text-xs text-muted">No orders match</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
