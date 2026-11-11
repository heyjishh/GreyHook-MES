"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Save, RefreshCw, CheckCircle2, Bell, Mail, MessageSquare, Plus, X } from "lucide-react";
import { InsightBanner } from "@/components/admin/InsightBanner";
import { cn } from "@/lib/utils";
import { alertRulesApi, type AlertRuleSchema } from "@/lib/api";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

interface LocalRule {
  id: string;
  name: string;
  metric: string;
  condition: "below" | "above";
  threshold: number;
  unit: string;
  severity: "critical" | "warning" | "info";
  channels: string[];
  enabled: boolean;
  eventType: string;
  channelType: string;
}

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

function deriveDisplayFields(eventType: string): { metric: string; condition: "below" | "above"; severity: "critical" | "warning" | "info"; unit: string } {
  const map: Record<string, { metric: string; condition: "below" | "above"; severity: "critical" | "warning" | "info"; unit: string }> = {
    oee_below_target:          { metric: "OEE %",          condition: "below", severity: "critical", unit: "%" },
    oee_warning:               { metric: "OEE %",          condition: "below", severity: "warning",  unit: "%" },
    machine_fault:             { metric: "Machine Fault",  condition: "above", severity: "critical", unit: "events" },
    downtime_above_threshold:  { metric: "Downtime",       condition: "above", severity: "critical", unit: "min" },
    quality_below_threshold:   { metric: "Quality %",      condition: "below", severity: "warning",  unit: "%" },
    availability_below:        { metric: "Availability %", condition: "below", severity: "warning",  unit: "%" },
    cycle_time_exceeded:       { metric: "Cycle Time",     condition: "above", severity: "info",     unit: "s" },
  };
  return map[eventType] ?? { metric: eventType, condition: "below", severity: "info", unit: "%" };
}

function apiToLocal(rule: AlertRuleSchema): LocalRule {
  const display = deriveDisplayFields(rule.event_type);
  return {
    id: rule.id,
    name: rule.name,
    metric: display.metric,
    condition: display.condition,
    threshold: rule.threshold ?? 80,
    unit: display.unit,
    severity: display.severity,
    channels: [rule.channel_type],
    enabled: rule.enabled,
    eventType: rule.event_type,
    channelType: rule.channel_type,
  };
}

const MOCK_RULES: LocalRule[] = [
  { id: "oee-critical",  name: "OEE Below Target",        metric: "OEE %",          condition: "below", threshold: 65,  unit: "%",   severity: "critical", channels: ["email","slack"], enabled: true,  eventType: "oee_below_target", channelType: "email" },
  { id: "oee-warning",   name: "OEE Warning Zone",         metric: "OEE %",          condition: "below", threshold: 75,  unit: "%",   severity: "warning",  channels: ["slack"],         enabled: true,  eventType: "oee_warning",      channelType: "slack" },
  { id: "downtime-long", name: "Unplanned Downtime > 60m", metric: "Downtime",       condition: "above", threshold: 60,  unit: "min", severity: "critical", channels: ["email","slack"], enabled: true,  eventType: "downtime_above_threshold", channelType: "email" },
  { id: "quality-fail",  name: "Quality Rate Drop",        metric: "Quality %",      condition: "below", threshold: 95,  unit: "%",   severity: "warning",  channels: ["email"],         enabled: true,  eventType: "quality_below_threshold",  channelType: "email" },
  { id: "avail-low",     name: "Availability Drop",        metric: "Availability %", condition: "below", threshold: 80,  unit: "%",   severity: "warning",  channels: ["slack"],         enabled: false, eventType: "availability_below",        channelType: "slack" },
  { id: "cycle-high",    name: "Cycle Time Exceeded",      metric: "Cycle Time",     condition: "above", threshold: 120, unit: "s",   severity: "info",     channels: ["slack"],         enabled: false, eventType: "cycle_time_exceeded",       channelType: "slack" },
];

