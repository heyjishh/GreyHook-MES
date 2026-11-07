"use client";

import { useState } from "react";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import {
  Cpu, Users, Clock, Layers, CheckCircle2, AlertCircle, XCircle,
  Database, Wifi, Server, Activity, Shield, ArrowRight, Zap,
  TrendingUp, TrendingDown, Minus, Lock, Eye, RefreshCw,
  BarChart3, GitBranch, AlertTriangle, Radio, Package,
  ChevronRight, Terminal, Globe, IndianRupee, Target,
  Award, Gauge, Flame, ThumbsUp, ThumbsDown, CalendarCheck,
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
  bg:        "#FFFFFF",
  bgSubtle:  "#FAFAF8",
  sidebar:   "#040E36",
};

/* ─── TECHNICAL DATA ─────────────────────────────────────── */
const STATS = [
  { label: "Machines",      value: "4",   sub: "2 protocols active",     color: T.brand,   bgColor: T.brandDim,   icon: Cpu,      trend: "up"   },
  { label: "Active Users",  value: "3",   sub: "of 7 total accounts",    color: T.success, bgColor: T.successDim, icon: Users,    trend: "flat" },
  { label: "Shifts Logged", value: "143", sub: "this month",             color: T.neutral, bgColor: T.neutralDim, icon: Clock,    trend: "up"   },
  { label: "Data Records",  value: "1.4M",sub: "+18K in last 24h",       color: T.warning, bgColor: T.warningDim, icon: Database, trend: "up"   },
];
const SERVICES = [
  { name: "API Server (Axum)",          status: "healthy",  latency: "12 ms",  icon: Server,    uptime: "99.98%" },
  { name: "PostgreSQL + TimescaleDB",   status: "healthy",  latency: "4 ms",   icon: Database,  uptime: "100%"   },
  { name: "Kafka / Redpanda",           status: "healthy",  latency: "8 ms",   icon: Activity,  uptime: "99.95%" },
  { name: "Edge Gateway",               status: "healthy",  latency: "—",      icon: Wifi,      uptime: "99.90%" },
  { name: "Temporal Workflows",         status: "healthy",  latency: "—",      icon: Layers,    uptime: "100%"   },
  { name: "Valkey (Cache)",             status: "degraded", latency: "240 ms", icon: Database,  uptime: "98.1%"  },
  { name: "OpenTelemetry Collector",    status: "healthy",  latency: "—",      icon: BarChart3, uptime: "100%"   },
  { name: "MQTT Broker (Mosquitto)",    status: "healthy",  latency: "2 ms",   icon: Radio,     uptime: "99.97%" },
];
const PIPELINE = [
  { name: "telemetry-ingest",   lag: 0,   throughput: "1,240 msg/s", partitions: 6, status: "healthy" },
  { name: "oee-processor",      lag: 2,   throughput: "84 msg/s",    partitions: 3, status: "healthy" },
  { name: "downtime-enricher",  lag: 0,   throughput: "12 msg/s",    partitions: 2, status: "healthy" },
  { name: "edge-heartbeat",     lag: 148, throughput: "3 msg/s",     partitions: 1, status: "lagging" },
];
const WORKFLOWS = [
  { name: "ShiftReportWorkflow",   running: 1, completed: 143, failed: 0, pending: 0 },
  { name: "OEECalculatorWorkflow", running: 4, completed: 892, failed: 0, pending: 0 },
  { name: "DowntimeEscalation",    running: 0, completed: 29,  failed: 0, pending: 0 },
  { name: "CalibrationReminder",   running: 0, completed: 6,   failed: 1, pending: 2 },
];
const SESSIONS = [
  { user: "admin@sunrise.com",     role: "Admin",    ip: "10.0.1.4",  since: "00:12", page: "/admin",               active: true  },
  { user: "ravi.kumar@sunrise.com",role: "Manager",  ip: "10.0.1.11", since: "02:30", page: "/dashboard",           active: true  },
  { user: "priya.mehta@sunrise.com",role:"Operator", ip: "10.0.1.23", since: "03:00", page: "/dashboard/operator",  active: true  },
  { user: "suresh.b@sunrise.com",  role: "Operator", ip: "10.0.1.19", since: "01:45", page: "/dashboard/downtime",  active: false },
];
const AUDIT = [
  { time: "03:28", actor: "System",               action: "AP-PRESS-FORM-03 heartbeat timeout",            level: "warn",   ip: "edge-01"    },
  { time: "03:12", actor: "admin@sunrise.com",    action: "Updated shift schedule: Shift 3 → 00:00",       level: "info",   ip: "10.0.1.4"   },
  { time: "02:55", actor: "System",               action: "Downtime #DT-091 auto-closed",                  level: "info",   ip: "api-server" },
  { time: "02:30", actor: "admin@sunrise.com",    action: "Added user priya.mehta@sunrise.com (Operator)", level: "info",   ip: "10.0.1.4"   },
  { time: "01:44", actor: "System",               action: "OPC UA reconnect: AP-ENGINE-MOUNT-V2",          level: "warn",   ip: "edge-01"    },
  { time: "01:12", actor: "suresh.b@sunrise.com", action: "Failed login attempt (wrong password)",         level: "danger", ip: "10.0.1.19"  },
  { time: "00:00", actor: "System",               action: "Shift 2 started — target 1,040 parts",          level: "info",   ip: "api-server" },
];
const QUICK_LINKS = [
  { href: "/admin/machines", label: "Machines", sub: "OPC UA · MQTT · protocols", icon: Cpu,    color: T.brand   },
  { href: "/admin/shifts",   label: "Shifts",   sub: "Schedules · planned stops", icon: Clock,  color: T.success },
  { href: "/admin/users",    label: "Users",    sub: "Roles · access control",    icon: Users,  color: T.neutral },
  { href: "/admin/security", label: "Security", sub: "Argon2id · audit · RBAC",   icon: Shield, color: T.warning },
];
const INTEGRATIONS = [
  { name: "SAP S/4HANA",     status: "connected",    sync: "2m ago",    icon: Package  },
  { name: "OPC UA Server",   status: "connected",    sync: "real-time", icon: Globe    },
  { name: "MQTT Broker",     status: "connected",    sync: "real-time", icon: Radio    },
  { name: "NABL Lab System", status: "disconnected", sync: "—",         icon: Terminal },
];

