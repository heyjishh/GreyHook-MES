"use client";

import Link from "next/link";
import { AlertTriangle, Info, Lightbulb, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Variant = "warning" | "info" | "tip";

interface InsightBannerProps {
  variant?: Variant;
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  dismissible?: boolean;
  className?: string;
}

const STYLES: Record<Variant, { wrap: string; icon: string; title: string; msg: string; btn: string }> = {
  warning: {
    wrap:  "border-amber-200 bg-amber-50",
    icon:  "text-amber-600",
    title: "text-amber-900",
    msg:   "text-amber-700",
    btn:   "bg-amber-600 text-white hover:bg-amber-700",
  },
  info: {
    wrap:  "border-sky-200 bg-sky-50",
    icon:  "text-sky-600",
    title: "text-sky-900",
    msg:   "text-sky-700",
    btn:   "bg-sky-600 text-white hover:bg-sky-700",
  },
  tip: {
    wrap:  "border-violet-200 bg-violet-50",
    icon:  "text-violet-600",
    title: "text-violet-900",
    msg:   "text-violet-700",
    btn:   "bg-violet-600 text-white hover:bg-violet-700",
  },
};

const ICONS: Record<Variant, typeof AlertTriangle> = {
  warning: AlertTriangle,
  info: Info,
  tip: Lightbulb,
};

export function InsightBanner({
  variant = "info",
  title,
  message,
  actionLabel,
  actionHref,
  dismissible = true,
  className,
}: InsightBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const s = STYLES[variant];
  const Icon = ICONS[variant];

  return (
    <div className={cn("flex items-start gap-3 p-4 rounded-xl border", s.wrap, className)}>
      <Icon size={16} className={cn("shrink-0 mt-0.5", s.icon)} />
      <div className="flex-1 min-w-0">
        <div className={cn("font-semibold text-sm mb-0.5", s.title)}>{title}</div>
        <p className={cn("text-xs leading-relaxed", s.msg)}>{message}</p>
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className={cn(
              "inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              s.btn
            )}
          >
            {actionLabel}
            <ChevronRight size={11} />
          </Link>
        )}
      </div>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className={cn("shrink-0 p-1 rounded hover:bg-black/10 transition-colors", s.icon)}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
