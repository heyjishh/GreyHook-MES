"use client";

import { useState } from "react";
import { AlertTriangle, Save, RefreshCw, CheckCircle2, Bell, Mail, MessageSquare } from "lucide-react";
import { InsightBanner } from "@/components/admin/InsightBanner";
import { cn } from "@/lib/utils";

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: "below" | "above";
  threshold: number;
  unit: string;
  severity: "critical" | "warning" | "info";
  channels: string[];
  enabled: boolean;
}

const INIT_RULES: AlertRule[] = [
  { id: "oee-critical",   name: "OEE Below Target",        metric: "OEE %",          condition: "below", threshold: 65, unit: "%",   severity: "critical", channels: ["email", "slack"], enabled: true  },
  { id: "oee-warning",    name: "OEE Warning Zone",         metric: "OEE %",          condition: "below", threshold: 75, unit: "%",   severity: "warning",  channels: ["slack"],          enabled: true  },
  { id: "downtime-long",  name: "Unplanned Downtime > 60m", metric: "Downtime",       condition: "above", threshold: 60, unit: "min", severity: "critical", channels: ["email", "slack"], enabled: true  },
  { id: "quality-fail",   name: "Quality Rate Drop",        metric: "Quality %",      condition: "below", threshold: 95, unit: "%",   severity: "warning",  channels: ["email"],          enabled: true  },
  { id: "avail-low",      name: "Availability Drop",        metric: "Availability %", condition: "below", threshold: 80, unit: "%",   severity: "warning",  channels: ["slack"],          enabled: false },
  { id: "cycle-high",     name: "Cycle Time Exceeded",      metric: "Cycle Time",     condition: "above", threshold: 120, unit: "s", severity: "info",     channels: ["slack"],          enabled: false },
];

const SEV_STYLE: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  warning:  "bg-orange-100 text-orange-700",
  info:     "bg-blue-100 text-blue-700",
};

const CH_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  email: Mail,
  slack: MessageSquare,
  webhook: Bell,
};

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>(INIT_RULES);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const toggle = (id: string) =>
    setRules((r) => r.map((rule) => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule));

  const setThreshold = (id: string, val: string) =>
    setRules((r) => r.map((rule) => rule.id === id ? { ...rule, threshold: parseFloat(val) || 0 } : rule));

  const toggleChannel = (id: string, ch: string) =>
    setRules((r) => r.map((rule) =>
      rule.id === id
        ? { ...rule, channels: rule.channels.includes(ch) ? rule.channels.filter((c) => c !== ch) : [...rule.channels, ch] }
        : rule
    ));

  const handleSave = async (id: string) => {
    setSaving(id);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(null);
    setSaved(id);
    setTimeout(() => setSaved(null), 2000);
  };

  return (
    <div className="space-y-6">
      <InsightBanner
        variant="warning"
        title="Alert rules need notification channels to deliver"
        message="Enabling an alert rule without a configured notification channel means no one gets notified. Set up email, Slack, or webhook destinations first so alerts actually reach your team."
        actionLabel="Configure Notification Channels"
        actionHref="/admin/notifications"
        dismissible
      />

      <div>
        <h1 className="text-xl font-bold text-[#001C2E] font-mono tracking-tight flex items-center gap-2">
          <AlertTriangle size={20} className="text-[#F05230]" />
          Alert Thresholds
        </h1>
        <p className="text-sm text-[#6A8A9A] mt-1">
          Configure alert rules for OEE, downtime, quality and performance metrics.
        </p>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={cn(
              "p-5 rounded-xl border bg-white transition-all",
              rule.enabled ? "border-[#E8E4DF]" : "border-[#E8E4DF] opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggle(rule.id)}
                  className={cn(
                    "relative w-10 h-5 rounded-full transition-colors shrink-0",
                    rule.enabled ? "bg-[#F05230]" : "bg-[#E8E4DF]"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                    rule.enabled ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#001C2E]">{rule.name}</span>
                    <span className={cn("px-1.5 py-0.5 rounded text-2xs font-mono capitalize", SEV_STYLE[rule.severity])}>
                      {rule.severity}
                    </span>
                  </div>
                  <span className="text-xs text-[#6A8A9A]">{rule.metric} {rule.condition} threshold</span>
                </div>
              </div>
              <button
                onClick={() => handleSave(rule.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#001C2E] text-white text-xs font-semibold hover:bg-[#002d47] transition-colors"
              >
                {saving === rule.id ? <RefreshCw size={12} className="animate-spin" /> :
                 saved === rule.id  ? <CheckCircle2 size={12} className="text-green-400" /> :
                                     <Save size={12} />}
                {saved === rule.id ? "Saved!" : "Save"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-[#001C2E] mb-2">
                  Threshold ({rule.unit}) — trigger when {rule.condition}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={rule.unit === "%" ? 100 : 300}
                    value={rule.threshold}
                    onChange={(e) => setThreshold(rule.id, e.target.value)}
                    className="flex-1 accent-[#F05230]"
                  />
                  <input
                    type="number"
                    value={rule.threshold}
                    onChange={(e) => setThreshold(rule.id, e.target.value)}
                    className="w-20 px-2 py-1 rounded-lg border border-[#E8E4DF] text-sm text-center font-mono text-[#001C2E] focus:outline-none focus:ring-2 focus:ring-[#F05230]/20 focus:border-[#F05230]"
                  />
                  <span className="text-xs text-[#6A8A9A] w-6">{rule.unit}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#001C2E] mb-2">Notify via</label>
                <div className="flex gap-2 flex-wrap">
                  {["email", "slack", "webhook"].map((ch) => {
                    const Icon = CH_ICON[ch];
                    const on = rule.channels.includes(ch);
                    return (
                      <button
                        key={ch}
                        onClick={() => toggleChannel(rule.id, ch)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all",
                          on
                            ? "border-[#F05230] bg-[#FEF0EB]/40 text-[#F05230]"
                            : "border-[#E8E4DF] text-[#6A8A9A] hover:border-[#F05230]/40"
                        )}
                      >
                        <Icon size={12} />
                        {ch}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setRules((r) => [...r, {
          id: `custom-${Date.now()}`,
          name: "New Alert Rule",
          metric: "OEE %",
          condition: "below",
          threshold: 80,
          unit: "%",
          severity: "warning",
          channels: [],
          enabled: true,
        }])}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[#E8E4DF] text-sm text-[#6A8A9A] hover:border-[#F05230] hover:text-[#F05230] hover:bg-[#FEF0EB]/20 transition-all"
      >
        + Add Alert Rule
      </button>
    </div>
  );
}