/* ─── EXECUTIVE DATA ─────────────────────────────────────── */
const EXEC_KPIS = [
  {
    label: "Revenue at Risk",
    value: "₹2.4L",
    sub: "from downtime this shift",
    color: T.danger,
    bgColor: T.dangerDim,
    icon: IndianRupee,
    trend: "down",
    detail: "82 min unplanned stops × ₹1,750/min",
  },
  {
    label: "Production Efficiency",
    value: "72.4%",
    sub: "vs 85% world-class target",
    color: T.warning,
    bgColor: T.warningDim,
    icon: Gauge,
    trend: "up",
    detail: "12.6 pp gap = ₹18L/month opportunity",
  },
  {
    label: "Quality Rate",
    value: "97.2%",
    sub: "FPY across all lines",
    color: T.success,
    bgColor: T.successDim,
    icon: Award,
    trend: "up",
    detail: "563 good parts · 16 rejected this shift",
  },
  {
    label: "On-Time Delivery",
    value: "91.3%",
    sub: "of orders shipped on time",
    color: T.brand,
    bgColor: T.brandDim,
    icon: CalendarCheck,
    trend: "flat",
    detail: "2 orders at risk · WO-2024-109 delayed 4h",
  },
];

const SHIFT_LEADERBOARD = [
  { shift: "Shift 1 (06:00–14:00)", oee: 79.2, output: 1024, target: 1040, quality: 97.8, downtime: 24, rank: 1 },
  { shift: "Shift 3 (22:00–06:00)", oee: 76.1, output: 988,  target: 1040, quality: 96.5, downtime: 38, rank: 2 },
  { shift: "Shift 2 (14:00–22:00)", oee: 72.4, output: 621,  target: 1040, quality: 97.2, downtime: 82, rank: 3 },
];

