"use client";

import { useState } from "react";
import { PLANTS, type PlantConfig } from "@/lib/enterprise-config";
import { Shield, CheckCircle2, AlertTriangle, Clock, XCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactECharts from "echarts-for-react";

function lcg(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

type CertStatus = "valid" | "expiring" | "expired" | "pending";

interface CertRecord {
  name: string;
  plant: string;
  plantEmoji: string;
  plantColor: string;
  industry: string;
  status: CertStatus;
  expiryDate: string;
  daysLeft: number;
  auditBody: string;
  scope: string;
}

const STATUS_CFG: Record<CertStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  valid:    { label: "Valid",    color: "#1A7A40", bg: "#E8F5EC", icon: CheckCircle2 },
  expiring: { label: "Expiring", color: "#A85E00", bg: "#FEF0D6", icon: Clock },
  expired:  { label: "Expired",  color: "#CC1800", bg: "#FDE8E4", icon: XCircle },
  pending:  { label: "Pending",  color: "#0057CC", bg: "#E8F0FF", icon: AlertTriangle },
};

function buildCerts(): CertRecord[] {
  const records: CertRecord[] = [];
  PLANTS.forEach(plant => {
    const rng = lcg(plant.id.charCodeAt(5) * 17);
    plant.certifications.forEach((cert, i) => {
      const daysLeft = Math.floor(rng() * 500 - 30);
      const status: CertStatus = daysLeft < 0 ? "expired" : daysLeft < 60 ? "expiring" : daysLeft < 400 ? "valid" : "pending";
      const year = 2026 + Math.floor(i / 2);
      const month = String(Math.floor(rng() * 12) + 1).padStart(2, "0");
      records.push({
        name: cert,
        plant: plant.name,
        plantEmoji: plant.industryEmoji,
        plantColor: plant.industryColor,
        industry: plant.industry,
        status,
        expiryDate: `${year}-${month}-${String(Math.floor(rng() * 28) + 1).padStart(2, "0")}`,
        daysLeft,
        auditBody: ["TÜV SÜD", "Bureau Veritas", "SGS", "LRQA", "DNV GL"][Math.floor(rng() * 5)],
        scope: ["Manufacturing", "Quality Management", "Environmental", "Safety", "Laboratory"][Math.floor(rng() * 5)],
      });
    });
  });
  return records;
}

const ALL_CERTS = buildCerts();

function StatusChip({ status }: { status: CertStatus }) {
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

function ComplianceSummaryChart() {
  const counts = { valid: 0, expiring: 0, expired: 0, pending: 0 };
  ALL_CERTS.forEach(c => counts[c.status]++);

  const opt = {
    backgroundColor: "transparent",
    tooltip: { textStyle: { fontSize: 10, fontFamily: "IBM Plex Mono" } },
    legend: { bottom: 0, textStyle: { fontSize: 9, fontFamily: "IBM Plex Mono" } },
    series: [{
      type: "pie",
      radius: ["45%", "72%"],
      center: ["50%", "45%"],
      data: [
        { value: counts.valid,    name: "Valid",    itemStyle: { color: "#1A7A40" } },
        { value: counts.expiring, name: "Expiring", itemStyle: { color: "#A85E00" } },
        { value: counts.expired,  name: "Expired",  itemStyle: { color: "#CC1800" } },
        { value: counts.pending,  name: "Pending",  itemStyle: { color: "#0057CC" } },
      ],
      label: { fontSize: 10, fontFamily: "IBM Plex Mono" },
    }],
  };

  return <ReactECharts option={opt} style={{ height: "220px", width: "100%" }} />;
}

function PlantComplianceScores() {
  const plantScores = PLANTS.map(plant => {
    const plantCerts = ALL_CERTS.filter(c => c.plant === plant.name);
    const valid = plantCerts.filter(c => c.status === "valid").length;
    const score = Math.round((valid / plantCerts.length) * 100);
    return { plant, score, total: plantCerts.length, valid };
  });

  const opt = {
    backgroundColor: "transparent",
    tooltip: { textStyle: { fontSize: 10, fontFamily: "IBM Plex Mono" } },
    grid: { top: 8, bottom: 8, left: 150, right: 50 },
    xAxis: { type: "value", max: 100, axisLabel: { fontSize: 9, fontFamily: "IBM Plex Mono", formatter: "{value}%" }, splitLine: { lineStyle: { color: "#F4F0EC" } } },
    yAxis: {
      type: "category",
      data: plantScores.map(ps => ps.plant.name.replace("Sunrise ", "")),
      axisLabel: { fontSize: 9, fontFamily: "IBM Plex Mono" },
    },
    series: [{
      type: "bar",
      data: plantScores.map(ps => ({
        value: ps.score,
        itemStyle: { color: ps.score >= 80 ? "#1A7A40" : ps.score >= 60 ? "#A85E00" : "#CC1800", borderRadius: [0, 3, 3, 0] },
      })),
      barWidth: 18,
      label: { show: true, position: "right", fontSize: 9, fontFamily: "IBM Plex Mono", formatter: "{c}%" },
    }],
  };

  return <ReactECharts option={opt} style={{ height: "140px", width: "100%" }} />;
}

function UpcomingRenewals() {
  const upcoming = [...ALL_CERTS]
    .filter(c => c.daysLeft >= 0 && c.daysLeft <= 180)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-2">
      {upcoming.map((cert, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-bgSubtle transition-colors">
          <span className="font-mono text-lg shrink-0">{cert.plantEmoji}</span>
          <div className="flex-1 min-w-0">
            <div className="font-heading text-xs font-bold text-text truncate">{cert.name}</div>
            <div className="font-mono text-2xs text-muted truncate">{cert.plant} · {cert.auditBody}</div>
          </div>
          <div className="shrink-0 text-right">
            <StatusChip status={cert.status} />
            <div className="font-mono text-2xs text-muted mt-0.5">{cert.daysLeft}d left</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GlobalCompliancePage() {
  const [filter, setFilter] = useState<"all" | CertStatus>("all");
  const [plantFilter, setPlantFilter] = useState<string>("all");

  const counts = { valid: 0, expiring: 0, expired: 0, pending: 0 };
  ALL_CERTS.forEach(c => counts[c.status]++);
  const complianceScore = Math.round((counts.valid / ALL_CERTS.length) * 100);

  const filtered = ALL_CERTS.filter(c =>
    (filter === "all" || c.status === filter) &&
    (plantFilter === "all" || c.plant === plantFilter)
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield size={16} className="text-brand" />
          <span className="font-mono text-2xs text-brand font-semibold uppercase tracking-widest">Enterprise</span>
        </div>
        <h1 className="font-heading text-2xl font-bold text-text">Global Compliance</h1>
        <p className="font-mono text-xs text-muted mt-0.5">Certifications, audits & regulatory status across all plants</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["valid", "expiring", "expired", "pending"] as CertStatus[]).map(s => {
          const cfg = STATUS_CFG[s];
          const Icon = cfg.icon;
          return (
            <div key={s} className="bg-white border border-border rounded-xl p-4 flex flex-col gap-1 cursor-pointer hover:border-brand/40 transition-colors"
                 onClick={() => setFilter(filter === s ? "all" : s)}>
              <div className="flex items-center gap-1.5">
                <Icon size={12} style={{ color: cfg.color }} />
                <span className="font-mono text-2xs text-muted capitalize">{cfg.label}</span>
              </div>
              <span className="font-heading text-2xl font-bold" style={{ color: cfg.color }}>{counts[s]}</span>
              <span className="font-mono text-2xs text-muted">certifications</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-sm font-bold text-text">Overall Score</h2>
            <span className="font-heading text-2xl font-bold" style={{ color: complianceScore >= 80 ? "#1A7A40" : complianceScore >= 60 ? "#A85E00" : "#CC1800" }}>
              {complianceScore}%
            </span>
          </div>
          <ComplianceSummaryChart />
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <h2 className="font-heading text-sm font-bold text-text mb-3">By Plant Score</h2>
          <PlantComplianceScores />
        </div>
        <div className="bg-white border border-border rounded-xl p-5">
          <h2 className="font-heading text-sm font-bold text-text mb-3">Upcoming Renewals</h2>
          <UpcomingRenewals />
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h2 className="font-heading text-sm font-bold text-text">Certification Register</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-bgMuted rounded-lg p-1">
              {(["all", "valid", "expiring", "expired", "pending"] as const).map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className={cn("px-2.5 py-1 rounded-md font-mono text-2xs capitalize transition-all",
                    filter === s ? "bg-white text-text shadow-sm font-semibold" : "text-muted hover:text-text")}>
                  {s}
                </button>
              ))}
            </div>
            <select
              value={plantFilter}
              onChange={e => setPlantFilter(e.target.value)}
              className="px-2 py-1.5 bg-bgMuted border border-border rounded-lg font-mono text-2xs text-text focus:outline-none focus:border-brand"
            >
              <option value="all">All plants</option>
              {PLANTS.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-sans">
            <thead>
              <tr className="border-b border-border">
                {["Certification", "Plant", "Industry", "Status", "Expiry", "Days Left", "Audit Body", "Scope"].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-mono text-2xs text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((cert, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-bgSubtle transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-text whitespace-nowrap">{cert.name}</td>
                  <td className="py-2.5 px-3">
                    <span className="flex items-center gap-1.5">
                      <span>{cert.plantEmoji}</span>
                      <span className="font-mono text-2xs text-muted whitespace-nowrap">{cert.plant.replace("Sunrise ","")}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-2xs text-muted whitespace-nowrap">{cert.industry}</td>
                  <td className="py-2.5 px-3"><StatusChip status={cert.status} /></td>
                  <td className="py-2.5 px-3 font-mono text-2xs text-text whitespace-nowrap">
                    <span className="flex items-center gap-1"><Calendar size={10} className="text-muted" />{cert.expiryDate}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono text-2xs font-bold" style={{ color: cert.daysLeft < 0 ? "#CC1800" : cert.daysLeft < 60 ? "#A85E00" : "#1A7A40" }}>
                      {cert.daysLeft < 0 ? `${Math.abs(cert.daysLeft)}d ago` : `${cert.daysLeft}d`}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-2xs text-muted whitespace-nowrap">{cert.auditBody}</td>
                  <td className="py-2.5 px-3 font-mono text-2xs text-muted whitespace-nowrap">{cert.scope}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center font-mono text-xs text-muted">No records match</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
