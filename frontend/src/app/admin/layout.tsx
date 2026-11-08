"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, Cpu, Users, Clock, Shield, Lock,
  ArrowLeft, ChevronRight, ExternalLink,
  Building2, Factory, GitBranch, LayoutList, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin",          label: "Overview",     icon: LayoutGrid, section: "Console"  },
  { href: "/admin/setup",    label: "Setup Wizard", icon: Sparkles,   section: "Setup"    },
  { href: "/admin/business", label: "Business",     icon: Building2,  section: "Setup"    },
  { href: "/admin/plants",   label: "Plants",       icon: Factory,    section: "Setup"    },
  { href: "/admin/lines",    label: "Prod. Lines",  icon: GitBranch,  section: "Setup"    },
  { href: "/admin/modules",  label: "Modules",      icon: LayoutList, section: "Setup"    },
  { href: "/admin/machines", label: "Machines",     icon: Cpu,        section: "Config"   },
  { href: "/admin/shifts",   label: "Shifts",       icon: Clock,      section: "Config"   },
  { href: "/admin/users",    label: "Users",        icon: Users,      section: "Config"   },
  { href: "/admin/rbac",     label: "Roles & Access", icon: Lock,     section: "Config"   },
  { href: "/admin/security", label: "Security",     icon: Shield,     section: "Config"   },
];

function AdminSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="w-52 shrink-0 flex flex-col border-r border-[#E8E4DF] bg-[#040E36] min-h-screen">
      {/* Logo + back */}
      <div className="px-5 pt-5 pb-4 border-b border-white/8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 rounded-sm bg-[#F05230] shrink-0" />
          <span className="font-mono text-xs font-bold text-white tracking-widest uppercase">GreyHook</span>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[#F05230] font-mono text-2xs hover:opacity-80 transition-opacity"
        >
          <ArrowLeft size={11} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, section }, idx) => {
          const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          const prevSection = idx > 0 ? NAV[idx - 1].section : null;
          const showSection = section !== prevSection;
          return (
            <div key={href}>
              {showSection && (
                <p className="px-3 pt-3 pb-1 font-mono text-2xs text-white/30 uppercase tracking-widest">
                  {section}
                </p>
              )}
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-sans font-medium transition-all",
                  isActive
                    ? "bg-[#F05230]/15 text-[#F05230] font-semibold"
                    : "text-white/50 hover:text-white/90 hover:bg-white/6"
                )}
              >
                <Icon size={13} className="shrink-0" />
                {label}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/8">
        <p className="font-mono text-2xs text-white/30">Admin Console</p>
        <p className="font-mono text-2xs text-white/20 mt-0.5">v2.1.0 · GreyHook MES</p>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#FAFAF8]">
      <AdminSidebar pathname={pathname} />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-[#E8E4DF] shrink-0">
          <div className="flex items-center gap-2 font-mono text-2xs text-[#6A8A9A]">
            <Link href="/admin" className="hover:text-[#001C2E] transition-colors">Admin</Link>
            {pathname !== "/admin" && (
              <>
                <ChevronRight size={11} />
                <span className="text-[#001C2E] capitalize">
                  {pathname.split("/admin/")[1] ?? ""}
                </span>
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
