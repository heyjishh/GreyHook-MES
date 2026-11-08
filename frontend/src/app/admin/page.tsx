"use client";

import Link from "next/link";
import {
  Building2, Factory, GitBranch, LayoutList, Sparkles,
  Cpu, Clock, Users, Lock, Shield, Cable, Bell, KeyRound,
  Target, AlertTriangle, Settings2, ChevronRight, Zap,
  Database, Globe, ArrowUpRight,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useModulesStore } from "@/store/modules";
import { cn } from "@/lib/utils";

interface ConfigCard {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  desc: string;
  badge?: string;
  badgeColor?: string;
  color: string;
  section: string;
}

const CARDS: ConfigCard[] = [
  {
    href: "/admin/setup",
    icon: Sparkles,
    title: "Setup Wizard",
    desc: "Industry selector → module template in 3 steps",
    badge: "Start here",
    badgeColor: "bg-[#F05230]/15 text-[#F05230]",
    color: "border-[#F05230]/30 hover:border-[#F05230]",
    section: "Setup",
  },
  {
    href: "/admin/business",
    icon: Building2,
    title: "Business",
    desc: "Organisation name, industry, tenant profile",
    color: "border-[#E8E4DF] hover:border-[#001C2E]/30",
    section: "Setup",
  },
  {
    href: "/admin/plants",
    icon: Factory,
    title: "Plants",
    desc: "Create and manage factory sites with timezone",
    color: "border-[#E8E4DF] hover:border-[#001C2E]/30",
    section: "Setup",
  },
  {
    href: "/admin/lines",
    icon: GitBranch,
    title: "Production Lines",
    desc: "Define lines under each plant",
    color: "border-[#E8E4DF] hover:border-[#001C2E]/30",
    section: "Setup",
  },
  {
    href: "/admin/modules",
    icon: LayoutList,
    title: "Module Catalog",
    desc: "Enable / disable MES modules per organisation",
    color: "border-[#E8E4DF] hover:border-[#001C2E]/30",
    section: "Setup",
  },
  {
    href: "/admin/machines",
    icon: Cpu,
    title: "Machines",
    desc: "Register machines, assign to lines, set OEE targets",
    color: "border-[#E8E4DF] hover:border-[#001C2E]/30",
    section: "Operations",
  },
  {
    href: "/admin/shifts",
    icon: Clock,
    title: "Shifts",
    desc: "Configure shift schedules, break times, overlap rules",
    color: "border-[#E8E4DF] hover:border-[#001C2E]/30",
    section: "Operations",
  },
  {
    href: "/admin/oee-targets",
    icon: Target,
    title: "OEE Targets",
    desc: "Set availability, performance, quality targets by line",
    color: "border-[#E8E4DF] hover:border-[#001C2E]/30",
    section: "Operations",
  },
  {
    href: "/admin/alerts",
    icon: AlertTriangle,
    title: "Alert Thresholds",
    desc: "Configure OEE, downtime, quality alerting rules",
    color: "border-[#E8E4DF] hover:border-[#001C2E]/30",
    section: "Operations",
  },
  {
    href: "/admin/users",
    icon: Users,
    title: "Users",
    desc: "Invite team members, deactivate accounts",
    color: "border-[#E8E4DF] hover:border-[#001C2E]/30",
    section: "Access",
  },
  {
    href: "/admin/rbac",
    icon: Lock,
    title: "Roles & Access",
    desc: "Define roles and permission sets for each user group",
    color: "border-[#E8E4DF] hover:border-[#001C2E]/30",
    section: "Access",
  },
  {
    href: "/admin/security",
    icon: Shield,
    title: "Security",
    desc: "MFA, session timeout, password policy, audit logs",
    color: "border-[#E8E4DF] hover:border-[#001C2E]/30",
    section: "Access",
  },
  {
    href: "/admin/erp-connectors",
    icon: Cable,
    title: "ERP Connectors",
    desc: "SAP S/4HANA and Oracle Cloud connector management",
    color: "border-[#E8E4DF] hover:border-[#001C2E]/30",
    section: "Integrations",
  },
  {
    href: "/admin/notifications",
    icon: Bell,
    title: "Notifications",
    desc: "Email, Slack and webhook alert routing config",
    color: "border-[#E8E4DF] hover:border-[#001C2E]/30",
    section: "Integrations",
  },
  {
    href: "/admin/api-keys",
    icon: KeyRound,
    title: "API Keys",
    desc: "Generate and manage API keys for external systems",
    color: "border-[#E8E4DF] hover:border-[#001C2E]/30",
    section: "Integrations",
  },
  {
    href: "/admin/data-retention",
    icon: Database,
    title: "Data Retention",
    desc: "Configure telemetry, audit log and report retention periods",
    color: "border-[#E8E4DF] hover:border-[#001C2E]/30",
    section: "Platform",
  },
  {
    href: "/admin/localization",
    icon: Globe,
    title: "Localisation",
    desc: "Language, date format, units (metric / imperial), currency",
    color: "border-[#E8E4DF] hover:border-[#001C2E]/30",
    section: "Platform",
  },
  {
    href: "/admin/advanced",
    icon: Settings2,
    title: "Advanced",
    desc: "Feature flags, debug mode, telemetry sampling, cache",
    color: "border-[#E8E4DF] hover:border-[#001C2E]/30",
    section: "Platform",
  },
];

