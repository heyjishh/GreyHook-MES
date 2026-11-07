"use client";

import { useState } from "react";
import { PLANTS, type PlantConfig } from "@/lib/enterprise-config";
import { ArrowRightLeft, Package, Truck, CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function lcg(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

type TransferStatus = "in_transit" | "pending" | "completed" | "cancelled";

interface WIPTransfer {
  id: string;
  woNumber: string;
  material: string;
  quantity: string;
  unit: string;
  fromPlant: PlantConfig;
  toPlant: PlantConfig;
  status: TransferStatus;
  initiatedBy: string;
  initiatedAt: string;
  eta: string;
  reason: string;
  priority: "critical" | "high" | "normal";
  progressPct: number;
}

const STATUS_CFG: Record<TransferStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  in_transit: { label: "In Transit", color: "#0057CC", bg: "#E8F0FF", icon: Truck },
  pending:    { label: "Pending",    color: "#A85E00", bg: "#FEF0D6", icon: Clock },
  completed:  { label: "Completed",  color: "#1A7A40", bg: "#E8F5EC", icon: CheckCircle2 },
  cancelled:  { label: "Cancelled",  color: "#CC1800", bg: "#FDE8E4", icon: XCircle },
};

const PRIORITY_CFG = {
  critical: { color: "#CC1800", label: "Critical" },
  high:     { color: "#A85E00", label: "High" },
  normal:   { color: "#1A7A40", label: "Normal" },
};

function buildTransfers(): WIPTransfer[] {
  const rng = lcg(99);
  const materials: Record<string, string[]> = {
    Automotive: ["Stamped Body Panels", "Engine Sub-Assembly", "Wiring Harness"],
    Pharmaceutical: ["Granulated API", "Coated Tablets WIP", "Blended Powder"],
    Electronics: ["SMT Loaded PCBs", "Tested Sub-modules", "IC Chip Reels"],
    Textile: ["Grey Fabric Rolls", "Dyed Yarn Spools", "Woven WIP"],
  };

  const reasons = [
    "Capacity overflow — target plant has spare capacity",
    "Quality specialisation — better process at target",
    "Urgent customer order at target plant",
    "Raw material availability at source plant",
    "Planned load balancing across network",
    "Emergency: machine breakdown at source plant",
  ];

  const statuses: TransferStatus[] = ["in_transit", "in_transit", "pending", "pending", "completed", "completed", "cancelled"];
  const priorities: ("critical" | "high" | "normal")[] = ["critical", "high", "high", "normal", "normal", "normal"];

  const transfers: WIPTransfer[] = [];
  PLANTS.forEach((fromPlant, fi) => {
    const toCandidates = PLANTS.filter(p => p.id !== fromPlant.id);
    const toPlant = toCandidates[Math.floor(rng() * toCandidates.length)];
    const mats = materials[fromPlant.industry] ?? ["WIP Goods"];
    const material = mats[Math.floor(rng() * mats.length)];
    const qty = Math.floor(rng() * 500 + 50);
    const statusIdx = Math.floor(rng() * statuses.length);
    const priorityIdx = Math.floor(rng() * priorities.length);

    transfers.push({
      id: `wip-${fi}`,
      woNumber: `WO-TRF-${String(fi + 1).padStart(3, "0")}`,
      material,
      quantity: String(qty),
      unit: fromPlant.unit,
      fromPlant,
      toPlant,
      status: statuses[statusIdx],
      initiatedBy: ["Rajan M.", "Dr. Priya S.", "Asha K.", "Vinod T."][Math.floor(rng() * 4)],
      initiatedAt: `2026-11-${String(Math.floor(rng() * 5) + 1).padStart(2, "0")} ${String(Math.floor(rng() * 12) + 7).padStart(2, "0")}:${String(Math.floor(rng() * 60)).padStart(2, "0")}`,
      eta: `2026-11-${String(Math.floor(rng() * 5) + 5).padStart(2, "0")}`,
      reason: reasons[Math.floor(rng() * reasons.length)],
      priority: priorities[priorityIdx],
      progressPct: statuses[statusIdx] === "completed" ? 100 : statuses[statusIdx] === "cancelled" ? 0 : Math.floor(rng() * 80 + 10),
    });
  });

  return transfers;
}

const TRANSFERS = buildTransfers();

function StatusChip({ status }: { status: TransferStatus }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-2xs font-semibold"
          style={{ background: cfg.bg, color: cfg.color }}>
      <Icon size={9} />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ pct, status }: { pct: number; status: TransferStatus }) {
  const color = status === "completed" ? "#1A7A40" : status === "cancelled" ? "#CC1800" : "#0057CC";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-bgMuted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-2xs text-muted w-8 text-right">{pct}%</span>
    </div>
  );
}

