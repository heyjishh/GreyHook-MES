"use client";

import { useEffect, useState } from "react";
import { LogOut, ChevronRight, Menu } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { useFactoryStore } from "@/store/factory";
import { useIndustryStore } from "@/store/industry";
import { INDUSTRY_CONFIGS } from "@/lib/industry-config";

function formatIST(date: Date): string {
  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const ROLE_LABEL: Record<string, string> = {
  admin:      "Admin",
  manager:    "Manager",
  supervisor: "Supervisor",
  operator:   "Operator",
};

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const user               = useAuthStore((s) => s.user);
  const logout             = useAuthStore((s) => s.logout);
  const selectedFactoryId  = useFactoryStore((s) => s.selectedFactoryId);
  const selectedLineId     = useFactoryStore((s) => s.selectedLineId);
  const selectedIndustry   = useIndustryStore((s) => s.selectedIndustry);
  const industry           = INDUSTRY_CONFIGS[selectedIndustry];
  const [timeIST, setTimeIST] = useState<string>("");

  useEffect(() => {
    const update = () => setTimeIST(formatIST(new Date()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const breadcrumb = selectedFactoryId ? (
    <div className="flex items-center gap-1.5 font-sans text-sm text-text-secondary">
      <span className="font-medium text-text-primary">{selectedFactoryId}</span>
      {selectedLineId && (
        <>
          <ChevronRight size={13} className="text-text-disabled" />
          <span>{selectedLineId}</span>
        </>
      )}
    </div>
  ) : (
    <span className="font-mono text-2xs text-text-tertiary uppercase tracking-widest">
      No factory selected
    </span>
  );

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-bg border-b border-border shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={18} />
        </button>
        {breadcrumb}
      </div>
      <div className="flex items-center gap-5">
        <Link
          href="/dashboard/industry-select"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-2xs font-bold border transition-opacity hover:opacity-70"
          style={{ background: industry.color + "10", color: industry.color, borderColor: industry.color + "30" }}
        >
          <span>{industry.emoji}</span>
          <span>{industry.name}</span>
        </Link>
        <span className="font-mono text-xs text-text-tertiary tabular-nums">
          {timeIST} IST
        </span>
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-brand-subtle border border-brand-muted flex items-center justify-center font-mono text-xs font-bold text-brand">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block leading-none">
                <p className="font-sans text-xs font-semibold text-text-primary">{user.name}</p>
                <p className="font-mono text-2xs text-text-tertiary uppercase tracking-widest mt-0.5">
                  {ROLE_LABEL[user.role] ?? user.role}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-text-tertiary hover:text-danger transition-colors font-sans text-xs"
              aria-label="Sign out"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
