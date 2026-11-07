"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Activity,
  BarChart3,
  Timer,
  Bot,
  Settings,
  TrendingUp,
  ClipboardList,
  ShieldCheck,
  FileText,
  GitBranch,
  AlertOctagon,
  ListChecks,
  Wrench,
  Layers,
  Monitor,
  SigmaSquare,
  CalendarDays,
  BookOpen,
  Droplets,
  FlaskConical,
  ClipboardCheck,
  Users,
  Boxes,
  X,
  TestTube2,
  ScrollText,
  ShieldAlert,
  Zap,
  BookMarked,
  Cable,
  Radio,
  Hammer,
  Network,
  Ruler,
  Truck,
  SlidersHorizontal,
  Globe,
  LayoutGrid,
  Award,
  ArrowLeftRight,
  CalendarRange,
  IndianRupee,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  adminOnly?: boolean;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",            label: "Overview",   icon: LayoutDashboard },
  { href: "/dashboard/production", label: "Production", icon: Activity },
  { href: "/dashboard/oee",        label: "OEE",        icon: BarChart3 },
  { href: "/dashboard/downtime",   label: "Downtime",   icon: Timer },
  { href: "/dashboard/ai",          label: "AI Insight", icon: Bot },
  { href: "/dashboard/analytics",  label: "Analytics",    icon: TrendingUp },
  { href: "/dashboard/workorders", label: "Work Orders",  icon: ClipboardList },
  { href: "/dashboard/quality",    label: "Quality",      icon: ShieldCheck },
  { href: "/dashboard/reports",    label: "Reports",      icon: FileText },
  { href: "/dashboard/traceability", label: "Traceability",    icon: GitBranch },
  { href: "/dashboard/ncm",          label: "Non-Conformance", icon: AlertOctagon },
  { href: "/dashboard/workorders/PO-2026-11-001", label: "Instructions",    icon: ListChecks },
  { href: "/dashboard/maintenance",  label: "Maintenance",     icon: Wrench },
  { href: "/dashboard/bom",          label: "BOM",             icon: Layers },
  { href: "/dashboard/operator",     label: "Operator Board",  icon: Monitor },
  { href: "/dashboard/spc",          label: "SPC / Capability", icon: SigmaSquare },
  { href: "/dashboard/scheduling",   label: "Scheduling",      icon: CalendarDays },
  { href: "/dashboard/shift-handover", label: "Shift Handover", icon: BookOpen },
  { href: "/dashboard/yield",        label: "Yield & Loss",    icon: Droplets },
  { href: "/dashboard/golden-batch", label: "Golden Batch",    icon: FlaskConical },
  { href: "/dashboard/quality/inspections", label: "Inspections", icon: ClipboardCheck },
  { href: "/dashboard/labor",        label: "Labor",           icon: Users },
  { href: "/dashboard/inventory",    label: "Inventory / WIP", icon: Boxes },
  { href: "/dashboard/recipes",      label: "Recipes",         icon: TestTube2 },
  { href: "/dashboard/ebr",          label: "Batch Records",   icon: ScrollText },
  { href: "/dashboard/capa",         label: "CAPA",            icon: ShieldAlert },
  { href: "/dashboard/energy",       label: "Energy",          icon: Zap },
  { href: "/dashboard/documents",    label: "Documents",       icon: BookMarked },
  { href: "/dashboard/erp-sync",        label: "ERP Sync",         icon: Cable },
  { href: "/dashboard/andon",           label: "ANDON Board",      icon: Radio },
  { href: "/dashboard/tooling",         label: "Tooling",          icon: Hammer },
  { href: "/dashboard/genealogy",       label: "Genealogy",        icon: Network },
  { href: "/dashboard/calibration",     label: "Calibration",      icon: Ruler },
  { href: "/dashboard/supplier-quality",label: "Supplier Quality", icon: Truck },
  { href: "/dashboard/line-balance",    label: "Line Balance",     icon: SlidersHorizontal },
  { href: "/dashboard/enterprise",           label: "Command Center",   icon: Globe,         section: "Enterprise" },
  { href: "/dashboard/plant-benchmarking",   label: "Benchmarking",    icon: Award,         section: "Enterprise" },
  { href: "/dashboard/global-compliance",    label: "Compliance",      icon: LayoutGrid,    section: "Enterprise" },
  { href: "/dashboard/recipe-library",       label: "Recipe Library",  icon: FlaskConical,  section: "Enterprise" },
  { href: "/dashboard/wip-transfer",         label: "WIP Transfer",    icon: ArrowLeftRight,section: "Enterprise" },
  { href: "/dashboard/enterprise-scheduling",label: "Scheduling",      icon: CalendarRange, section: "Enterprise" },
  { href: "/dashboard/finance",    label: "Finance",         icon: IndianRupee,   section: "Finance & Ops" },
  { href: "/dashboard/procurement",label: "Procurement",     icon: ShoppingCart,  section: "Finance & Ops" },
  { href: "/admin",                label: "Admin",        icon: Settings, adminOnly: true },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

function SidebarContent({
  pathname,
  visible,
  onClose,
}: {
  pathname: string;
  visible: NavItem[];
  onClose?: () => void;
}) {
  return (
    <>
      <div className="px-5 py-5 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 rounded-sm bg-brand shrink-0 brand-icon" />
          <span className="font-mono text-xs font-bold text-sidebar-fg tracking-widest uppercase">
            GreyHook
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded text-sidebar-fg-muted hover:text-sidebar-fg"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {visible.map((item, idx) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const prevItem = visible[idx - 1];
          const showSection = item.section && item.section !== prevItem?.section;

          return (
            <div key={item.href}>
              {showSection && (
                <p className="px-3 pt-3 pb-1 font-mono text-2xs text-sidebar-fg-muted/50 uppercase tracking-widest">
                  {item.section}
                </p>
              )}
              <NextLink
                href={item.href}
                onClick={onClose}
                target={item.adminOnly ? "_blank" : undefined}
                rel={item.adminOnly ? "noopener noreferrer" : undefined}
                className={cn(
                  "group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-sans font-medium transition-all duration-200",
                  isActive
                    ? "bg-brand/12 text-brand font-semibold nav-active-bar shadow-[inset_0_1px_0_rgba(240,82,48,0.08)]"
                    : "text-sidebar-fg-muted hover:text-sidebar-fg hover:bg-sidebar-hover-bg hover:shadow-[0_0_12px_rgba(240,82,48,0.06)]"
                )}
              >
                <Icon size={14} className="shrink-0" />
                <span>{item.label}</span>
              </NextLink>
            </div>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            <div className="absolute inset-0 rounded-full bg-success animate-ping opacity-25" />
          </div>
          <span className="font-mono text-2xs text-sidebar-fg-muted uppercase tracking-widest">
            Live data
          </span>
        </div>
      </div>
    </>
  );
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const visible = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === "admin"
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-52 shrink-0 flex-col bg-sidebar-bg border-r border-sidebar-border">
        <SidebarContent pathname={pathname} visible={visible} />
      </aside>

      {/* Mobile slide-in sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-sidebar-bg border-r border-sidebar-border transition-transform duration-300 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent pathname={pathname} visible={visible} onClose={onClose} />
      </aside>
    </>
  );
}
