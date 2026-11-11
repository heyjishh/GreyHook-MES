"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Building2, Factory, GitBranch, LayoutList, Sparkles,
  Cpu, Clock, Users, Lock, Shield, Cable, Bell, KeyRound,
  Target, AlertTriangle, Settings2, ChevronRight, Zap,
  Database, Globe, CheckCircle2, Circle, TrendingUp,
  PlugZap, ArrowRight, RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useModulesStore } from "@/store/modules";
import { cn } from "@/lib/utils";

interface ConfigHealth {
  plants: number;
  lines: number;
  machines: number;
  shifts: number;
  users: number;
  alertRules: number;
  erpConnected: boolean;
  loading: boolean;
}

interface Recommendation {
  id: string;
  title: string;
  why: string;
  href: string;
  priority: "critical" | "important" | "suggested";
  isDone: boolean;
}

const PRIORITY_ORDER = { critical: 0, important: 1, suggested: 2 };

const PRIORITY_BADGE: Record<string, string> = {
  critical:  "bg-red-100 text-red-700",
  important: "bg-amber-100 text-amber-700",
  suggested: "bg-sky-100 text-sky-700",
};

const SECTIONS = [
  {
    id: "setup",
    label: "Set up your factory",
    desc: "Configure your organisation, plants, production lines, and choose MES modules.",
    icon: Sparkles,
    color: "bg-violet-50 border-violet-200",
    iconColor: "text-violet-600 bg-violet-100",
    items: [
      { href: "/admin/setup",    icon: Sparkles,  label: "Setup Wizard",     desc: "Run the 3-step onboarding wizard" },
      { href: "/admin/business", icon: Building2, label: "Business",         desc: "Company name, industry, tenant profile" },
      { href: "/admin/plants",   icon: Factory,   label: "Plants",           desc: "Factory sites, locations, timezones" },
      { href: "/admin/lines",    icon: GitBranch, label: "Production Lines", desc: "Lines and work centres per plant" },
      { href: "/admin/modules",  icon: LayoutList,label: "Module Catalog",   desc: "Enable or disable MES capability modules" },
    ],
  },
  {
    id: "operations",
    label: "Configure operations",
    desc: "Register machines, set shift schedules, define OEE targets and configure alerts.",
    icon: Zap,
    color: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-600 bg-amber-100",
    items: [
      { href: "/admin/machines",    icon: Cpu,          label: "Machines",    desc: "Register machines, assign to lines" },
      { href: "/admin/shifts",      icon: Clock,        label: "Shifts",      desc: "Schedules, break times, overlap rules" },
      { href: "/admin/oee-targets", icon: Target,       label: "OEE Targets", desc: "Availability, performance, quality targets" },
      { href: "/admin/alerts",      icon: AlertTriangle,label: "Alert Rules", desc: "Thresholds and notification routing" },
    ],
  },
  {
    id: "access",
    label: "Manage people & access",
    desc: "Invite your team, define roles, and configure authentication policies.",
    icon: Lock,
    color: "bg-emerald-50 border-emerald-200",
    iconColor: "text-emerald-700 bg-emerald-100",
    items: [
      { href: "/admin/users",    icon: Users,  label: "Users",         desc: "Invite team members, deactivate accounts" },
      { href: "/admin/rbac",     icon: Lock,   label: "Roles & Perms", desc: "Role definitions and permission sets" },
      { href: "/admin/security", icon: Shield, label: "Security",      desc: "MFA, session, password policy, SSO" },
    ],
  },
  {
    id: "integrations",
    label: "Connect your systems",
    desc: "Hook up SAP S/4HANA, Oracle Cloud, configure notifications, and generate API keys.",
    icon: Cable,
    color: "bg-sky-50 border-sky-200",
    iconColor: "text-sky-700 bg-sky-100",
    items: [
      { href: "/admin/erp-connectors", icon: Cable,    label: "ERP Connectors", desc: "SAP PP/MM/QM/PM/SD + Oracle Cloud" },
      { href: "/admin/notifications",  icon: Bell,     label: "Notifications",  desc: "Email, Slack, webhook alert channels" },
      { href: "/admin/api-keys",       icon: KeyRound, label: "API Keys",       desc: "Scoped keys for external integrations" },
    ],
  },
  {
    id: "platform",
    label: "Platform settings",
    desc: "Data retention, regional preferences, feature flags, advanced controls.",
    icon: Settings2,
    color: "bg-slate-50 border-slate-200",
    iconColor: "text-slate-600 bg-slate-100",
    items: [
      { href: "/admin/data-retention", icon: Database,  label: "Data Retention", desc: "Retention for telemetry, logs, reports" },
      { href: "/admin/localization",   icon: Globe,     label: "Localisation",   desc: "Language, date format, units, currency" },
      { href: "/admin/advanced",       icon: Settings2, label: "Advanced",       desc: "Feature flags, debug, experimental" },
    ],
  },
];

