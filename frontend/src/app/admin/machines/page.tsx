"use client";

import { useState } from "react";
import { Cpu, Wifi, Radio, CheckCircle2, AlertCircle, XCircle, Plus, Settings, RefreshCw } from "lucide-react";
import { InsightBanner } from "@/components/admin/InsightBanner";

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
  border:    "#E8E4DF",
  text:      "#001C2E",
  muted:     "#6A8A9A",
  disabled:  "#B0C4CE",
  bg:        "#FFFFFF",
  bgSubtle:  "#FAFAF8",
};

type Protocol = "OPC UA" | "MQTT";
type ConnStatus = "connected" | "degraded" | "offline";

interface Machine {
  id: string;
  code: string;
  name: string;
  type: string;
  protocol: Protocol;
  host: string;
  status: ConnStatus;
  oee30d: number;
  lastSeen: string;
  tags: string[];
}

const MACHINES: Machine[] = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    code: "M-01", name: "AP-ENGINE-MOUNT-V2", type: "CNC Machining",
    protocol: "OPC UA", host: "192.168.10.11:4840",
    status: "connected", oee30d: 0.767, lastSeen: "< 1s", tags: ["shift-2","critical"],
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    code: "M-02", name: "AP-FRAME-WELD-01", type: "Welding",
    protocol: "MQTT", host: "mqtt://broker:1883/weld/m02",
    status: "connected", oee30d: 0.588, lastSeen: "< 1s", tags: ["shift-2"],
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    code: "M-03", name: "AP-PRESS-FORM-03", type: "Stamping Press",
    protocol: "OPC UA", host: "192.168.10.13:4840",
    status: "degraded", oee30d: 0.440, lastSeen: "2 min", tags: ["shift-2","monitor"],
  },
  {
    id: "10000000-0000-0000-0000-000000000004",
    code: "M-04", name: "AP-ASSEM-LINE-A", type: "Assembly",
    protocol: "MQTT", host: "mqtt://broker:1883/assem/m04",
    status: "connected", oee30d: 0.874, lastSeen: "< 1s", tags: ["shift-2"],
  },
];

function oeeColor(v: number) {
  if (v >= 0.85) return T.brand;
  if (v >= 0.65) return T.warning;
  if (v >= 0.5)  return "#B86A00";
  return T.danger;
}