export default function AlertsPage() {
  const [rules, setRules]     = useState<LocalRule[]>(IS_MOCK ? MOCK_RULES : []);
  const [loading, setLoading] = useState(!IS_MOCK);
  const [saving, setSaving]   = useState<string | null>(null);
  const [saved,  setSaved]    = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName]   = useState("");
  const [newEvent, setNewEvent] = useState("oee_below_target");
  const [newChannel, setNewChannel] = useState("email");
  const [newThreshold, setNewThreshold] = useState(80);

  useEffect(() => {
    if (IS_MOCK) return;
    setLoading(true);
    alertRulesApi.list().then((data) => {
      setRules(data.map(apiToLocal));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggle = async (id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (!rule) return;
    setRules((r) => r.map((x) => x.id === id ? { ...x, enabled: !x.enabled } : x));
    if (!IS_MOCK) {
      try {
        await alertRulesApi.update(id, { enabled: !rule.enabled });
      } catch {
        setRules((r) => r.map((x) => x.id === id ? { ...x, enabled: rule.enabled } : x));
      }
    }
  };

  const setThreshold = (id: string, val: string) =>
    setRules((r) => r.map((rule) => rule.id === id ? { ...rule, threshold: parseFloat(val) || 0 } : rule));

  const handleSave = async (id: string) => {
    setSaving(id);
    const rule = rules.find((r) => r.id === id);
    if (!IS_MOCK && rule) {
      try {
        await alertRulesApi.update(id, { threshold: rule.threshold, enabled: rule.enabled });
      } catch {}
    }
    setSaving(null);
    setSaved(id);
    setTimeout(() => setSaved(null), 2000);
  };

  const handleDelete = async (id: string) => {
    setRules((r) => r.filter((x) => x.id !== id));
    if (!IS_MOCK) {
      try { await alertRulesApi.delete(id); } catch {}
    }
  };

  const handleCreate = async () => {
    if (!newName) return;
    const display = deriveDisplayFields(newEvent);
    if (IS_MOCK) {
      setRules((r) => [...r, {
        id: `custom-${Date.now()}`,
        name: newName, metric: display.metric, condition: display.condition,
        threshold: newThreshold, unit: display.unit, severity: display.severity,
        channels: [newChannel], enabled: true, eventType: newEvent, channelType: newChannel,
      }]);
    } else {
      try {
        const created = await alertRulesApi.create({
          name: newName, event_type: newEvent, threshold: newThreshold,
          channel_type: newChannel, channel_config: {},
        });
        setRules((r) => [...r, apiToLocal(created)]);
      } catch {}
    }
    setCreating(false);
    setNewName(""); setNewEvent("oee_below_target"); setNewChannel("email"); setNewThreshold(80);
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

      {loading ? (
        <div className="text-center font-mono text-xs text-[#6A8A9A] py-8">Loading alert rules…</div>
      ) : (
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSave(rule.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#001C2E] text-white text-xs font-semibold hover:bg-[#002d47] transition-colors"
                  >
                    {saving === rule.id ? <RefreshCw size={12} className="animate-spin" /> :
                     saved === rule.id  ? <CheckCircle2 size={12} className="text-green-400" /> :
                                         <Save size={12} />}
                    {saved === rule.id ? "Saved!" : "Save"}
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="text-[#B0C4CE] hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
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
                          onClick={() => {
                            setRules((r) => r.map((x) =>
                              x.id === rule.id
                                ? { ...x, channels: on ? x.channels.filter((c) => c !== ch) : [...x.channels, ch] }
                                : x
                            ));
                          }}
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
      )}

      {creating ? (
        <div className="p-5 rounded-xl border border-dashed border-[#F05230] bg-[#FEF0EB]/20 space-y-4">
          <p className="font-mono text-xs font-bold text-[#001C2E]">New Alert Rule</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#6A8A9A] mb-1">Rule Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. OEE Critical Alert"
                className="w-full border border-[#E8E4DF] rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#F05230]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6A8A9A] mb-1">Event Type</label>
              <select
                value={newEvent}
                onChange={(e) => setNewEvent(e.target.value)}
                className="w-full border border-[#E8E4DF] rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#F05230]"
              >
                {["oee_below_target","oee_warning","machine_fault","downtime_above_threshold","quality_below_threshold","availability_below","cycle_time_exceeded"].map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6A8A9A] mb-1">Threshold</label>
              <input
                type="number"
                value={newThreshold}
                onChange={(e) => setNewThreshold(Number(e.target.value))}
                className="w-full border border-[#E8E4DF] rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#F05230]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6A8A9A] mb-1">Channel</label>
              <select
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                className="w-full border border-[#E8E4DF] rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#F05230]"
              >
                {["email","slack","webhook"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 rounded-lg bg-[#F05230] text-white text-xs font-bold"
            >
              Create Rule
            </button>
            <button
              onClick={() => setCreating(false)}
              className="px-3 py-1.5 rounded-lg border border-[#E8E4DF] text-xs text-[#6A8A9A]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[#E8E4DF] text-sm text-[#6A8A9A] hover:border-[#F05230] hover:text-[#F05230] hover:bg-[#FEF0EB]/20 transition-all"
        >
          <Plus size={14} /> Add Alert Rule
        </button>
      )}
    </div>
  );
}