function buildRecommendations(h: ConfigHealth, enabledCount: number, catalogLen: number): Recommendation[] {
  return [
    {
      id: "plants",
      title: "Add at least one plant",
      why: "Every machine, line, shift, and OEE target must belong to a plant. Without one nothing else can be configured.",
      href: "/admin/plants",
      priority: "critical",
      isDone: h.plants > 0,
    },
    {
      id: "lines",
      title: "Create production lines",
      why: "Machines are assigned to lines. OEE is calculated per line. Without lines your machines are unorganised.",
      href: "/admin/lines",
      priority: "critical",
      isDone: h.lines > 0,
    },
    {
      id: "machines",
      title: "Register your machines",
      why: "No machines means no telemetry, no OEE data, and no production visibility.",
      href: "/admin/machines",
      priority: "critical",
      isDone: h.machines > 0,
    },
    {
      id: "shifts",
      title: "Set up shift schedules",
      why: "OEE Availability is calculated against planned production time (shifts). Without shifts, your OEE will be meaningless.",
      href: "/admin/shifts",
      priority: "critical",
      isDone: h.shifts > 0,
    },
    {
      id: "alerts",
      title: "Configure alert thresholds",
      why: "Without alert rules your team won't be notified when OEE drops or machines go down.",
      href: "/admin/alerts",
      priority: "important",
      isDone: h.alertRules > 0,
    },
    {
      id: "users",
      title: "Invite your team",
      why: "Add operators, supervisors, and quality managers so the right people get the right data.",
      href: "/admin/users",
      priority: "important",
      isDone: h.users > 1,
    },
    {
      id: "modules",
      title: "Review enabled modules",
      why: "You have access to 43 MES modules. Apply an industry template to activate the right set for your factory.",
      href: "/admin/modules",
      priority: "important",
      isDone: enabledCount > 5 || catalogLen === 0,
    },
    {
      id: "erp",
      title: "Connect an ERP system",
      why: "Sync production orders and BOM from SAP S/4HANA or Oracle Cloud to eliminate manual data entry.",
      href: "/admin/erp-connectors",
      priority: "suggested",
      isDone: h.erpConnected,
    },
    {
      id: "notifications",
      title: "Set up notification channels",
      why: "Configure email, Slack or webhooks so alert rules can actually reach your team.",
      href: "/admin/notifications",
      priority: "suggested",
      isDone: false,
    },
    {
      id: "plugins",
      title: "Configure per-plant plugins",
      why: "Each plant can have its own active module set. Install only what that plant needs.",
      href: "/admin/plants",
      priority: "suggested",
      isDone: h.plants === 0,
    },
  ];
}

function healthScore(h: ConfigHealth, enabledCount: number): number {
  let score = 0;
  if (h.plants > 0)       score += 20;
  if (h.machines > 0)     score += 20;
  if (h.shifts > 0)       score += 20;
  if (h.users > 1)        score += 10;
  if (h.erpConnected)     score += 10;
  if (enabledCount > 5)   score += 10;
  if (h.alertRules > 0)   score += 10;
  return score;
}

function HealthBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-[#1A7A40]" : score >= 50 ? "bg-amber-500" : "bg-[#F05230]";
  const label = score >= 80 ? "Great shape" : score >= 50 ? "Needs attention" : "Just getting started";
  return (
    <div className="p-5 rounded-2xl border border-[#E8E4DF] bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className={score >= 80 ? "text-[#1A7A40]" : score >= 50 ? "text-amber-500" : "text-[#F05230]"} />
          <span className="text-sm font-bold text-[#001C2E]">Configuration health</span>
        </div>
        <span className={cn(
          "text-xs font-mono font-bold px-2 py-0.5 rounded-full",
          score >= 80 ? "bg-[#1A7A40]/10 text-[#1A7A40]" :
          score >= 50 ? "bg-amber-100 text-amber-700" :
                        "bg-[#F05230]/10 text-[#F05230]"
        )}>
          {score}% · {label}
        </span>
      </div>
      <div className="w-full h-2 bg-[#E8E4DF] rounded-full overflow-hidden">
        <div
          className={cn("h-2 rounded-full transition-all duration-700", color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-[#6A8A9A] mt-2">
        Complete the recommended steps below to improve your score and unlock full platform capability.
      </p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { enabledIds, catalog } = useModulesStore();

  const firstName = ((user as { name?: string; email?: string })?.name ?? (user as { email?: string })?.email ?? "there").split(" ")[0];

  const enabledCount = enabledIds
    ? [...enabledIds].filter((id) => catalog.some((m) => m.id === id)).length
    : catalog.length;

  const [health, setHealth] = useState<ConfigHealth>({
    plants: 0, lines: 0, machines: 0, shifts: 0, users: 0,
    alertRules: 0, erpConnected: false, loading: true,
  });

  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => {
    const fetchAll = async () => {
      const safe = async (url: string) => {
        try { const r = await fetch(url, { headers }); return r.ok ? r.json() : null; }
        catch { return null; }
      };
      const [plants, machines, shifts, users] = await Promise.all([
        safe(`${base}/factories`),
        safe(`${base}/machines`),
        safe(`${base}/shifts`),
        safe(`${base}/users`),
      ]);
      setHealth({
        plants:       Array.isArray(plants)   ? plants.length   : 0,
        lines:        0,
        machines:     Array.isArray(machines) ? machines.length : 0,
        shifts:       Array.isArray(shifts)   ? shifts.length   : 0,
        users:        Array.isArray(users)    ? users.length    : 0,
        alertRules:   0,
        erpConnected: false,
        loading:      false,
      });
    };
    fetchAll();
  }, []);

  const recs = buildRecommendations(health, enabledCount, catalog.length)
    .filter((r) => !r.isDone)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  const score = health.loading ? 0 : healthScore(health, enabledCount);

  return (
    <div className="max-w-4xl mx-auto space-y-10">

      {/* Welcome */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-[#001C2E] tracking-tight mb-1">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-sm text-[#6A8A9A]">
          Your admin control panel. Configure your factory, manage your team, and connect your systems.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Modules enabled", value: health.loading ? "…" : `${enabledCount || "—"}`, sub: `of ${catalog.length || 43}` },
          { label: "Active users",    value: health.loading ? "…" : `${health.users || "—"}`, sub: "in your org" },
          { label: "Plants",          value: health.loading ? "…" : `${health.plants || "—"}`, sub: "configured" },
          { label: "Machines",        value: health.loading ? "…" : `${health.machines || "—"}`, sub: "registered" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="p-4 rounded-2xl border border-[#E8E4DF] bg-white">
            <div className="text-2xl font-bold font-mono text-[#001C2E] leading-none mb-1">{value}</div>
            <div className="text-xs font-medium text-[#001C2E]">{label}</div>
            <div className="text-2xs text-[#6A8A9A] mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Health score */}
      {!health.loading && <HealthBar score={score} />}

      {/* Smart Recommendations */}
      {recs.length > 0 && (
        <div className="rounded-2xl border border-[#E8E4DF] bg-white overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4DF]">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-[#F05230]" />
              <span className="text-sm font-bold text-[#001C2E]">Recommended next steps</span>
            </div>
            <span className="text-xs text-[#6A8A9A] font-mono bg-[#F5F4F1] px-2.5 py-1 rounded-full">
              {recs.length} open
            </span>
          </div>
          <div className="divide-y divide-[#E8E4DF]">
            {recs.slice(0, 6).map((rec) => (
              <Link
                key={rec.id}
                href={rec.href}
                className="group flex items-start gap-4 px-6 py-4 hover:bg-[#FAFAF8] transition-colors"
              >
                <div className="mt-0.5 shrink-0">
                  <span className={cn(
                    "inline-block px-2 py-0.5 rounded text-2xs font-mono uppercase tracking-wider",
                    PRIORITY_BADGE[rec.priority]
                  )}>
                    {rec.priority}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#001C2E] group-hover:text-[#F05230] transition-colors">
                    {rec.title}
                  </div>
                  <div className="text-xs text-[#6A8A9A] mt-0.5 leading-relaxed">{rec.why}</div>
                </div>
                <ChevronRight size={15} className="shrink-0 mt-1 text-[#D0CCC8] group-hover:text-[#F05230] transition-colors" />
              </Link>
            ))}
          </div>
          {recs.length > 6 && (
            <div className="px-6 py-3 border-t border-[#E8E4DF] text-xs text-[#6A8A9A]">
              +{recs.length - 6} more items remaining
            </div>
          )}
        </div>
      )}

      {/* All done state */}
      {!health.loading && recs.length === 0 && (
        <div className="p-6 rounded-2xl border border-[#1A7A40]/30 bg-[#E8F5EC] flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#1A7A40]/15 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} className="text-[#1A7A40]" />
          </div>
          <div>
            <div className="font-bold text-sm text-[#1A7A40]">Your factory is fully configured</div>
            <p className="text-xs text-[#1A7A40]/80 mt-0.5">All recommended steps are complete. Keep monitoring your OEE and responding to alerts.</p>
          </div>
        </div>
      )}

      {/* Plugin quick-access */}
      {health.plants > 0 && (
        <div className="p-5 rounded-2xl border border-[#E8E4DF] bg-white">
          <div className="flex items-center gap-2 mb-3">
            <PlugZap size={15} className="text-[#F05230]" />
            <span className="text-sm font-bold text-[#001C2E]">Per-plant plugin configuration</span>
          </div>
          <p className="text-xs text-[#6A8A9A] mb-4">
            Each plant can have its own active module set. Configure plugins independently per facility.
          </p>
          <Link
            href="/admin/plants"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F05230] text-white text-xs font-semibold hover:bg-[#d94720] transition-colors"
          >
            <Factory size={13} />
            Manage Plants & Plugins
            <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-6">
        {SECTIONS.map((section) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.id} className={cn("rounded-2xl border p-6", section.color)}>
              <div className="flex items-start gap-4 mb-5">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", section.iconColor)}>
                  <SectionIcon size={17} />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-[#001C2E]">{section.label}</h2>
                  <p className="text-xs text-[#6A8A9A] mt-0.5 leading-relaxed">{section.desc}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-white border border-transparent hover:border-[#E8E4DF] hover:shadow-sm transition-all"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#F5F4F1] flex items-center justify-center shrink-0 group-hover:bg-white transition-colors">
                        <Icon size={13} className="text-[#6A8A9A] group-hover:text-[#F05230] transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#001C2E] group-hover:text-[#F05230] transition-colors">{item.label}</div>
                        <div className="text-2xs text-[#6A8A9A] truncate">{item.desc}</div>
                      </div>
                      <ChevronRight size={12} className="text-[#D0CCC8] group-hover:text-[#F05230] shrink-0 transition-colors" />
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
