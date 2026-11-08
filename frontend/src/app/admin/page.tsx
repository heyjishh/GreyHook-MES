"use client";

import Link from "next/link";
import {
  Building2, Factory, GitBranch, LayoutList, Sparkles,
  Cpu, Clock, Users, Lock, Shield, Cable, Bell, KeyRound,
  Target, AlertTriangle, Settings2, ChevronRight, Zap,
  Database, Globe, CheckCircle2, Circle,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useModulesStore } from "@/store/modules";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    id: "setup",
    label: "Set up your factory",
    desc: "Start here — configure your organisation, plants, production lines, and choose which MES modules to enable.",
    icon: Sparkles,
    color: "bg-violet-50 border-violet-200",
    iconColor: "text-violet-600 bg-violet-100",
    items: [
      { href: "/admin/setup",    icon: Sparkles,  label: "Setup Wizard",    desc: "Run the 3-step onboarding wizard to pick your industry template" },
      { href: "/admin/business", icon: Building2, label: "Business",        desc: "Company name, industry type and tenant profile" },
      { href: "/admin/plants",   icon: Factory,   label: "Plants",          desc: "Factory sites, locations and time zones" },
      { href: "/admin/lines",    icon: GitBranch, label: "Production Lines", desc: "Lines and work centres under each plant" },
      { href: "/admin/modules",  icon: LayoutList,label: "Module Catalog",  desc: "Enable or disable individual MES capability modules" },
    ],
  },
  {
    id: "operations",
    label: "Configure operations",
    desc: "Register your machines, set up shift schedules, define OEE targets and configure alerting rules.",
    icon: Zap,
    color: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-600 bg-amber-100",
    items: [
      { href: "/admin/machines",    icon: Cpu,          label: "Machines",        desc: "Register machines and assign them to production lines" },
      { href: "/admin/shifts",      icon: Clock,        label: "Shifts",          desc: "Shift schedules, break times and overlap rules" },
      { href: "/admin/oee-targets", icon: Target,       label: "OEE Targets",     desc: "Availability, performance and quality targets per line" },
      { href: "/admin/alerts",      icon: AlertTriangle,label: "Alert Rules",     desc: "Thresholds and notification routing for OEE and downtime" },
    ],
  },
  {
    id: "access",
    label: "Manage people & access",
    desc: "Invite your team, define roles and permissions, and configure authentication policies.",
    icon: Lock,
    color: "bg-emerald-50 border-emerald-200",
    iconColor: "text-emerald-700 bg-emerald-100",
    items: [
      { href: "/admin/users",    icon: Users,  label: "Users",          desc: "Invite team members, deactivate accounts" },
      { href: "/admin/rbac",     icon: Lock,   label: "Roles & Perms",  desc: "Role definitions and permission sets per group" },
      { href: "/admin/security", icon: Shield, label: "Security",       desc: "MFA, session timeout, password policy, SSO, IP allowlist" },
    ],
  },
  {
    id: "integrations",
    label: "Connect your systems",
    desc: "Hook up SAP S/4HANA, Oracle Cloud, configure notification channels, and generate API keys.",
    icon: Cable,
    color: "bg-sky-50 border-sky-200",
    iconColor: "text-sky-700 bg-sky-100",
    items: [
      { href: "/admin/erp-connectors", icon: Cable,    label: "ERP Connectors", desc: "SAP PP/MM/QM/PM/SD and Oracle Cloud integration" },
      { href: "/admin/notifications",  icon: Bell,     label: "Notifications",  desc: "Email, Slack and webhook alert channels" },
      { href: "/admin/api-keys",       icon: KeyRound, label: "API Keys",       desc: "Scoped API keys for external system integrations" },
    ],
  },
  {
    id: "platform",
    label: "Platform settings",
    desc: "Data retention, regional preferences, feature flags, and advanced platform controls.",
    icon: Settings2,
    color: "bg-slate-50 border-slate-200",
    iconColor: "text-slate-600 bg-slate-100",
    items: [
      { href: "/admin/data-retention", icon: Database,  label: "Data Retention", desc: "Retention periods for telemetry, audit logs and reports" },
      { href: "/admin/localization",   icon: Globe,     label: "Localisation",   desc: "Language, date format, units and currency" },
      { href: "/admin/advanced",       icon: Settings2, label: "Advanced",       desc: "Feature flags, debug mode and experimental capabilities" },
    ],
  },
];