const SECTIONS = ["Setup", "Operations", "Access", "Integrations", "Platform"];

const SECTION_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Setup: Sparkles,
  Operations: Zap,
  Access: Lock,
  Integrations: Cable,
  Platform: Settings2,
};

export default function AdminOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const { enabledIds, catalog } = useModulesStore();

  const enabledCount = enabledIds ? [...enabledIds].filter((id) =>
    catalog.some((m) => m.id === id)
  ).length : catalog.length;

  const stats = [
    { label: "Modules Enabled",   value: enabledCount || "—", sub: `of ${catalog.length || 43} total` },
    { label: "Active Users",      value: "—",   sub: "in your org" },
    { label: "Plants",            value: "—",   sub: "configured" },
    { label: "ERP Connectors",    value: "—",   sub: "SAP / Oracle" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#001C2E] font-mono tracking-tight">
            Admin Console
          </h1>
          <p className="text-sm text-[#6A8A9A] mt-1">
            Logged in as <strong className="text-[#001C2E]">{(user as { email?: string })?.email ?? "—"}</strong>
            {" · "}<span className="capitalize font-medium text-[#F05230]">{(user as { role?: string })?.role ?? "admin"}</span>
          </p>
        </div>
        <Link
          href="/admin/setup"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F05230] text-white text-sm font-semibold hover:bg-[#d94720] transition-colors"
        >
          <Sparkles size={14} />
          Run Setup Wizard
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(({ label, value, sub }) => (
          <div key={label} className="p-4 rounded-xl border border-[#E8E4DF] bg-white">
            <div className="text-2xl font-bold font-mono text-[#001C2E]">{value}</div>
            <div className="text-xs font-medium text-[#001C2E] mt-1">{label}</div>
            <div className="text-2xs text-[#6A8A9A] mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Config sections */}
      {SECTIONS.map((section) => {
        const sectionCards = CARDS.filter((c) => c.section === section);
        const SectionIcon = SECTION_ICON[section];
        return (
          <div key={section}>
            <div className="flex items-center gap-2 mb-3">
              <SectionIcon size={14} className="text-[#F05230]" />
              <h2 className="text-xs font-mono font-bold text-[#001C2E] uppercase tracking-widest">{section}</h2>
              <div className="flex-1 h-px bg-[#E8E4DF]" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {sectionCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    className={cn(
                      "group flex items-start gap-4 p-4 rounded-xl border bg-white transition-all hover:shadow-sm",
                      card.color
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#FAFAF8] border border-[#E8E4DF] flex items-center justify-center shrink-0 group-hover:border-[#F05230]/30 transition-colors">
                      <Icon size={16} className="text-[#6A8A9A] group-hover:text-[#F05230] transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm text-[#001C2E]">{card.title}</span>
                        {card.badge && (
                          <span className={cn("px-1.5 py-0.5 rounded text-2xs font-mono font-semibold", card.badgeColor)}>
                            {card.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6A8A9A] leading-relaxed">{card.desc}</p>
                    </div>
                    <ChevronRight size={14} className="text-[#E8E4DF] group-hover:text-[#F05230] shrink-0 mt-0.5 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Quick actions */}
      <div className="p-5 rounded-xl border border-[#E8E4DF] bg-[#FAFAF8]">
        <h3 className="text-xs font-mono font-bold text-[#001C2E] uppercase tracking-widest mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Invite User",        href: "/admin/users"        },
            { label: "Add Plant",          href: "/admin/plants"       },
            { label: "Add Machine",        href: "/admin/machines"     },
            { label: "Connect SAP",        href: "/admin/erp-connectors"},
            { label: "Set OEE Target",     href: "/admin/oee-targets"  },
            { label: "Configure Alert",    href: "/admin/alerts"       },
            { label: "Generate API Key",   href: "/admin/api-keys"     },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E4DF] bg-white text-xs font-medium text-[#001C2E] hover:border-[#F05230]/40 hover:text-[#F05230] hover:bg-[#FEF0EB]/30 transition-all"
            >
              <ArrowUpRight size={11} />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