const EXEC_ALERTS = [
  {
    level: "critical",
    title: "Line 3 is dragging plant OEE by 8 points",
    body: "AP-PRESS-FORM-03 running at 44% OEE vs 85% target. If not resolved by next planned stop, estimated shift loss: ₹1.1L in output.",
    action: "View machine →",
    href: "/dashboard/machines",
  },
  {
    level: "warning",
    title: "Shift 2 will miss its 1,040 unit target",
    body: "Currently at 621 units with 42% shift remaining. Needs +8% throughput on M-04 to recover. Consider authorising overtime or reallocating WO-2024-093.",
    action: "View schedule →",
    href: "/dashboard/scheduling",
  },
  {
    level: "warning",
    title: "2 supplier SCARs open — Week 47 delivery at risk",
    body: "Deccan Foundries has 2 unresolved corrective actions. PPM: 8,200 (grade C). Safety stock covers 6 days. Procurement review recommended.",
    action: "Supplier quality →",
    href: "/dashboard/supplier-quality",
  },
  {
    level: "ok",
    title: "M-04 performing above plan — absorb reallocation",
    body: "OEE 87.4%, throughput 142 pts/hr. Capacity available to absorb WO-2024-093 if Line 3 goes offline. No customer impact expected.",
    action: "View OEE →",
    href: "/dashboard/oee",
  },
];

const PLANT_UTIL_WEEKS = ["W41", "W42", "W43", "W44", "W45", "W46 (now)"];
const PLANT_OEE_DATA   = [74.1, 71.8, 76.3, 73.9, 75.2, 72.4];
const PLANT_TARGET_DATA = [85, 85, 85, 85, 85, 85];

function oeeChartOption() {
  return {
    grid: { top: 24, bottom: 32, left: 48, right: 20 },
    xAxis: {
      type: "category", data: PLANT_UTIL_WEEKS,
      axisLine: { lineStyle: { color: T.border } },
      axisTick: { show: false },
      axisLabel: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
    },
    yAxis: {
      type: "value", min: 55, max: 95,
      axisLabel: { formatter: (v: number) => `${v}%`, fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
      splitLine: { lineStyle: { color: "#F0ECE8", type: "dashed" } },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [
      {
        name: "Plant OEE", type: "line", data: PLANT_OEE_DATA, smooth: 0.4, symbol: "circle", symbolSize: 6,
        lineStyle: { width: 2.5, color: T.brand },
        itemStyle: { color: T.brand, borderColor: "#fff", borderWidth: 2 },
        areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: T.brand + "20" }, { offset: 1, color: T.brand + "00" }] } },
      },
      {
        name: "Target", type: "line", data: PLANT_TARGET_DATA, symbol: "none",
        lineStyle: { width: 1.5, color: T.success, type: "dashed" },
      },
    ],
    legend: {
      bottom: 0, left: "center",
      textStyle: { fontSize: 10, color: T.muted, fontFamily: "IBM Plex Mono" },
      itemWidth: 12, itemHeight: 2,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 8,
      textStyle: { color: T.text, fontSize: 11, fontFamily: "IBM Plex Mono" },
      formatter: (p: { seriesName: string; value: number }[]) =>
        p.map((x) => `${x.seriesName}: <b>${x.value}%</b>`).join("<br/>"),
    },
    animation: true,
  };
}

const COST_BREAKDOWN = [
  { label: "Unplanned downtime", value: "₹2,43,000", pct: 58, color: T.danger  },
  { label: "Planned stops",      value: "₹96,250",   pct: 23, color: T.warning },
  { label: "Scrap / rework",     value: "₹52,500",   pct: 13, color: "#B86A00" },
  { label: "Speed loss",         value: "₹25,200",   pct: 6,  color: T.muted   },
];

/* ─── SHARED COMPONENTS ──────────────────────────────────── */
function StatusIcon({ status }: { status: string }) {
  if (status === "healthy" || status === "connected")
    return <CheckCircle2 size={13} style={{ color: T.success }} />;
  if (status === "degraded" || status === "lagging")
    return <AlertCircle size={13} style={{ color: T.warning }} />;
  return <XCircle size={13} style={{ color: T.danger }} />;
}

function TrendPill({ trend, reverse }: { trend: string; reverse?: boolean }) {
  const up   = trend === "up";
  const down = trend === "down";
  const goodColor  = reverse ? T.danger  : T.success;
  const badColor   = reverse ? T.success : T.danger;
  if (up)   return <TrendingUp   size={11} style={{ color: goodColor }} />;
  if (down) return <TrendingDown size={11} style={{ color: badColor  }} />;
  return <Minus size={11} style={{ color: T.muted }} />;
}

