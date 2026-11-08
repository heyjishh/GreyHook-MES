"use client";

import { useState } from "react";
import { Settings2, Save, RefreshCw, CheckCircle2, AlertTriangle, FlaskConical, Bug, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlagGroup {
  section: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  flags: Flag[];
}

interface Flag {
  id: string;
  label: string;
  desc: string;
  value: boolean;
  danger?: boolean;
}

const INIT_GROUPS: FlagGroup[] = [
  {
    section: "Experimental Features",
    icon: FlaskConical,
    flags: [
      { id: "ai_autoinvestigate", label: "Auto AI Investigation",    desc: "Automatically trigger AI fault analysis on Critical downtime events without manual initiation.", value: false },
      { id: "predictive_maint",   label: "Predictive Maintenance",   desc: "Enable ML-based remaining useful life (RUL) estimation for connected machines.", value: false },
      { id: "digital_twin",       label: "Digital Twin Sync",        desc: "Mirror live machine states into a 3D digital twin model (beta, high compute cost).", value: false },
      { id: "copilot_chat",       label: "Copilot Chat",             desc: "Allow floor operators to query the AI assistant directly from their shift terminal.", value: true  },
    ],
  },
  {
    section: "Debug & Telemetry",
    icon: Bug,
    flags: [
      { id: "verbose_logging",    label: "Verbose API Logging",      desc: "Log full request/response payloads for all API calls to the diagnostics store.", value: false, danger: true },
      { id: "debug_panel",        label: "Debug Panel",              desc: "Show the floating debug overlay in the production dashboard (visible to all users).", value: false },
      { id: "perf_markers",       label: "Performance Markers",      desc: "Inject browser Performance API marks into every page transition for profiling.", value: false },
      { id: "telemetry_opt_out",  label: "Opt out of Telemetry",     desc: "Stop sending anonymous usage statistics to GreyHook for product improvement.", value: false },
    ],
  },
  {
    section: "Platform Behaviour",
    icon: Activity,
    flags: [
      { id: "strict_tenant",      label: "Strict Tenant Isolation",  desc: "Fail fast (HTTP 403) on any cross-org query attempt, even if the row is empty.", value: true  },
      { id: "read_only_mode",     label: "Read-Only Mode",           desc: "Prevent all write operations across the platform (useful during audits).", value: false, danger: true },
      { id: "maintenance_banner", label: "Maintenance Banner",       desc: "Display a system-wide maintenance notice to all users on login.", value: false },
      { id: "cache_bypass",       label: "Bypass Redis Cache",       desc: "Disable Valkey cache layer and hit PostgreSQL directly on every request.", value: false, danger: true },
    ],
  },
];

export default function AdvancedPage() {
  const [groups, setGroups] = useState<FlagGroup[]>(INIT_GROUPS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (section: string, id: string) =>
    setGroups((g) =>
      g.map((gr) =>
        gr.section === section
          ? { ...gr, flags: gr.flags.map((f) => f.id === id ? { ...f, value: !f.value } : f) }
          : gr
      )
    );

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[#001C2E] font-mono tracking-tight flex items-center gap-2">
          <Settings2 size={20} className="text-[#F05230]" />
          Advanced Settings
        </h1>
        <p className="text-sm text-[#6A8A9A] mt-1">Feature flags, experimental capabilities, and platform-level controls.</p>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl border border-orange-200 bg-orange-50">
        <AlertTriangle size={15} className="text-orange-600 shrink-0 mt-0.5" />
        <p className="text-xs text-orange-700 leading-relaxed">
          Settings marked <span className="font-semibold text-red-600">Danger</span> can interrupt production operations or expose sensitive data.
          Changes take effect immediately after saving. Only modify if you understand the impact.
        </p>
      </div>

      {groups.map((group) => {
        const Icon = group.icon;
        return (
          <div key={group.section}>
            <div className="flex items-center gap-2 mb-3">
              <Icon size={14} className="text-[#F05230]" />
              <h2 className="text-xs font-mono font-bold text-[#001C2E] uppercase tracking-widest">{group.section}</h2>
            </div>
            <div className="space-y-2">
              {group.flags.map((flag) => (
                <div
                  key={flag.id}
                  className={cn(
                    "flex items-start justify-between gap-4 p-4 rounded-xl border bg-white transition-all",
                    flag.value && flag.danger ? "border-red-200 bg-red-50/30" : "border-[#E8E4DF]"
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-[#001C2E]">{flag.label}</span>
                      {flag.danger && (
                        <span className="px-1.5 py-0.5 rounded text-2xs font-mono bg-red-100 text-red-600">Danger</span>
                      )}
                    </div>
                    <p className="text-xs text-[#6A8A9A] leading-relaxed">{flag.desc}</p>
                  </div>
                  <button
                    onClick={() => toggle(group.section, flag.id)}
                    className={cn(
                      "relative w-10 h-5 rounded-full transition-colors shrink-0 mt-0.5",
                      flag.value
                        ? flag.danger ? "bg-red-500" : "bg-[#F05230]"
                        : "bg-[#E8E4DF]"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                      flag.value ? "translate-x-5" : "translate-x-0.5"
                    )} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F05230] text-white text-sm font-semibold hover:bg-[#d94720] disabled:opacity-50 transition-colors"
      >
        {saving ? <RefreshCw size={14} className="animate-spin" /> :
         saved  ? <CheckCircle2 size={14} /> : <Save size={14} />}
        {saved ? "Saved!" : "Save Advanced Settings"}
      </button>
    </div>
  );
}
