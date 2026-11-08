"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { useModulesStore, type ModuleDef } from "@/store/modules";
import {
  PlugZap, Search, Sparkles, RefreshCw, CheckCircle2,
  ArrowLeft, Package, Zap, Shield, Cable, Database, BarChart3,
  ChevronRight, Factory,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "all",         label: "All",         icon: Package   },
  { id: "core",        label: "Core",        icon: Zap       },
  { id: "quality",     label: "Quality",     icon: CheckCircle2 },
  { id: "maintenance", label: "Maintenance", icon: Shield    },
  { id: "analytics",   label: "Analytics",   icon: BarChart3 },
  { id: "integration", label: "Integration", icon: Cable     },
  { id: "compliance",  label: "Compliance",  icon: Shield    },
  { id: "enterprise",  label: "Enterprise",  icon: Database  },
];

const INDUSTRIES = [
  { id: "automotive",     label: "Automotive",     emoji: "🚗" },
  { id: "pharmaceutical", label: "Pharma",          emoji: "💊" },
  { id: "food_beverage",  label: "Food & Bev",     emoji: "🍶" },
  { id: "electronics",    label: "Electronics",    emoji: "🔌" },
  { id: "textile",        label: "Textile",        emoji: "🧵" },
  { id: "aerospace",      label: "Aerospace",      emoji: "✈️" },
  { id: "chemical",       label: "Chemical",       emoji: "⚗️" },
  { id: "generic",        label: "Generic MES",    emoji: "🏭" },
];

const CAT_COLOR: Record<string, string> = {
  core:        "bg-blue-50 text-blue-700 border-blue-200",
  quality:     "bg-green-50 text-green-700 border-green-200",
  maintenance: "bg-orange-50 text-orange-700 border-orange-200",
  planning:    "bg-purple-50 text-purple-700 border-purple-200",
  integration: "bg-cyan-50 text-cyan-700 border-cyan-200",
  analytics:   "bg-indigo-50 text-indigo-700 border-indigo-200",
  compliance:  "bg-red-50 text-red-700 border-red-200",
  labor:       "bg-yellow-50 text-yellow-700 border-yellow-200",
  energy:      "bg-lime-50 text-lime-700 border-lime-200",
  enterprise:  "bg-slate-50 text-slate-700 border-slate-200",
};