/* ─── VIEWS ──────────────────────────────────────────────── */
function TechnicalView({ auditFilter, setAuditFilter }: {
  auditFilter: "all" | "warn" | "danger";
  setAuditFilter: (v: "all" | "warn" | "danger") => void;
}) {
  const filtered = AUDIT.filter((e) => auditFilter === "all" || e.level === auditFilter);
  return (
    <div className="space-y-6">
      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATS.map(({ label, value, sub, color, bgColor, icon: Icon, trend }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bgColor }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <p className="font-mono text-3xl font-black leading-none tabular-nums" style={{ color }}>{value}</p>
              <TrendPill trend={trend} />
            </div>
            <p className="font-mono text-2xs text-text-disabled mt-1.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_LINKS.map(({ href, label, sub, icon: Icon, color }) => (
          <Link key={label} href={href}
            className="bg-white rounded-xl p-4 shadow-card hover:shadow-card-hover transition-all group flex flex-col gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "15" }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="flex-1">
              <p className="font-sans text-sm font-bold text-text-primary group-hover:text-brand transition-colors">{label}</p>
              <p className="font-mono text-2xs text-text-disabled mt-0.5">{sub}</p>
            </div>
            <div className="flex items-center gap-1 text-text-disabled group-hover:text-brand transition-colors">
              <span className="font-mono text-2xs">Manage</span>
              <ChevronRight size={11} />
            </div>
          </Link>
        ))}
      </div>

      {/* Service health + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-bold text-text-primary">Service Health</h2>
            <span className="font-mono text-2xs text-text-disabled">30 day uptime</span>
          </div>
          <div className="divide-y divide-border">
            {SERVICES.map(({ name, status, latency, icon: Icon, uptime }) => (
              <div key={name} className="flex items-center gap-3 px-5 py-2.5">
                <Icon size={12} style={{ color: T.muted }} className="shrink-0" />
                <span className="font-sans text-xs text-text-primary flex-1 min-w-0 truncate">{name}</span>
                <span className="font-mono text-2xs text-text-disabled tabular-nums shrink-0 w-14 text-right">{latency}</span>
                <span className="font-mono text-2xs tabular-nums shrink-0 w-12 text-right"
                  style={{ color: status === "healthy" ? T.success : T.warning }}>{uptime}</span>
                <StatusIcon status={status} />
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-3 bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-bold text-text-primary">Kafka Data Pipeline</h2>
            <span className="font-mono text-2xs text-text-disabled">Consumer groups</span>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-border">
              {["Consumer group","Lag","Throughput","Partitions","Status"].map((h) => (
                <th key={h} className="px-5 py-2 text-left font-mono text-2xs text-text-disabled uppercase tracking-widest">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-border">
              {PIPELINE.map(({ name, lag, throughput, partitions, status }) => (
                <tr key={name} className="hover:bg-bg-subtle transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-text-primary">{name}</td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs tabular-nums font-bold"
                      style={{ color: lag === 0 ? T.success : lag < 50 ? T.warning : T.danger }}>{lag}</span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-text-secondary tabular-nums">{throughput}</td>
                  <td className="px-5 py-3 font-mono text-xs text-text-disabled tabular-nums">{partitions}</td>
                  <td className="px-5 py-3"><StatusIcon status={status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Temporal + Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2"><GitBranch size={13} style={{ color: T.muted }} />
              <h2 className="text-xs font-bold text-text-primary">Temporal Workflows</h2>
            </div>
            <span className="font-mono text-2xs text-text-disabled">Last 30 days</span>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-border">
              {["Workflow","Running","Completed","Failed","Pending"].map((h) => (
                <th key={h} className="px-5 py-2 text-left font-mono text-2xs text-text-disabled uppercase tracking-widest">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-border">
              {WORKFLOWS.map(({ name, running, completed, failed, pending }) => (
                <tr key={name} className="hover:bg-bg-subtle transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-text-primary">{name}</td>
                  <td className="px-5 py-3"><span className="font-mono text-xs tabular-nums font-bold"
                    style={{ color: running > 0 ? T.brand : T.muted }}>{running}</span></td>
                  <td className="px-5 py-3 font-mono text-xs text-text-secondary tabular-nums">{completed}</td>
                  <td className="px-5 py-3"><span className="font-mono text-xs tabular-nums font-bold"
                    style={{ color: failed > 0 ? T.danger : T.muted }}>{failed}</span></td>
                  <td className="px-5 py-3"><span className="font-mono text-xs tabular-nums"
                    style={{ color: pending > 0 ? T.warning : T.muted }}>{pending}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2"><Eye size={13} style={{ color: T.muted }} />
              <h2 className="text-xs font-bold text-text-primary">Active Sessions</h2>
            </div>
            <span className="inline-flex items-center gap-1 font-mono text-2xs px-2 py-0.5 rounded-full"
              style={{ background: T.successDim, color: T.success }}>
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              {SESSIONS.filter((s) => s.active).length} online
            </span>
          </div>
          <div className="divide-y divide-border">
            {SESSIONS.map(({ user, role, ip, since, page, active }) => (
              <div key={user} className="px-5 py-3 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5"
                  style={{ background: active ? T.brandDim : T.neutralDim, color: active ? T.brand : T.muted }}>
                  {user.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-sans text-xs font-semibold text-text-primary truncate">{user.split("@")[0]}</p>
                    <span className="font-mono text-2xs px-1.5 py-0.5 rounded"
                      style={{ background: T.neutralDim, color: T.muted }}>{role}</span>
                  </div>
                  <p className="font-mono text-2xs text-text-disabled mt-0.5 truncate">{page}</p>
                  <p className="font-mono text-2xs text-text-disabled">{ip} · since {since}</p>
                </div>
                <div className="shrink-0 mt-1">
                  <span className="w-2 h-2 rounded-full block"
                    style={{ backgroundColor: active ? T.success : T.neutral + "60" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Integrations + Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 pb-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-bold text-text-primary">Integrations</h2>
            <button className="inline-flex items-center gap-1 font-mono text-2xs text-brand hover:opacity-70 transition-opacity">
              Add <ArrowRight size={10} />
            </button>
          </div>
          <div className="divide-y divide-border">
            {INTEGRATIONS.map(({ name, status, sync, icon: Icon }) => (
              <div key={name} className="flex items-center gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: status === "connected" ? T.successDim : T.neutralDim }}>
                  <Icon size={13} style={{ color: status === "connected" ? T.success : T.muted }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-xs font-semibold text-text-primary truncate">{name}</p>
                  <p className="font-mono text-2xs text-text-disabled">Last sync: {sync}</p>
                </div>
                <StatusIcon status={status} />
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-3 bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2"><Lock size={13} style={{ color: T.muted }} />
              <h2 className="text-xs font-bold text-text-primary">Audit Log</h2>
            </div>
            <div className="flex items-center gap-1">
              {(["all", "warn", "danger"] as const).map((f) => (
                <button key={f} onClick={() => setAuditFilter(f)}
                  className="px-2.5 py-1 rounded-lg font-mono text-2xs capitalize transition-colors"
                  style={{ background: auditFilter === f ? T.sidebar : "transparent", color: auditFilter === f ? "#fff" : T.muted }}>
                  {f === "danger" ? "critical" : f}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-border">
            {filtered.map(({ time, actor, action, level, ip }, i) => {
              const dot = level === "danger" ? T.danger : level === "warn" ? T.warning : T.success;
              return (
                <div key={i} className="flex items-start gap-3 px-5 py-3">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: dot }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-xs text-text-primary leading-snug">{action}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="font-mono text-2xs text-text-disabled">{actor}</p>
                      <span className="font-mono text-2xs text-text-disabled opacity-50">·</span>
                      <p className="font-mono text-2xs text-text-disabled">{ip}</p>
                    </div>
                  </div>
                  <span className="font-mono text-2xs text-text-disabled shrink-0 tabular-nums">{time}</span>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-border bg-bg-subtle flex items-center justify-between">
            <p className="font-mono text-2xs text-text-disabled">Today · UTC+5:30</p>
            <button className="font-mono text-2xs text-brand hover:opacity-70 flex items-center gap-1">
              Full audit trail <ArrowRight size={10} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExecutiveView() {
  return (
    <div className="space-y-6 pb-8">

      {/* Business KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {EXEC_KPIS.map(({ label, value, sub, color, bgColor, icon: Icon, trend, detail }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-card flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bgColor }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <p className="font-mono text-2xl font-black leading-none tabular-nums" style={{ color }}>{value}</p>
              <TrendPill trend={trend} reverse={label === "Revenue at Risk"} />
            </div>
            <p className="font-mono text-2xs text-text-disabled">{sub}</p>
            <p className="font-mono text-2xs mt-0.5 pt-1.5 border-t border-border" style={{ color }}>{detail}</p>
          </div>
        ))}
      </div>

      {/* OEE trend + Cost breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* 6-week OEE chart */}
        <div className="lg:col-span-3 bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Plant OEE vs Target — 6 Weeks</h2>
              <p className="font-mono text-2xs text-text-disabled mt-0.5">
                Average <span className="font-bold" style={{ color: T.warning }}>73.9%</span>
                &nbsp;·&nbsp;Target <span style={{ color: T.success }}>85%</span>
                &nbsp;·&nbsp;Gap costs <span style={{ color: T.danger }}>≈ ₹18L / month</span>
              </p>
            </div>
          </div>
          <ReactECharts option={oeeChartOption()} style={{ height: 190 }} opts={{ renderer: "svg" }} />
        </div>

        {/* Cost of poor quality */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-card">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Cost of Lost Production</h2>
            <p className="font-mono text-2xs text-text-disabled mt-0.5">Today's shift (8 h scheduled)</p>
          </div>
          <p className="font-mono text-3xl font-black tabular-nums" style={{ color: T.danger }}>₹4,16,750</p>
          <p className="font-mono text-2xs text-text-disabled mb-4">total impact this shift</p>
          <div className="space-y-3">
            {COST_BREAKDOWN.map(({ label, value, pct, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-sans text-xs text-text-secondary">{label}</span>
                  <span className="font-mono text-xs font-bold tabular-nums" style={{ color }}>{value}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shift leaderboard + Business alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Shift ranking */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award size={13} style={{ color: T.muted }} />
              <h2 className="text-xs font-bold text-text-primary">Shift Performance Ranking</h2>
            </div>
            <span className="font-mono text-2xs text-text-disabled">This week</span>
          </div>
          <div className="divide-y divide-border">
            {SHIFT_LEADERBOARD.map(({ shift, oee, output, target, quality, downtime, rank }) => {
              const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
              const oeeCol = oee >= 78 ? T.success : oee >= 73 ? T.warning : T.danger;
              return (
                <div key={shift} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{medal}</span>
                      <div>
                        <p className="font-sans text-xs font-semibold text-text-primary leading-tight">{shift}</p>
                        <p className="font-mono text-2xs text-text-disabled mt-0.5">{downtime} min downtime</p>
                      </div>
                    </div>
                    <span className="font-mono text-lg font-black tabular-nums shrink-0" style={{ color: oeeCol }}>{oee}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center pt-2 border-t border-border">
                    {[
                      { l: "Output",  v: output.toLocaleString(), vs: `/ ${target}`, good: output >= target * 0.95 },
                      { l: "Quality", v: `${quality}%`, vs: "FPY", good: quality >= 97 },
                      { l: "OEE",     v: `${oee}%`, vs: "vs 85", good: oee >= 78 },
                    ].map(({ l, v, vs, good }) => (
                      <div key={l}>
                        <p className="font-mono text-xs font-bold" style={{ color: good ? T.success : T.warning }}>{v}</p>
                        <p className="font-mono text-2xs text-text-disabled">{l}</p>
                        <p className="font-mono text-2xs text-text-disabled opacity-60">{vs}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Business alerts */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-card overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} style={{ color: T.muted }} />
              <h2 className="text-xs font-bold text-text-primary">Issues Requiring Your Attention</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 font-mono text-2xs px-2 py-0.5 rounded-full"
                style={{ background: T.dangerDim, color: T.danger }}>
                1 critical
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-2xs px-2 py-0.5 rounded-full"
                style={{ background: T.warningDim, color: T.warning }}>
                2 warnings
              </span>
            </div>
          </div>
          <div className="flex-1 divide-y divide-border">
            {EXEC_ALERTS.map(({ level, title, body, action, href }) => {
              const dot = level === "critical" ? T.danger : level === "warning" ? T.warning : T.success;
              const bg  = level === "critical" ? T.dangerDim : level === "warning" ? T.warningDim : T.successDim;
              return (
                <div key={title} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: dot }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-xs font-bold text-text-primary leading-snug">{title}</p>
                      <p className="font-sans text-2xs text-text-secondary mt-1 leading-relaxed">{body}</p>
                      <Link href={href}
                        className="inline-flex items-center gap-1 mt-2 font-mono text-2xs font-semibold hover:opacity-70 transition-opacity"
                        style={{ color: dot }}>
                        {action} <ChevronRight size={10} />
                      </Link>
                    </div>
                    <div className="shrink-0 w-1.5 h-6 rounded-full" style={{ backgroundColor: bg }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-border bg-bg-subtle">
            <p className="font-mono text-2xs text-text-disabled">
              AI read-only · cannot issue machine commands · <span style={{ color: T.success }}>plant data as of 03:40 IST</span>
            </p>
          </div>
        </div>
      </div>

      {/* Org summary footer */}
      <div className="bg-white rounded-xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary">Organisation at a Glance</h2>
          <span className="font-mono text-2xs text-text-disabled">Sunrise Auto Parts Ltd · 1 plant · Shift 2</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { label: "Machines online",   value: "3 / 4",     color: T.warning, Icon: Cpu         },
            { label: "Staff on shift",    value: "12",        color: T.brand,   Icon: Users       },
            { label: "Open work orders",  value: "5",         color: T.neutral, Icon: Target      },
            { label: "Supplier alerts",   value: "2 SCARs",   color: T.danger,  Icon: AlertTriangle },
            { label: "Plant utilisation", value: "72.4%",     color: T.warning, Icon: Gauge       },
            { label: "Month OEE target",  value: "85% →73.9%",color: T.danger,  Icon: TrendingDown },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} className="text-center">
              <Icon size={18} className="mx-auto mb-1.5" style={{ color }} />
              <p className="font-mono text-sm font-black tabular-nums" style={{ color }}>{value}</p>
              <p className="font-mono text-2xs text-text-disabled mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── PAGE ───────────────────────────────────────────────── */
export default function AdminPage() {
  const [view, setView]               = useState<"executive" | "technical">("executive");
  const [auditFilter, setAuditFilter] = useState<"all" | "warn" | "danger">("all");
  const healthyCount                  = SERVICES.filter((s) => s.status === "healthy").length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">
            {view === "executive" ? "Executive Overview" : "Administration"}
          </h1>
          <p className="font-mono text-xs text-text-tertiary mt-0.5">
            {view === "executive"
              ? "Business performance · financial impact · operational alerts"
              : "System · Users · Services · Pipelines · Security"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border p-0.5 bg-bg-subtle">
            <button
              onClick={() => setView("executive")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-2xs font-semibold transition-all"
              style={view === "executive"
                ? { background: T.sidebar, color: "#fff" }
                : { color: T.muted }
              }
            >
              <TrendingUp size={11} />
              Executive
            </button>
            <button
              onClick={() => setView("technical")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-2xs font-semibold transition-all"
              style={view === "technical"
                ? { background: T.sidebar, color: "#fff" }
                : { color: T.muted }
              }
            >
              <Terminal size={11} />
              Ops
            </button>
          </div>

          {view === "technical" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-2xs font-semibold"
              style={{ background: T.successDim, color: T.success }}>
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              {healthyCount}/{SERVICES.length} services healthy
            </span>
          )}
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-text-secondary font-mono text-2xs hover:bg-bg-subtle transition-colors">
            <RefreshCw size={11} />
            Refresh
          </button>
        </div>
      </div>

      {view === "executive"
        ? <ExecutiveView />
        : <TechnicalView auditFilter={auditFilter} setAuditFilter={setAuditFilter} />
      }
    </div>
  );
}