function ConnBadge({ status }: { status: ConnStatus }) {
  const cfg = {
    connected: { icon: CheckCircle2, color: T.success, bg: T.successDim, label: "Connected" },
    degraded:  { icon: AlertCircle,  color: T.warning, bg: T.warningDim, label: "Degraded"  },
    offline:   { icon: XCircle,      color: T.danger,  bg: T.dangerDim,  label: "Offline"   },
  }[status];
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-2xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function ProtocolBadge({ p }: { p: Protocol }) {
  const isOPC = p === "OPC UA";
  return (
    <span className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-2xs font-semibold"
      style={{
        background: isOPC ? T.brandDim : "#F0F4FF",
        color:      isOPC ? T.brand    : "#2A4A9A",
      }}>
      {isOPC ? <Wifi size={10} /> : <Radio size={10} />}
      {p}
    </span>
  );
}

export default function AdminMachinesPage() {
  const [filter, setFilter] = useState<"all" | ConnStatus>("all");
  const visible = filter === "all" ? MACHINES : MACHINES.filter((m) => m.status === filter);

  return (
    <div className="space-y-5">

      <InsightBanner
        variant="info"
        title="Machines must be assigned to a production line"
        message="If you haven't created production lines yet, go to Admin → Production Lines first. Each machine needs a line so OEE is calculated at the right level."
        actionLabel="Go to Production Lines"
        actionHref="/admin/lines"
        dismissible
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Machine Management</h1>
          <p className="font-mono text-xs text-text-tertiary mt-0.5">OPC UA · MQTT · read-only connectivity</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 font-mono text-xs text-text-secondary border border-border rounded-lg px-3 py-2 hover:bg-bg-subtle transition-colors">
            <RefreshCw size={12} /> Sync All
          </button>
          <button
            className="inline-flex items-center gap-1.5 font-mono text-xs font-bold rounded-lg px-3 py-2 transition-colors"
            style={{ background: T.brand, color: "#fff" }}
          >
            <Plus size={12} /> Add Machine
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",     value: "4",  color: T.text },
          { label: "Connected", value: "3",  color: T.success },
          { label: "Degraded",  value: "1",  color: T.warning },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-card text-center">
            <p className="font-mono text-2xl font-black leading-none tabular-nums" style={{ color }}>{value}</p>
            <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-bg-subtle border border-border rounded-lg p-0.5 w-fit">
        {(["all","connected","degraded","offline"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="font-mono text-xs px-3 py-1.5 rounded-md capitalize transition-all"
            style={filter === f ? { background: T.brand, color: "#fff", fontWeight: 700 } : { color: T.muted }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="grid grid-cols-[2rem_1fr_1fr_8rem_6rem_5rem_7rem_4rem] items-center px-5 py-2.5 bg-bg-subtle border-b border-border gap-3">
          {["","Machine","Host / Endpoint","Protocol","Status","OEE 30d","Last Seen",""].map((h, i) => (
            <span key={i} className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{h}</span>
          ))}
        </div>
        <div className="divide-y divide-border">
          {visible.map((m) => {
            const c = oeeColor(m.oee30d);
            return (
              <div key={m.id} className="grid grid-cols-[2rem_1fr_1fr_8rem_6rem_5rem_7rem_4rem] items-center px-5 py-3.5 gap-3 hover:bg-bg-subtle transition-colors">
                {/* Code */}
                <span className="font-mono text-2xs font-bold text-text-disabled">{m.code}</span>

                {/* Name + type + tags */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-sans text-xs font-bold text-text-primary">{m.name}</p>
                    {m.tags.includes("critical") && (
                      <span className="font-mono text-2xs px-1.5 py-0.5 rounded" style={{ background: T.dangerDim, color: T.danger }}>critical</span>
                    )}
                    {m.tags.includes("monitor") && (
                      <span className="font-mono text-2xs px-1.5 py-0.5 rounded" style={{ background: T.warningDim, color: T.warning }}>monitor</span>
                    )}
                  </div>
                  <p className="font-mono text-2xs text-text-disabled mt-0.5">{m.type}</p>
                </div>

                {/* Host */}
                <p className="font-mono text-2xs text-text-secondary truncate">{m.host}</p>

                {/* Protocol */}
                <div><ProtocolBadge p={m.protocol} /></div>

                {/* Status */}
                <div><ConnBadge status={m.status} /></div>

                {/* OEE */}
                <div>
                  <p className="font-mono text-sm font-black tabular-nums" style={{ color: c }}>
                    {(m.oee30d * 100).toFixed(0)}%
                  </p>
                  <div className="w-full h-1 rounded-full bg-bg-muted mt-1 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${m.oee30d * 100}%`, backgroundColor: c }} />
                  </div>
                </div>

                {/* Last seen */}
                <span className="font-mono text-2xs text-text-disabled tabular-nums">{m.lastSeen}</span>

                {/* Actions */}
                <button className="text-text-disabled hover:text-brand transition-colors">
                  <Settings size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 bg-bg-subtle border border-border rounded-xl px-5 py-4">
        <Wifi size={14} style={{ color: T.muted }} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-sans text-xs font-bold text-text-primary">OPC UA security mode: SignAndEncrypt</p>
          <p className="font-mono text-2xs text-text-disabled mt-0.5">
            All connections are read-only. Edge gateway is outbound-only TLS. No inbound ports exposed.
          </p>
        </div>
      </div>
    </div>
  );
}