function TransferCard({ t }: { t: WIPTransfer }) {
  const pCfg = PRIORITY_CFG[t.priority];
  return (
    <div className={cn(
      "bg-white border rounded-xl p-4 flex flex-col gap-3",
      t.priority === "critical" ? "border-danger/40" : "border-border"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xs text-muted">{t.woNumber}</span>
            <span className="font-mono text-2xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: pCfg.color + "18", color: pCfg.color }}>
              {pCfg.label}
            </span>
          </div>
          <div className="font-heading text-sm font-bold text-text mt-0.5">{t.material}</div>
        </div>
        <StatusChip status={t.status} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          <span className="text-lg">{t.fromPlant.industryEmoji}</span>
          <span className="font-mono text-2xs text-muted whitespace-nowrap">{t.fromPlant.location}</span>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <ProgressBar pct={t.progressPct} status={t.status} />
          <div className="flex justify-between">
            <span className="font-mono text-2xs text-muted">{t.fromPlant.name.replace("Sunrise ","")}</span>
            <ArrowRightLeft size={10} className="text-muted" />
            <span className="font-mono text-2xs text-muted">{t.toPlant.name.replace("Sunrise ","")}</span>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg">{t.toPlant.industryEmoji}</span>
          <span className="font-mono text-2xs text-muted whitespace-nowrap">{t.toPlant.location}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-bgSubtle rounded-lg p-2">
          <div className="font-mono text-2xs text-muted">Quantity</div>
          <div className="font-heading text-sm font-bold text-text">{t.quantity} <span className="font-mono text-2xs text-muted">{t.unit}</span></div>
        </div>
        <div className="bg-bgSubtle rounded-lg p-2">
          <div className="font-mono text-2xs text-muted">ETA</div>
          <div className="font-heading text-sm font-bold text-text">{t.eta}</div>
        </div>
      </div>

      <div className="flex items-start gap-1.5 pt-1 border-t border-border">
        <AlertTriangle size={10} className="text-muted mt-0.5 shrink-0" />
        <span className="font-mono text-2xs text-muted">{t.reason}</span>
      </div>
    </div>
  );
}

function NewTransferModal({ onClose }: { onClose: () => void }) {
  const [from, setFrom] = useState(PLANTS[0].id);
  const [to, setTo] = useState(PLANTS[1].id);

  return (
    <div className="bg-white border border-brand/30 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold text-text">Initiate Cross-Plant WIP Transfer</h2>
        <button onClick={onClose} className="font-mono text-2xs text-muted hover:text-text">✕ Cancel</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-mono text-2xs text-muted mb-1">Source Plant</label>
          <select value={from} onChange={e => setFrom(e.target.value)}
            className="w-full px-3 py-2 bg-bgSubtle border border-border rounded-lg font-mono text-xs text-text focus:outline-none focus:border-brand">
            {PLANTS.map(p => <option key={p.id} value={p.id}>{p.industryEmoji} {p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-mono text-2xs text-muted mb-1">Destination Plant</label>
          <select value={to} onChange={e => setTo(e.target.value)}
            className="w-full px-3 py-2 bg-bgSubtle border border-border rounded-lg font-mono text-xs text-text focus:outline-none focus:border-brand">
            {PLANTS.filter(p => p.id !== from).map(p => <option key={p.id} value={p.id}>{p.industryEmoji} {p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-mono text-2xs text-muted mb-1">Material Description</label>
          <input placeholder="e.g. Stamped Body Panels"
            className="w-full px-3 py-2 bg-bgSubtle border border-border rounded-lg font-mono text-xs text-text placeholder:text-muted focus:outline-none focus:border-brand" />
        </div>
        <div>
          <label className="block font-mono text-2xs text-muted mb-1">Quantity</label>
          <input type="number" placeholder="0"
            className="w-full px-3 py-2 bg-bgSubtle border border-border rounded-lg font-mono text-xs text-text placeholder:text-muted focus:outline-none focus:border-brand" />
        </div>
        <div className="md:col-span-2">
          <label className="block font-mono text-2xs text-muted mb-1">Transfer Reason</label>
          <input placeholder="Reason for cross-plant transfer"
            className="w-full px-3 py-2 bg-bgSubtle border border-border rounded-lg font-mono text-xs text-text placeholder:text-muted focus:outline-none focus:border-brand" />
        </div>
        <div>
          <label className="block font-mono text-2xs text-muted mb-1">Priority</label>
          <select className="w-full px-3 py-2 bg-bgSubtle border border-border rounded-lg font-mono text-xs text-text focus:outline-none focus:border-brand">
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="block font-mono text-2xs text-muted mb-1">Expected ETA</label>
          <input type="date"
            className="w-full px-3 py-2 bg-bgSubtle border border-border rounded-lg font-mono text-xs text-text focus:outline-none focus:border-brand" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button onClick={onClose} className="px-4 py-2 border border-border rounded-lg font-mono text-xs text-muted hover:text-text transition-colors">Cancel</button>
        <button className="px-4 py-2 bg-brand text-white rounded-lg font-mono text-xs font-semibold hover:opacity-90 transition-opacity">
          Initiate Transfer
        </button>
      </div>
    </div>
  );
}

export default function WIPTransferPage() {
  const [statusFilter, setStatusFilter] = useState<TransferStatus | "all">("all");
  const [showNew, setShowNew] = useState(false);

  const counts = TRANSFERS.reduce((acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);
  const filtered = TRANSFERS.filter(t => statusFilter === "all" || t.status === statusFilter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ArrowRightLeft size={16} className="text-brand" />
            <span className="font-mono text-2xs text-brand font-semibold uppercase tracking-widest">Enterprise</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-text">Cross-Plant WIP Transfer</h1>
          <p className="font-mono text-xs text-muted mt-0.5">Move work-in-progress between plants for load balancing & overflow</p>
        </div>
        <button onClick={() => setShowNew(v => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white rounded-lg font-mono text-xs font-semibold hover:opacity-90 transition-opacity">
          <Package size={13} /> New Transfer
        </button>
      </div>

      {showNew && <NewTransferModal onClose={() => setShowNew(false)} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["in_transit", "pending", "completed", "cancelled"] as TransferStatus[]).map(s => {
          const cfg = STATUS_CFG[s];
          const Icon = cfg.icon;
          return (
            <div key={s} className="bg-white border border-border rounded-xl p-4 cursor-pointer hover:border-brand/40 transition-colors"
                 onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={12} style={{ color: cfg.color }} />
                <span className="font-mono text-2xs text-muted">{cfg.label}</span>
              </div>
              <div className="font-heading text-2xl font-bold" style={{ color: cfg.color }}>{counts[s] ?? 0}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h2 className="font-heading text-sm font-bold text-text">Active Transfers</h2>
          <div className="flex items-center gap-1 bg-bgMuted rounded-lg p-1">
            {(["all", "in_transit", "pending", "completed", "cancelled"] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn("px-2.5 py-1 rounded-md font-mono text-2xs transition-all capitalize",
                  statusFilter === s ? "bg-white text-text shadow-sm font-semibold" : "text-muted hover:text-text")}>
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
          {filtered.map(t => <TransferCard key={t.id} t={t} />)}
          {filtered.length === 0 && (
            <div className="col-span-2 py-12 text-center font-mono text-xs text-muted">No transfers match</div>
          )}
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl p-5">
        <h2 className="font-heading text-sm font-bold text-text mb-4">Transfer History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-sans">
            <thead>
              <tr className="border-b border-border">
                {["WO No.", "Material", "From", "To", "Qty", "Status", "Priority", "ETA", "Initiated By"].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-mono text-2xs text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRANSFERS.map(t => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-bgSubtle transition-colors">
                  <td className="py-2.5 px-3 font-mono text-2xs text-brand">{t.woNumber}</td>
                  <td className="py-2.5 px-3 font-semibold text-text whitespace-nowrap">{t.material}</td>
                  <td className="py-2.5 px-3">
                    <span className="flex items-center gap-1 font-mono text-2xs text-muted whitespace-nowrap">
                      {t.fromPlant.industryEmoji} {t.fromPlant.location}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="flex items-center gap-1 font-mono text-2xs text-muted whitespace-nowrap">
                      {t.toPlant.industryEmoji} {t.toPlant.location}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-2xs whitespace-nowrap">{t.quantity} {t.unit}</td>
                  <td className="py-2.5 px-3"><StatusChip status={t.status} /></td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono text-2xs font-semibold" style={{ color: PRIORITY_CFG[t.priority].color }}>
                      {PRIORITY_CFG[t.priority].label}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-2xs text-text">{t.eta}</td>
                  <td className="py-2.5 px-3 font-mono text-2xs text-muted">{t.initiatedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