export default function PlantPluginsPage() {
  const { plantId } = useParams<{ plantId: string }>();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { catalog, setCatalog } = useModulesStore();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [installing, setInstalling] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);
  const [plantName, setPlantName] = useState<string>("");

  const orgId = (user as { organization_id?: string })?.organization_id;
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  useEffect(() => {
    if (catalog.length === 0) {
      fetch(`${base}/modules/catalog`, { headers })
        .then((r) => r.json())
        .then((d) => { if (d?.modules) setCatalog(d.modules); })
        .catch(() => {});
    }
    fetch(`${base}/factories/${plantId}`, { headers })
      .then((r) => r.json())
      .then((d) => { if (d?.name) setPlantName(d.name); })
      .catch(() => {});
    fetch(`${base}/plants/${plantId}/modules`, { headers })
      .then((r) => r.json())
      .then((d: { module_id: string; is_enabled: boolean }[]) => {
        if (Array.isArray(d)) {
          setInstalledIds(new Set(d.filter((m) => m.is_enabled).map((m) => m.module_id)));
        }
      })
      .catch(() => {});
  }, [plantId]);

  const filtered = catalog.filter((m) => {
    const matchSearch = !search ||
      m.label.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || m.category === category;
    return matchSearch && matchCat;
  });

  const handleInstall = async (mod: ModuleDef) => {
    const isOn = installedIds.has(mod.id);
    setInstalling(mod.id);
    const next = new Set(installedIds);
    isOn ? next.delete(mod.id) : next.add(mod.id);
    setInstalledIds(next);
    try {
      await fetch(`${base}/plants/${plantId}/modules/${mod.id}`, {
        method: isOn ? "DELETE" : "POST",
        headers,
      });
    } catch {
      setInstalledIds(installedIds);
    } finally {
      setInstalling(null);
    }
  };

  const applyTemplate = async (industry: string) => {
    setApplying(true);
    try {
      const res = await fetch(`${base}/plants/${plantId}/modules/template`, {
        method: "POST",
        headers,
        body: JSON.stringify({ industry }),
      });
      if (res.ok) {
        const rows: { module_id: string; is_enabled: boolean }[] = await res.json();
        setInstalledIds(new Set(rows.filter((r) => r.is_enabled).map((r) => r.module_id)));
        setAppliedTemplate(industry);
        setTimeout(() => setAppliedTemplate(null), 3000);
      }
    } finally {
      setApplying(false);
    }
  };

  const installedCount = installedIds.size;
  const grouped = filtered.reduce<Record<string, ModuleDef[]>>((acc, m) => {
    const key = m.category || "other";
    (acc[key] = acc[key] ?? []).push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/plants"
          className="inline-flex items-center gap-1.5 text-xs text-[#6A8A9A] hover:text-[#F05230] mb-3 transition-colors"
        >
          <ArrowLeft size={12} />
          Back to Plants
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[#001C2E] font-mono tracking-tight flex items-center gap-2">
              <PlugZap size={20} className="text-[#F05230]" />
              Plugins & Modules
              {plantName && (
                <span className="inline-flex items-center gap-1 text-sm font-normal text-[#6A8A9A]">
                  <ChevronRight size={14} />
                  <Factory size={13} />
                  {plantName}
                </span>
              )}
            </h1>
            <p className="text-sm text-[#6A8A9A] mt-1">
              {installedCount} plugin{installedCount !== 1 ? "s" : ""} installed for this plant.
              Install only what this plant needs.
            </p>
          </div>
          <Link
            href="/admin/modules"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E8E4DF] bg-white text-xs font-medium text-[#6A8A9A] hover:text-[#001C2E] hover:border-[#001C2E]/30 transition-colors"
          >
            <Sparkles size={13} />
            Org-wide Module Catalog
          </Link>
        </div>
      </div>

      {/* Industry Templates */}
      <div className="p-5 rounded-xl border border-[#E8E4DF] bg-white">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-[#F05230]" />
          <span className="text-xs font-bold text-[#001C2E] font-mono uppercase tracking-widest">Quick Start — Industry Templates</span>
        </div>
        <p className="text-xs text-[#6A8A9A] mb-4">
          Apply a curated module bundle for your industry type. You can customise further after.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {INDUSTRIES.map((ind) => (
            <button
              key={ind.id}
              onClick={() => applyTemplate(ind.id)}
              disabled={applying}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all",
                appliedTemplate === ind.id
                  ? "border-[#F05230] bg-[#FEF0EB] text-[#F05230]"
                  : "border-[#E8E4DF] text-[#001C2E] hover:border-[#F05230]/40 hover:bg-[#FEF0EB]/30",
                applying && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="text-lg leading-none">{ind.emoji}</span>
              <span>{ind.label}</span>
              {appliedTemplate === ind.id && (
                <CheckCircle2 size={12} className="text-[#F05230]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search + category filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A8A9A]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search modules…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E8E4DF] text-sm text-[#001C2E] bg-white placeholder:text-[#6A8A9A] focus:outline-none focus:ring-2 focus:ring-[#F05230]/20 focus:border-[#F05230]"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                  category === cat.id
                    ? "bg-[#F05230] text-white"
                    : "bg-white border border-[#E8E4DF] text-[#6A8A9A] hover:border-[#F05230]/40 hover:text-[#001C2E]"
                )}
              >
                <Icon size={11} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Module grid — grouped by category when showing all */}
      {category === "all" && Object.keys(grouped).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, mods]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-2xs font-mono uppercase tracking-wider border",
                  CAT_COLOR[cat] ?? "bg-gray-50 text-gray-700 border-gray-200"
                )}>
                  {cat}
                </span>
                <span className="text-xs text-[#6A8A9A]">{mods.length} module{mods.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {mods.map((mod) => <ModuleCard key={mod.id} mod={mod} installedIds={installedIds} installing={installing} onInstall={handleInstall} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((mod) => <ModuleCard key={mod.id} mod={mod} installedIds={installedIds} installing={installing} onInstall={handleInstall} />)}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-sm text-[#6A8A9A]">
              No modules match your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModuleCard({
  mod,
  installedIds,
  installing,
  onInstall,
}: {
  mod: ModuleDef;
  installedIds: Set<string>;
  installing: string | null;
  onInstall: (mod: ModuleDef) => void;
}) {
  const isInstalled = installedIds.has(mod.id);
  const isBusy = installing === mod.id;

  return (
    <div className={cn(
      "flex flex-col rounded-xl border bg-white transition-all overflow-hidden",
      isInstalled ? "border-[#F05230]/30 shadow-sm" : "border-[#E8E4DF]"
    )}>
      <div className="p-4 flex-1">
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-mono font-bold",
            isInstalled ? "bg-[#FEF0EB] text-[#F05230]" : "bg-[#F5F4F1] text-[#6A8A9A]"
          )}>
            {mod.label.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-[#001C2E] mb-0.5">{mod.label}</div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className={cn(
                "px-1.5 py-0.5 rounded text-2xs font-mono uppercase tracking-wider border",
                CAT_COLOR[mod.category] ?? "bg-gray-50 text-gray-600 border-gray-200"
              )}>
                {mod.category}
              </span>
              {mod.is_core && (
                <span className="px-1.5 py-0.5 rounded text-2xs font-mono bg-[#001C2E] text-white uppercase tracking-wider">
                  core
                </span>
              )}
            </div>
            <p className="text-xs text-[#6A8A9A] leading-relaxed">{mod.description}</p>
          </div>
        </div>
      </div>
      <div className={cn(
        "px-4 py-3 border-t flex items-center justify-between",
        isInstalled ? "border-[#F05230]/20 bg-[#FEF0EB]/20" : "border-[#E8E4DF] bg-[#F5F4F1]/30"
      )}>
        {isInstalled ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A7A40]">
            <CheckCircle2 size={12} />
            Installed
          </span>
        ) : (
          <span className="text-xs text-[#6A8A9A]">Not installed</span>
        )}
        <button
          onClick={() => !mod.is_core && onInstall(mod)}
          disabled={isBusy || mod.is_core}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
            mod.is_core
              ? "bg-[#E8E4DF] text-[#6A8A9A] cursor-default"
              : isInstalled
                ? "bg-white border border-[#E8E4DF] text-[#6A8A9A] hover:border-red-300 hover:text-red-600"
                : "bg-[#F05230] text-white hover:bg-[#d94720]",
            isBusy && "opacity-60"
          )}
        >
          {isBusy ? (
            <RefreshCw size={11} className="animate-spin" />
          ) : mod.is_core ? (
            "Required"
          ) : isInstalled ? (
            "Remove"
          ) : (
            "Install"
          )}
        </button>
      </div>
    </div>
  );
}
