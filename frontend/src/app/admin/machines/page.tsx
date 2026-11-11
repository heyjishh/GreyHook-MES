"use client";

import { useEffect, useState } from "react";
import { Cpu, Wifi, Radio, CheckCircle2, AlertCircle, XCircle, Settings, RefreshCw } from "lucide-react";
import { InsightBanner } from "@/components/admin/InsightBanner";
import { factoriesApi } from "@/lib/api";
import type { MachineSchema, MachineStatusSchema, MachineState } from "@/types/api";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

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
  bgMuted:   "#F4F0EC",
};

type ConnStatus = "connected" | "degraded" | "offline";

interface DisplayMachine {
  id: string;
  code: string;
  name: string;
  type: string;
  protocol: string;
  host: string;
  status: ConnStatus;
  lastSeen: string;
}

const MOCK_MACHINES: DisplayMachine[] = [
  { id:"10000000-0000-0000-0000-000000000001", code:"M-01", name:"CNC Lathe #1",    type:"CNC Machining",  protocol:"OPC UA", host:"192.168.10.11:4840",        status:"connected", lastSeen:"< 1s" },
  { id:"10000000-0000-0000-0000-000000000002", code:"M-02", name:"Press Machine",   type:"Press",          protocol:"MQTT",   host:"mqtt://broker:1883/m02",     status:"connected", lastSeen:"< 1s" },
  { id:"10000000-0000-0000-0000-000000000003", code:"M-03", name:"Welding Robot",   type:"Robot Welder",   protocol:"OPC UA", host:"192.168.10.13:4840",         status:"degraded",  lastSeen:"2 min" },
  { id:"10000000-0000-0000-0000-000000000004", code:"M-04", name:"QC Station",      type:"Inspection",     protocol:"MQTT",   host:"mqtt://broker:1883/qc",      status:"connected", lastSeen:"< 1s" },
];

function stateToConnStatus(state: MachineState): ConnStatus {
  if (state === "running" || state === "idle") return "connected";
  if (state === "fault") return "degraded";
  return "offline";
}

function formatLastSeen(isoStr: string | null): string {
  if (!isoStr) return "unknown";
  const diff = Date.now() - new Date(isoStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 10) return "< 1s";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h`;
}

function protocolLabel(p: string): string {
  if (p === "opcua") return "OPC UA";
  if (p === "mqtt")  return "MQTT";
  return p;
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

function ProtocolBadge({ p }: { p: string }) {
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
  const [machines, setMachines] = useState<DisplayMachine[]>(IS_MOCK ? MOCK_MACHINES : []);
  const [loading, setLoading]   = useState(!IS_MOCK);
  const [filter, setFilter]     = useState<"all" | ConnStatus>("all");
  const [refreshing, setRefreshing] = useState(false);

  const loadMachines = async () => {
    if (IS_MOCK) return;
    setLoading(true);
    try {
      const factories = await factoriesApi.list();
      const factory = factories.items[0];
      if (!factory) return;

      const [machineRes, statusRes] = await Promise.all([
        factoriesApi.listMachines(factory.id),
        factoriesApi.getMachineStatuses(factory.id).catch(() => ({ items: [] as MachineStatusSchema[], as_of: "" })),
      ]);

      const statusMap = new Map(statusRes.items.map((s) => [s.machine_id, s]));

      setMachines(machineRes.items.map((m: MachineSchema, i: number): DisplayMachine => {
        const st = statusMap.get(m.id);
        return {
          id: m.id,
          code: m.asset_tag ?? `M-${String(i + 1).padStart(2, "0")}`,
          name: m.name,
          type: m.machine_type,
          protocol: protocolLabel(m.protocol),
          host: `${m.protocol === "opcua" ? "opc.tcp" : "mqtt"}://…`,
          status: st ? stateToConnStatus(st.current_state) : "offline",
          lastSeen: st ? formatLastSeen(st.last_event_at) : "unknown",
        };
      }));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMachines(); }, []);

  const handleSync = async () => {
    setRefreshing(true);
    await loadMachines();
    setRefreshing(false);
  };

  const visible = filter === "all" ? machines : machines.filter((m) => m.status === filter);
  const connected = machines.filter((m) => m.status === "connected").length;
  const degraded  = machines.filter((m) => m.status === "degraded").length;

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

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Machine Management</h1>
          <p className="font-mono text-xs text-text-tertiary mt-0.5">OPC UA · MQTT · read-only connectivity</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-text-secondary border border-border rounded-lg px-3 py-2 hover:bg-bg-subtle transition-colors"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Sync All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",     value: machines.length.toString(), color: T.text },
          { label: "Connected", value: connected.toString(),       color: T.success },
          { label: "Degraded",  value: degraded.toString(),        color: T.warning },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-card text-center">
            <p className="font-mono text-2xl font-black leading-none tabular-nums" style={{ color }}>{value}</p>
            <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest mt-1.5">{label}</p>
          </div>
        ))}
      </div>

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

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="grid grid-cols-[2rem_1fr_1fr_8rem_6rem_7rem_3rem] items-center px-5 py-2.5 bg-bg-subtle border-b border-border gap-3">
          {["","Machine","Host","Protocol","Status","Last Seen",""].map((h, i) => (
            <span key={i} className="font-mono text-2xs text-text-disabled uppercase tracking-widest">{h}</span>
          ))}
        </div>
        {loading ? (
          <div className="px-5 py-10 text-center font-mono text-xs text-text-disabled">Loading machines…</div>
        ) : visible.length === 0 ? (
          <div className="px-5 py-10 text-center font-mono text-xs text-text-disabled">No machines found</div>
        ) : (
          <div className="divide-y divide-border">
            {visible.map((m) => (
              <div key={m.id} className="grid grid-cols-[2rem_1fr_1fr_8rem_6rem_7rem_3rem] items-center px-5 py-3.5 gap-3 hover:bg-bg-subtle transition-colors">
                <span className="font-mono text-2xs font-bold text-text-disabled">{m.code}</span>
                <div className="min-w-0">
                  <p className="font-sans text-xs font-bold text-text-primary">{m.name}</p>
                  <p className="font-mono text-2xs text-text-disabled mt-0.5">{m.type}</p>
                </div>
                <p className="font-mono text-2xs text-text-secondary truncate">{m.host}</p>
                <div><ProtocolBadge p={m.protocol} /></div>
                <div><ConnBadge status={m.status} /></div>
                <span className="font-mono text-2xs text-text-disabled tabular-nums">{m.lastSeen}</span>
                <button className="text-text-disabled hover:text-brand transition-colors">
                  <Settings size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