const CHECKLIST = [
  { label: "Run the Setup Wizard",    href: "/admin/setup",    done: false },
  { label: "Add at least one plant",  href: "/admin/plants",   done: false },
  { label: "Register your machines",  href: "/admin/machines", done: false },
  { label: "Invite your team",        href: "/admin/users",    done: false },
  { label: "Connect ERP",             href: "/admin/erp-connectors", done: false },
];

export default function AdminOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const { enabledIds, catalog } = useModulesStore();
  const firstName = ((user as { name?: string; email?: string })?.name ?? (user as { email?: string })?.email ?? "there").split(" ")[0];

  const enabledCount = enabledIds ? [...enabledIds].filter((id) =>
    catalog.some((m) => m.id === id)
  ).length : catalog.length;

  return (
    <div className="max-w-4xl mx-auto space-y-10">

      {/* Welcome */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-[#001C2E] tracking-tight mb-1">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-sm text-[#6A8A9A]">
          This is your admin control panel. Configure your factory, manage your team, and connect your systems — all in one place.
        </p>
      </div>

      {/* Quick stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Modules enabled",  value: `${enabledCount || "—"}`,     sub: `of ${catalog.length || 43}` },
          { label: "Active users",     value: "—",                          sub: "in your org" },
          { label: "Plants",           value: "—",                          sub: "configured" },
          { label: "ERP connections",  value: "—",                          sub: "SAP / Oracle" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="p-4 rounded-2xl border border-[#E8E4DF] bg-white">
            <div className="text-2xl font-bold font-mono text-[#001C2E] leading-none mb-1">{value}</div>
            <div className="text-xs font-medium text-[#001C2E]">{label}</div>
            <div className="text-2xs text-[#6A8A9A] mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Getting started checklist */}
      <div className="p-6 rounded-2xl border border-[#E8E4DF] bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#001C2E]">Getting started</h2>
            <p className="text-xs text-[#6A8A9A] mt-0.5">Complete these steps to get your factory running.</p>
          </div>
          <span className="text-xs font-mono text-[#6A8A9A] bg-[#F5F4F1] px-2.5 py-1 rounded-full">
            0 / {CHECKLIST.length} done
          </span>
        </div>
        <div className="space-y-1">
          {CHECKLIST.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group hover:bg-[#F5F4F1]",
                item.done && "opacity-60"
              )}
            >
              {item.done
                ? <CheckCircle2 size={16} className="text-[#1A7A40] shrink-0" />
                : <Circle size={16} className="text-[#D0CCC8] shrink-0 group-hover:text-[#F05230] transition-colors" />
              }
              <span className={cn("text-sm flex-1", item.done ? "line-through text-[#6A8A9A]" : "text-[#001C2E] group-hover:text-[#F05230] transition-colors")}>{item.label}</span>
              <ChevronRight size={13} className="text-[#D0CCC8] group-hover:text-[#F05230] transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {SECTIONS.map((section) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.id} className={cn("rounded-2xl border p-6", section.color)}>
              {/* Section header */}
              <div className="flex items-start gap-4 mb-5">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", section.iconColor)}>
                  <SectionIcon size={17} />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-[#001C2E]">{section.label}</h2>
                  <p className="text-xs text-[#6A8A9A] mt-0.5 leading-relaxed">{section.desc}</p>
                </div>
              </div>
              {/* Items */}
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
