"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, Cpu, Users, Clock, Shield, Lock,
  ArrowLeft, ChevronRight, ExternalLink,
  Building2, Factory, GitBranch, LayoutList, Sparkles,
  Target, AlertTriangle, Cable, Bell, KeyRound, Database, Globe, Settings2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    id: "console",
    label: "Console",
    icon: LayoutGrid,
    color: "text-[#F05230]",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutGrid },
    ],
  },
  {
    id: "setup",
    label: "Setup",
    icon: Sparkles,
    color: "text-violet-400",
    items: [
      { href: "/admin/setup",    label: "Setup Wizard",    icon: Sparkles   },
      { href: "/admin/business", label: "Business",        icon: Building2  },
      { href: "/admin/plants",   label: "Plants",          icon: Factory    },
      { href: "/admin/lines",    label: "Production Lines",icon: GitBranch  },
      { href: "/admin/modules",  label: "Module Catalog",  icon: LayoutList },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: Zap,
    color: "text-amber-400",
    items: [
      { href: "/admin/machines",    label: "Machines",        icon: Cpu          },
      { href: "/admin/shifts",      label: "Shifts",          icon: Clock        },
      { href: "/admin/oee-targets", label: "OEE Targets",     icon: Target       },
      { href: "/admin/alerts",      label: "Alert Rules",     icon: AlertTriangle},
    ],
  },
  {
    id: "access",
    label: "Access",
    icon: Lock,
    color: "text-emerald-400",
    items: [
      { href: "/admin/users",    label: "Users",          icon: Users  },
      { href: "/admin/rbac",     label: "Roles & Perms",  icon: Lock   },
      { href: "/admin/security", label: "Security",       icon: Shield },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Cable,
    color: "text-sky-400",
    items: [
      { href: "/admin/erp-connectors", label: "ERP Connectors", icon: Cable    },
      { href: "/admin/notifications",  label: "Notifications",  icon: Bell     },
      { href: "/admin/api-keys",       label: "API Keys",       icon: KeyRound },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    icon: Settings2,
    color: "text-slate-400",
    items: [
      { href: "/admin/data-retention", label: "Data Retention", icon: Database  },
      { href: "/admin/localization",   label: "Localisation",   icon: Globe     },
      { href: "/admin/advanced",       label: "Advanced",       icon: Settings2 },
    ],
  },
];

function AdminSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-white/8 bg-[#040E36] min-h-screen">
      {/* Logo + back */}
      <div className="px-4 pt-5 pb-4 border-b border-white/8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded bg-[#F05230] flex items-center justify-center shrink-0">
            <span className="text-white font-black text-2xs tracking-tight">G</span>
          </div>
          <span className="font-mono text-xs font-bold text-white tracking-widest uppercase">GreyHook</span>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-2xs transition-colors hover:opacity-100"
          style={{ color: "#6A8ABB" }}
        >
          <ArrowLeft size={11} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Nav — always expanded, section headers as labels */}
      <nav className="flex-1 py-3 overflow-y-auto space-y-1">
        {SECTIONS.map((section) => {
          const SectionIcon = section.icon;

          if (section.id === "console") {
            const item = section.items[0];
            const isActive = pathname === "/admin";
            return (
              <div key={section.id} className="px-2">
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                    isActive
                      ? "bg-[#F05230]/15 text-[#F05230] font-semibold"
                      : "hover:bg-[#162454]"
                  )}
                  style={isActive ? {} : { color: "#B8CCDF" }}
                >
                  <SectionIcon size={13} className="shrink-0" />
                  Overview
                </Link>
              </div>
            );
          }

          return (
            <div key={section.id} className="px-2">
              {/* Section label */}
              <div className="flex items-center gap-2 px-3 pt-4 pb-1.5">
                <SectionIcon size={11} className={cn("shrink-0", section.color)} />
                <span className="font-mono text-2xs font-bold uppercase tracking-widest" style={{ color: "#6A8ABB" }}>{section.label}</span>
              </div>
              {/* Items */}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all",
                        isActive
                          ? "bg-[#F05230]/15 text-[#F05230] font-semibold"
                          : "hover:bg-[#162454]"
                      )}
                      style={isActive ? {} : { color: "#B8CCDF" }}
                    >
                      <Icon size={13} className="shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/8">
        <p className="font-mono text-2xs text-white/25">Admin Console · v2.1.0</p>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const activeSection = SECTIONS.find((s) =>
    s.items.some((item) =>
      item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
    )
  );
  const activeItem = SECTIONS.flatMap((s) => s.items).find((item) =>
    item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
  );

  return (
    <div className="flex min-h-screen bg-[#F5F4F1]">
      <AdminSidebar pathname={pathname} />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-[#E8E4DF] shrink-0">
          <div className="flex items-center gap-2 font-mono text-2xs text-[#6A8A9A]">
            <Link href="/admin" className="hover:text-[#001C2E] transition-colors">Admin</Link>
            {activeSection && activeSection.id !== "console" && (
              <>
                <ChevronRight size={11} />
                <span className="text-[#6A8A9A]">{activeSection.label}</span>
              </>
            )}
            {activeItem && activeItem.href !== "/admin" && (
              <>
                <ChevronRight size={11} />
                <span className="text-[#001C2E] font-semibold">{activeItem.label}</span>
              </>
            )}
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F05230]/8 text-[#F05230] font-mono text-2xs font-semibold hover:bg-[#F05230]/15 transition-colors"
          >
            <ExternalLink size={11} />
            Open Dashboard
          </Link>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-[1280px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
