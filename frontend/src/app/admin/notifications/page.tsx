"use client";

import { useState } from "react";
import { Bell, Mail, MessageSquare, Webhook, Save, RefreshCw, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function NotificationsPage() {
  const [channels, setChannels] = useState<Channel[]>(INIT);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [showVal, setShowVal] = useState<Record<string, boolean>>({});

  const update = (id: string, patch: Partial<Channel>) =>
    setChannels((c) => c.map((ch) => ch.id === id ? { ...ch, ...patch } : ch));

  const handleSave = async (id: string) => {
    setSaving(id);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(null); setSaved(id);
    setTimeout(() => setSaved(null), 2000);
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
    </div>
  );
}
