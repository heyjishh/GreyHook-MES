"use client";

import { useState } from "react";
import { Database, Save, RefreshCw, CheckCircle2, Info } from "lucide-react";

interface RetentionRule {
  id: string;
  label: string;
  desc: string;
  days: number;
  min: number;
  max: number;
}

const INIT: RetentionRule[] = [
  { id: "telemetry",    label: "Machine Telemetry",    desc: "Raw OPC-UA and MQTT events from edge gateway",          days: 90,   min: 7,   max: 1095 },
  { id: "oee",          label: "OEE Aggregates",       desc: "Hourly and daily OEE rollups per line",                 days: 365,  min: 30,  max: 1825 },
  { id: "audit",        label: "Audit Logs",           desc: "User actions, login events, permission changes",        days: 730,  min: 365, max: 2190 },
  { id: "reports",      label: "Reports",              desc: "Generated PDF and CSV production reports",              days: 365,  min: 30,  max: 1825 },
  { id: "erp_sync",     label: "ERP Sync Logs",        desc: "Integration sync history and payloads",                 days: 180,  min: 30,  max: 730  },
  { id: "ai_inv",       label: "AI Investigations",    desc: "AI-generated fault analysis and evidence chains",       days: 365,  min: 30,  max: 1825 },
  { id: "batch_records",label: "Batch Records (EBR)",  desc: "Electronic batch records (regulatory 21 CFR Part 11)", days: 2555, min: 1825,max: 3650 },
];

function daysLabel(d: number) {
  if (d >= 365 && d % 365 === 0) return `${d / 365} yr${d / 365 > 1 ? "s" : ""}`;
  if (d >= 30  && d % 30 === 0)  return `${d / 30} mo${d / 30 > 1 ? "s" : ""}`;
  return `${d} days`;
}

export default function DataRetentionPage() {
  const [rules, setRules] = useState<RetentionRule[]>(INIT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const setDays = (id: string, val: string) =>
    setRules((r) => r.map((rule) => rule.id === id ? { ...rule, days: Math.max(rule.min, Math.min(rule.max, parseInt(val) || rule.min)) } : rule));

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#001C2E] font-mono tracking-tight flex items-center gap-2">
          <Database size={20} className="text-[#F05230]" />
          Data Retention
        </h1>
        <p className="text-sm text-[#6A8A9A] mt-1">Set how long each data category is retained before automatic purge.</p>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50">
        <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Minimum retention periods are enforced to meet regulatory requirements (ISO 9001, FDA 21 CFR Part 11, GMP).
          Batch records cannot be set below 5 years.
        </p>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="p-5 rounded-xl border border-[#E8E4DF] bg-white">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="font-semibold text-sm text-[#001C2E] mb-0.5">{rule.label}</div>
                <div className="text-xs text-[#6A8A9A]">{rule.desc}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-bold font-mono text-[#F05230]">{daysLabel(rule.days)}</div>
                <div className="text-2xs text-[#6A8A9A]">{rule.days} days</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xs text-[#6A8A9A] w-16 text-right">{daysLabel(rule.min)}</span>
              <input
                type="range"
                min={rule.min}
                max={rule.max}
                step={rule.id === "batch_records" ? 365 : 30}
                value={rule.days}
                onChange={(e) => setDays(rule.id, e.target.value)}
                className="flex-1 accent-[#F05230]"
              />
              <span className="text-2xs text-[#6A8A9A] w-16">{daysLabel(rule.max)}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F05230] text-white text-sm font-semibold hover:bg-[#d94720] disabled:opacity-50 transition-colors"
      >
        {saving ? <RefreshCw size={14} className="animate-spin" /> :
         saved  ? <CheckCircle2 size={14} /> : <Save size={14} />}
        {saved ? "Saved!" : "Save Retention Policy"}
      </button>
    </div>
  );
}
