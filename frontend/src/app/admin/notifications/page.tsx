"use client";

import { useState, useEffect } from "react";
import { Bell, Mail, MessageSquare, Webhook, Save, RefreshCw, CheckCircle2, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { alertRulesApi, type AlertRuleSchema } from "@/lib/api";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

interface Channel {
  id: string;
  type: "email" | "slack" | "webhook";
  label: string;
  value: string;
  enabled: boolean;
}

const INIT: Channel[] = [
  { id: "email-ops",    type: "email",   label: "Operations Email",   value: "ops@yourfactory.com",           enabled: true  },
  { id: "email-mgmt",  type: "email",   label: "Management Email",   value: "management@yourfactory.com",    enabled: false },
  { id: "slack-alerts",type: "slack",   label: "Slack #mes-alerts",  value: "https://hooks.slack.com/…",     enabled: true  },
  { id: "slack-oee",   type: "slack",   label: "Slack #oee-alerts",  value: "",                              enabled: false },
  { id: "webhook-erp", type: "webhook", label: "ERP Webhook",        value: "https://erp.company.com/hooks", enabled: false },
];

const TYPE_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  email:   Mail,
  slack:   MessageSquare,
  webhook: Bell,
};

const EVENT_OPTIONS = [
  { value: "machine_fault",      label: "Machine Fault (Critical)" },
  { value: "oee_below_target",   label: "OEE Below Target" },
  { value: "downtime_threshold", label: "Downtime Threshold Exceeded" },
  { value: "quality_drop",       label: "Quality Drop" },
  { value: "shift_start",        label: "Shift Start" },
  { value: "shift_end",          label: "Shift End" },
  { value: "sync_complete",      label: "Sync Complete" },
  { value: "erp_error",          label: "ERP Error" },
];

