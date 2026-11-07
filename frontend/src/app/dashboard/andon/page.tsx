"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  User,
  Timer,
  ArrowUp,
  Wrench,
  Package,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

type MachineState = "running" | "idle" | "stopped" | "fault" | "setup" | "starved";
type AlertSeverity = "critical" | "high" | "medium" | "info";
type EscalationLevel = 1 | 2 | 3;

interface AndonAlert {
  id: string;
  machineId: string;
  machineName: string;
  line: string;
  type: "quality" | "material" | "maintenance" | "safety" | "downtime" | "operator" | "fault";
  severity: AlertSeverity;
  message: string;
  raisedAt: string;
  escalationLevel: EscalationLevel;
  elapsedSecs: number;
  escalationThresholds: [number, number, number];
  assignedTo?: string;
  acknowledged: boolean;
}

interface Machine {
  id: string;
  name: string;
  line: string;
  area: string;
  state: MachineState;
  oee: number;
  partsThisShift: number;
  targetThisShift: number;
  currentOp?: string;
  operator?: string;
  stateChangedAgo: string;
  alerts: number;
}

const MACHINES: Machine[] = [
  { id: "MC-01", name: "CNC Lathe #1",         line: "Line 3", area: "Machining", state: "running",  oee: 87, partsThisShift: 142, targetThisShift: 160, currentOp: "PST-GA-001", operator: "Rajan M.",  stateChangedAgo: "3h 12m", alerts: 0 },
  { id: "MC-02", name: "CNC Lathe #2",         line: "Line 3", area: "Machining", state: "fault",    oee: 0,  partsThisShift: 78,  targetThisShift: 160, currentOp: "PST-GA-001", operator: "Priya S.", stateChangedAgo: "14m",    alerts: 1 },
  { id: "MC-04", name: "Boring Centre",         line: "Line 3", area: "Machining", state: "setup",    oee: 0,  partsThisShift: 50,  targetThisShift: 100, currentOp: "PST-GA-001", operator: "Rajan M.",  stateChangedAgo: "22m",    alerts: 0 },
  { id: "PR-01", name: "50T Hydraulic Press",  line: "Line 1", area: "Assembly",  state: "running",  oee: 92, partsThisShift: 310, targetThisShift: 320, currentOp: "BDA-STD-002",operator: "Amit K.",  stateChangedAgo: "5h 00m", alerts: 0 },
  { id: "PR-02", name: "80T Press",            line: "Line 2", area: "Assembly",  state: "idle",     oee: 65, partsThisShift: 55,  targetThisShift: 100, currentOp: undefined,     operator: undefined,  stateChangedAgo: "35m",    alerts: 1 },
  { id: "HP-07", name: "Hydraulic Mould Press",line: "Cell 7", area: "Moulding",  state: "running",  oee: 78, partsThisShift: 18,  targetThisShift: 25,  currentOp: "EMT-NVH-003", operator: "Deepa R.", stateChangedAgo: "1h 55m", alerts: 0 },
  { id: "CM-01", name: "CMM",                  line: "QC Lab", area: "Quality",   state: "running",  oee: 70, partsThisShift: 48,  targetThisShift: 60,  currentOp: "Incoming QC", operator: "QC Singh", stateChangedAgo: "2h 10m", alerts: 0 },
  { id: "MC-05", name: "CNC Lathe #3",         line: "Line 2", area: "Machining", state: "starved",  oee: 0,  partsThisShift: 20,  targetThisShift: 160, currentOp: "PST-GA-001", operator: "Suresh B.",stateChangedAgo: "48m",    alerts: 1 },
];

const ALERTS: AndonAlert[] = [
  {
    id: "AND-001",
    machineId: "MC-02",
    machineName: "CNC Lathe #2",
    line: "Line 3",
    type: "fault",
    severity: "critical",
    message: "Spindle drive fault — Error E-SPD-04. Spindle not reaching set speed. Machine halted.",
    raisedAt: "11:46",
    escalationLevel: 2,
    elapsedSecs: 840,
    escalationThresholds: [300, 600, 900],
    assignedTo: "Maint. Kumar",
    acknowledged: true,
  } as AndonAlert & { type: "downtime" },
  {
    id: "AND-002",
    machineId: "PR-02",
    machineName: "80T Press",
    line: "Line 2",
    type: "material",
    severity: "high",
    message: "Material shortage — hub sub-assembly stock below 10 pcs. No WO material issued to press.",
    raisedAt: "11:28",
    escalationLevel: 2,
    elapsedSecs: 2100,
    escalationThresholds: [600, 1200, 1800],
    assignedTo: "Store Mgr.",
    acknowledged: true,
  },
  {
    id: "AND-003",
    machineId: "MC-05",
    machineName: "CNC Lathe #3",
    line: "Line 2",
    type: "material",
    severity: "high",
    message: "Starved — waiting for raw bar stock replenishment from stores. Operator idle.",
    raisedAt: "11:12",
    escalationLevel: 3,
    elapsedSecs: 2880,
    escalationThresholds: [600, 1200, 1800],
    assignedTo: "Sup. Sharma",
    acknowledged: false,
  },
];