export default function NotificationsPage() {
  const [channels, setChannels] = useState<Channel[]>(INIT);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [showVal, setShowVal] = useState<Record<string, boolean>>({});
  const [rules, setRules] = useState<AlertRuleSchema[]>([]);
  const [addingRule, setAddingRule] = useState(false);
  const [newRule, setNewRule] = useState({ event_type: "machine_fault", channel_type: "email", channel_config_value: "", threshold: "" });
  const [rulesSaving, setRulesSaving] = useState(false);

  useEffect(() => {
    if (!IS_MOCK) alertRulesApi.list().then(setRules).catch(() => {});
  }, []);

  const update = (id: string, patch: Partial<Channel>) =>
    setChannels((c) => c.map((ch) => ch.id === id ? { ...ch, ...patch } : ch));

  const handleSave = async (id: string) => {
    setSaving(id);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(null); setSaved(id);
    setTimeout(() => setSaved(null), 2000);
  };

  const handleAddRule = async () => {
    setRulesSaving(true);
    try {
      const created = IS_MOCK
        ? { id: `mock-${Date.now()}`, organization_id: "mock", name: EVENT_OPTIONS.find(e => e.value === newRule.event_type)?.label ?? newRule.event_type, event_type: newRule.event_type, threshold: newRule.threshold ? parseFloat(newRule.threshold) : null, channel_type: newRule.channel_type, channel_config: { endpoint: newRule.channel_config_value }, enabled: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        : await alertRulesApi.create({
            name: EVENT_OPTIONS.find((e) => e.value === newRule.event_type)?.label ?? newRule.event_type,
            event_type: newRule.event_type,
            threshold: newRule.threshold ? parseFloat(newRule.threshold) : null,
            channel_type: newRule.channel_type,
            channel_config: { endpoint: newRule.channel_config_value },
          });
      setRules((r) => [...r, created]);
      setAddingRule(false);
      setNewRule({ event_type: "machine_fault", channel_type: "email", channel_config_value: "", threshold: "" });
    } finally { setRulesSaving(false); }
  };

  const handleToggleRule = async (rule: AlertRuleSchema) => {
    if (!IS_MOCK) await alertRulesApi.update(rule.id, { enabled: !rule.enabled });
    setRules((r) => r.map((x) => x.id === rule.id ? { ...x, enabled: !x.enabled } : x));
  };

  const handleDeleteRule = async (id: string) => {
    if (!IS_MOCK) await alertRulesApi.delete(id);
    setRules((r) => r.filter((x) => x.id !== id));
  };

  const alertEvents = [
    "Machine Fault (Critical)", "OEE Below Target", "Downtime > 1h",
    "Quality Drop", "Shift Start / End", "Sync Complete", "ERP Error",
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[#001C2E] font-mono tracking-tight flex items-center gap-2">
          <Bell size={20} className="text-[#F05230]" />
          Notifications
        </h1>
        <p className="text-sm text-[#6A8A9A] mt-1">Configure email, Slack and webhook delivery for factory alerts.</p>
      </div>

      {/* Channels */}
      <div>
        <h2 className="text-xs font-mono font-bold text-[#001C2E] uppercase tracking-widest mb-3">Delivery Channels</h2>
        <div className="space-y-3">
          {channels.map((ch) => {
            const Icon = TYPE_ICON[ch.type];
            const show = showVal[ch.id];
            return (
              <div key={ch.id} className="p-5 rounded-xl border border-[#E8E4DF] bg-white">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => update(ch.id, { enabled: !ch.enabled })}
                      className={cn("relative w-10 h-5 rounded-full transition-colors shrink-0", ch.enabled ? "bg-[#F05230]" : "bg-[#E8E4DF]")}
                    >
                      <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", ch.enabled ? "translate-x-5" : "translate-x-0.5")} />
                    </button>
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-[#6A8A9A]" />
                      <span className="font-semibold text-sm text-[#001C2E]">{ch.label}</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-2xs font-mono uppercase",
                        ch.type === "email" ? "bg-blue-100 text-blue-700" :
                        ch.type === "slack" ? "bg-purple-100 text-purple-700" :
                                              "bg-orange-100 text-orange-700"
                      )}>{ch.type}</span>
                    </div>
                  </div>
                  <button onClick={() => handleSave(ch.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#001C2E] text-white text-xs font-semibold hover:bg-[#002d47]">
                    {saving === ch.id ? <RefreshCw size={12} className="animate-spin" /> :
                     saved === ch.id  ? <CheckCircle2 size={12} className="text-green-400" /> :
                                       <Save size={12} />}
                    {saved === ch.id ? "Saved!" : "Save"}
                  </button>
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-[#001C2E] mb-1.5">
                    {ch.type === "email" ? "Email address" : ch.type === "slack" ? "Webhook URL" : "Endpoint URL"}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={show ? "text" : "password"}
                      value={ch.value}
                      onChange={(e) => update(ch.id, { value: e.target.value })}
                      placeholder={ch.type === "email" ? "alerts@company.com" : "https://…"}
                      className="flex-1 px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm text-[#001C2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#F05230]/20 focus:border-[#F05230]"
                    />
                    {ch.type !== "email" && (
                      <button onClick={() => setShowVal((s) => ({ ...s, [ch.id]: !s[ch.id] }))} className="px-2 rounded-lg border border-[#E8E4DF] text-[#6A8A9A] hover:text-[#001C2E]">
                        {show ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event routing */}
      <div>
        <h2 className="text-xs font-mono font-bold text-[#001C2E] uppercase tracking-widest mb-3">Event Routing</h2>
        <div className="rounded-xl border border-[#E8E4DF] bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAF8] border-b border-[#E8E4DF]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6A8A9A] font-mono">Event</th>
                {["Email", "Slack", "Webhook"].map((h) => (
                  <th key={h} className="px-4 py-3 text-center text-xs font-semibold text-[#6A8A9A] font-mono">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DF]">
              {alertEvents.map((ev) => (
                <tr key={ev} className="hover:bg-[#FAFAF8]">
                  <td className="px-4 py-3 text-sm text-[#001C2E]">{ev}</td>
                  {["email", "slack", "webhook"].map((type) => (
                    <td key={type} className="px-4 py-3 text-center">
                      <input type="checkbox" defaultChecked={type !== "webhook"} className="accent-[#F05230] w-4 h-4" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F05230] text-white text-sm font-semibold hover:bg-[#d94720]">
        <Save size={14} /> Save Event Routing
      </button>

      {/* Alert Rules */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-mono font-bold text-[#001C2E] uppercase tracking-widest">Alert Rules</h2>
          <button
            onClick={() => setAddingRule(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F05230] text-white text-xs font-semibold hover:bg-[#d94720]"
          >
            <Plus size={12} /> Add Rule
          </button>
        </div>

        {addingRule && (
          <div className="mb-4 p-4 rounded-xl border border-[#F05230]/30 bg-[#FEF0EB] space-y-3">
            <p className="text-xs font-semibold text-[#001C2E]">New Alert Rule</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#6A8A9A] block mb-1">Event</label>
                <select value={newRule.event_type} onChange={(e) => setNewRule((r) => ({ ...r, event_type: e.target.value }))}
                  className="w-full text-sm rounded-lg border border-[#E8E4DF] px-3 py-2 bg-white text-[#001C2E] focus:outline-none">
                  {EVENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#6A8A9A] block mb-1">Threshold (optional)</label>
                <input type="number" value={newRule.threshold} onChange={(e) => setNewRule((r) => ({ ...r, threshold: e.target.value }))}
                  placeholder="e.g. 75 for OEE < 75%"
                  className="w-full text-sm rounded-lg border border-[#E8E4DF] px-3 py-2 bg-white text-[#001C2E] focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-[#6A8A9A] block mb-1">Channel</label>
                <select value={newRule.channel_type} onChange={(e) => setNewRule((r) => ({ ...r, channel_type: e.target.value }))}
                  className="w-full text-sm rounded-lg border border-[#E8E4DF] px-3 py-2 bg-white text-[#001C2E] focus:outline-none">
                  <option value="email">Email</option>
                  <option value="slack">Slack Webhook</option>
                  <option value="webhook">Webhook</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#6A8A9A] block mb-1">Endpoint / Address</label>
                <input value={newRule.channel_config_value} onChange={(e) => setNewRule((r) => ({ ...r, channel_config_value: e.target.value }))}
                  placeholder={newRule.channel_type === "email" ? "alerts@factory.com" : "https://…"}
                  className="w-full text-sm rounded-lg border border-[#E8E4DF] px-3 py-2 bg-white text-[#001C2E] focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddRule} disabled={rulesSaving}
                className="px-4 py-2 rounded-lg bg-[#001C2E] text-white text-xs font-semibold disabled:opacity-50">
                {rulesSaving ? "Saving…" : "Save Rule"}
              </button>
              <button onClick={() => setAddingRule(false)}
                className="px-4 py-2 rounded-lg border border-[#E8E4DF] text-xs text-[#6A8A9A]">Cancel</button>
            </div>
          </div>
        )}

        {rules.length === 0 && !addingRule ? (
          <p className="text-sm text-[#6A8A9A] py-4">No alert rules configured yet. Click "Add Rule" to create one.</p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[#E8E4DF] bg-white">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleRule(rule)}
                    className={cn("relative w-9 h-5 rounded-full transition-colors shrink-0", rule.enabled ? "bg-[#F05230]" : "bg-[#E8E4DF]")}
                  >
                    <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", rule.enabled ? "translate-x-4" : "translate-x-0.5")} />
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#001C2E] truncate">{rule.name}</p>
                    <p className="text-xs text-[#6A8A9A]">
                      {rule.channel_type}
                      {rule.threshold != null && ` · threshold ${rule.threshold}`}
                      {rule.channel_config?.endpoint ? ` · ${String(rule.channel_config.endpoint)}` : ""}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDeleteRule(rule.id)} className="text-[#6A8A9A] hover:text-red-600 transition-colors shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