const STATE_CONFIG: Record<MachineState, { label: string; bg: string; border: string; dot: string; textColor: string }> = {
  running:  { label: "Running",   bg: "bg-success/10",   border: "border-success/30",   dot: "bg-success",   textColor: "text-success" },
  idle:     { label: "Idle",      bg: "bg-warning/10",   border: "border-warning/30",   dot: "bg-warning",   textColor: "text-warning" },
  stopped:  { label: "Stopped",   bg: "bg-danger/10",    border: "border-danger/30",    dot: "bg-danger",    textColor: "text-danger" },
  fault:    { label: "Fault",     bg: "bg-danger/15",    border: "border-danger/50",    dot: "bg-danger",    textColor: "text-danger" },
  setup:    { label: "Setup",     bg: "bg-brand/10",     border: "border-brand/30",     dot: "bg-brand",     textColor: "text-brand" },
  starved:  { label: "Starved",   bg: "bg-warning/15",   border: "border-warning/50",   dot: "bg-warning",   textColor: "text-warning" },
};

const ALERT_TYPE_CONFIG: Record<AndonAlert["type"], { icon: React.ComponentType<{ size?: number; className?: string }>; label: string }> = {
  quality:     { icon: AlertTriangle, label: "Quality" },
  material:    { icon: Package,       label: "Material" },
  maintenance: { icon: Wrench,        label: "Maintenance" },
  safety:      { icon: AlertTriangle, label: "Safety" },
  downtime:    { icon: XCircle,       label: "Downtime" },
  operator:    { icon: User,          label: "Operator" },
  fault:       { icon: Zap,           label: "Fault" },
};

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  critical: "text-danger bg-danger/10 border-danger/30",
  high:     "text-warning bg-warning/10 border-warning/30",
  medium:   "text-brand bg-brand/10 border-brand/20",
  info:     "text-text-secondary bg-surface border-border",
};

function formatSecs(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m ${s}s`;
}

function EscalationBar({ alert }: { alert: AndonAlert }) {
  const [L1, L2, L3] = alert.escalationThresholds;
  const pct = Math.min((alert.elapsedSecs / L3) * 100, 100);
  const color = alert.elapsedSecs >= L3 ? "bg-danger" : alert.elapsedSecs >= L2 ? "bg-warning" : alert.elapsedSecs >= L1 ? "bg-warning/60" : "bg-success";
  return (
    <div className="mt-2">
      <div className="flex justify-between font-mono text-2xs text-text-disabled mb-1">
        <span>Elapsed: {formatSecs(alert.elapsedSecs)}</span>
        <span>L{alert.escalationLevel} escalation</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-border overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
        {[L1, L2].map((t) => (
          <div key={t} className="absolute top-0 bottom-0 w-px bg-bg/60" style={{ left: `${(t / L3) * 100}%` }} />
        ))}
      </div>
      <div className="flex justify-between font-mono text-2xs text-text-disabled mt-0.5">
        <span>{Math.floor(L1 / 60)}m</span>
        <span>{Math.floor(L2 / 60)}m</span>
        <span>{Math.floor(L3 / 60)}m</span>
      </div>
    </div>
  );
}

function MachineCard({ machine }: { machine: Machine }) {
  const cfg = STATE_CONFIG[machine.state];
  const pct = Math.min(Math.round((machine.partsThisShift / machine.targetThisShift) * 100), 100);
  const behind = machine.partsThisShift < machine.targetThisShift * 0.8;

  return (
    <div className={cn("rounded-xl border p-4 flex flex-col gap-2 transition-all", cfg.bg, cfg.border, machine.state === "fault" && "ring-1 ring-danger/40")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className={cn("w-2 h-2 rounded-full shrink-0 animate-pulse", cfg.dot)} />
            <span className={cn("font-mono text-2xs font-bold uppercase tracking-widest", cfg.textColor)}>{cfg.label}</span>
          </div>
          <div className="font-sans text-sm font-bold text-text-primary truncate">{machine.name}</div>
          <div className="font-mono text-2xs text-text-disabled">{machine.id} · {machine.line}</div>
        </div>
        {machine.alerts > 0 && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-danger/15 border border-danger/30 font-mono text-2xs text-danger shrink-0">
            <Bell size={9} />
            {machine.alerts}
          </div>
        )}
      </div>

      {/* OEE / output */}
      <div className="flex items-center gap-3">
        <div className="text-center">
          <div className={cn("font-mono text-lg font-bold", machine.oee > 0 ? "text-text-primary" : "text-text-disabled")}>
            {machine.oee > 0 ? `${machine.oee}%` : "—"}
          </div>
          <div className="font-mono text-2xs text-text-disabled">OEE</div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between font-mono text-2xs text-text-disabled mb-1">
            <span>{machine.partsThisShift} pcs</span>
            <span>/ {machine.targetThisShift}</span>
          </div>
          <div className="h-1.5 rounded-full bg-bg/50 overflow-hidden">
            <div
              className={cn("h-full rounded-full", behind ? "bg-warning" : "bg-success")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="font-mono text-2xs text-text-disabled mt-0.5">{pct}% of target</div>
        </div>
      </div>

      {machine.operator && (
        <div className="flex items-center gap-1.5 font-sans text-2xs text-text-secondary">
          <User size={9} className="text-text-disabled" />
          {machine.operator}
          {machine.currentOp && (
            <>
              <span className="text-text-disabled">·</span>
              <span className="font-mono truncate">{machine.currentOp}</span>
            </>
          )}
        </div>
      )}
      <div className="flex items-center gap-1 font-mono text-2xs text-text-disabled">
        <Timer size={9} />
        {machine.stateChangedAgo} in state
      </div>
    </div>
  );
}

export default function AndonPage() {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [view, setView] = useState<"board" | "alerts">("board");
  const [tick, setTick] = useState(0);
  const [areaFilter, setAreaFilter] = useState<string>("all");

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const unacknowledged = ALERTS.filter((a) => !a.acknowledged).length;
  const faults = MACHINES.filter((m) => m.state === "fault" || m.state === "stopped").length;
  const starved = MACHINES.filter((m) => m.state === "starved").length;

  const areas = Array.from(new Set(MACHINES.map((m) => m.area)));
  const filteredMachines = areaFilter === "all" ? MACHINES : MACHINES.filter((m) => m.area === areaFilter);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Top bar */}
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-lg font-bold text-text-primary">ANDON — Visual Factory</h1>
            <p className="font-sans text-xs text-text-secondary mt-0.5">
              Real-time machine status · alerts · escalation timers · shop floor response tracking
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSoundEnabled((s) => !s)}
              className="p-2 rounded-lg border border-border text-text-secondary hover:border-brand hover:text-brand transition-colors"
              title={soundEnabled ? "Mute alerts" : "Enable alert sound"}
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-surface border border-border">
              {(["board", "alerts"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-3 py-1 rounded-md font-sans text-xs font-medium capitalize transition-colors",
                    view === v ? "bg-brand text-white" : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {v === "board" ? "Machine Board" : `Alerts ${ALERTS.length > 0 ? `(${ALERTS.length})` : ""}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-5">
        {/* Alert banner */}
        {(faults > 0 || unacknowledged > 0) && (
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl border",
            faults > 0 ? "bg-danger/5 border-danger/25" : "bg-warning/5 border-warning/25"
          )}>
            <Bell size={14} className={faults > 0 ? "text-danger animate-pulse" : "text-warning"} />
            <div className="flex-1 font-sans text-sm text-text-primary">
              {faults > 0 && <span className="text-danger font-semibold">{faults} machine{faults > 1 ? "s" : ""} in fault/stopped state. </span>}
              {unacknowledged > 0 && <span className="text-warning font-semibold">{unacknowledged} unacknowledged alert{unacknowledged > 1 ? "s" : ""}. </span>}
              Supervisor response required.
            </div>
            <button
              onClick={() => setView("alerts")}
              className="px-3 py-1.5 rounded-lg bg-danger text-white text-xs font-sans font-semibold hover:bg-danger/90 transition-colors shrink-0"
            >
              View Alerts
            </button>
          </div>
        )}

        {/* Plant KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Running",  value: MACHINES.filter(m => m.state === "running").length,  of: MACHINES.length, color: "text-success" },
            { label: "Idle",     value: MACHINES.filter(m => m.state === "idle").length,     of: MACHINES.length, color: "text-warning" },
            { label: "Fault",    value: MACHINES.filter(m => m.state === "fault").length,    of: MACHINES.length, color: "text-danger" },
            { label: "Starved",  value: MACHINES.filter(m => m.state === "starved").length,  of: MACHINES.length, color: "text-warning" },
          ].map(({ label, value, of, color }) => (
            <div key={label} className="p-4 rounded-xl bg-surface border border-border flex items-center gap-3">
              <div className={cn("font-mono text-2xl font-bold", color)}>{value}</div>
              <div>
                <div className="font-sans text-xs font-semibold text-text-primary">{label}</div>
                <div className="font-mono text-2xs text-text-disabled">of {of} machines</div>
              </div>
            </div>
          ))}
        </div>

        {view === "board" && (
          <>
            {/* Area filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-sans text-xs text-text-disabled">Filter:</span>
              {["all", ...areas].map((a) => (
                <button
                  key={a}
                  onClick={() => setAreaFilter(a)}
                  className={cn(
                    "px-3 py-1 rounded-full border font-sans text-xs font-medium transition-colors capitalize",
                    areaFilter === a ? "bg-brand text-white border-brand" : "border-border text-text-secondary hover:border-brand hover:text-brand"
                  )}
                >
                  {a === "all" ? "All Areas" : a}
                </button>
              ))}
            </div>

            {/* Machine grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredMachines.map((m) => <MachineCard key={m.id} machine={m} />)}
            </div>
          </>
        )}

        {view === "alerts" && (
          <div className="space-y-3">
            {ALERTS.length === 0 ? (
              <div className="p-12 rounded-xl border border-dashed border-border text-center">
                <CheckCircle2 size={32} className="text-success mx-auto mb-3" />
                <p className="font-sans text-sm text-text-secondary">No active alerts — all machines nominal.</p>
              </div>
            ) : (
              ALERTS.map((alert) => {
                const TypeCfg = ALERT_TYPE_CONFIG[alert.type];
                const TypeIcon = TypeCfg.icon;
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "rounded-xl border p-4",
                      alert.severity === "critical" ? "bg-danger/5 border-danger/25" : "bg-warning/5 border-warning/25",
                      !alert.acknowledged && "ring-1 ring-offset-0 ring-danger/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <TypeIcon size={16} className={alert.severity === "critical" ? "text-danger" : "text-warning"} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={cn("px-1.5 py-0.5 rounded text-2xs font-mono font-bold border uppercase", SEVERITY_COLOR[alert.severity])}>
                            {alert.severity}
                          </span>
                          <span className="font-mono text-xs text-text-primary font-bold">{alert.machineName}</span>
                          <span className="font-mono text-2xs text-text-disabled">{alert.line}</span>
                          <span className="font-mono text-2xs text-text-disabled">{alert.id}</span>
                          {!alert.acknowledged && (
                            <span className="ml-auto px-1.5 py-0.5 rounded text-2xs bg-danger/10 text-danger border border-danger/20 font-mono animate-pulse">
                              UNACKNOWLEDGED
                            </span>
                          )}
                        </div>
                        <p className="font-sans text-sm text-text-primary leading-relaxed mb-2">{alert.message}</p>
                        <EscalationBar alert={alert} />
                        <div className="flex items-center gap-4 mt-3 font-sans text-xs text-text-secondary">
                          <span className="flex items-center gap-1"><Clock size={10} /> Raised {alert.raisedAt}</span>
                          {alert.assignedTo && <span className="flex items-center gap-1"><User size={10} /> {alert.assignedTo}</span>}
                          <span className="flex items-center gap-1"><ArrowUp size={10} /> Level {alert.escalationLevel} escalation</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {!alert.acknowledged && (
                          <button className="px-2.5 py-1.5 rounded-lg bg-danger text-white text-xs font-sans font-semibold hover:bg-danger/90 transition-colors">
                            Acknowledge
                          </button>
                        )}
                        <button className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-sans text-text-secondary hover:border-brand hover:text-brand transition-colors">
                          Resolve
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
