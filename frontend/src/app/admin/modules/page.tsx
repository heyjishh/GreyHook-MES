"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useModulesStore, type ModuleDef } from "@/store/modules";
import {
  LayoutGrid, Search, CheckCircle2, Circle, Sparkles,
  RefreshCw, ChevronDown, ChevronRight, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "all", "core", "quality", "maintenance", "planning",
  "integration", "analytics", "compliance", "labor", "energy", "enterprise",
];

const INDUSTRIES = [
  { id: "automotive",    label: "Automotive" },
  { id: "pharmaceutical",label: "Pharmaceutical" },
  { id: "food_beverage", label: "Food & Beverage" },
  { id: "electronics",   label: "Electronics" },
  { id: "textile",       label: "Textile" },
  { id: "aerospace",     label: "Aerospace" },
  { id: "chemical",      label: "Chemical" },
  { id: "plastics",      label: "Plastics" },
  { id: "generic",       label: "Generic" },
];

const CAT_COLOR: Record<string, string> = {
  core:        "bg-blue-100 text-blue-700",
  quality:     "bg-green-100 text-green-700",
  maintenance: "bg-orange-100 text-orange-700",
  planning:    "bg-purple-100 text-purple-700",
  integration: "bg-cyan-100 text-cyan-700",
  analytics:   "bg-indigo-100 text-indigo-700",
  compliance:  "bg-red-100 text-red-700",
  labor:       "bg-yellow-100 text-yellow-700",
  energy:      "bg-lime-100 text-lime-700",
  enterprise:  "bg-slate-100 text-slate-700",
};

export default function ModulesPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { catalog, enabledIds, toggle, setCatalog, setEnabledIds } = useModulesStore();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [applying, setApplying] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const orgId = (user as { organization_id?: string })?.organization_id;
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  useEffect(() => {
    if (catalog.length > 0) return;
    fetch(`${base}/modules/catalog`, { headers })
      .then((r) => r.json())
      .then((d) => { if (d?.modules) setCatalog(d.modules); })
      .catch(() => {});
  }, []);

  const filtered = catalog.filter((m) => {
    const matchSearch = m.label.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || m.category === category;
    return matchSearch && matchCat;
  });

  const handleToggle = async (mod: ModuleDef) => {
    if (!orgId) return;
    const next = !(enabledIds?.has(mod.id) ?? true);
    setSaving(mod.id);
    toggle(mod.id, next);
    try {
      await fetch(`${base}/modules/org/${orgId}/toggle`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ module_id: mod.id, is_enabled: next }),
      });
    } catch {
      toggle(mod.id, !next);
    } finally {
      setSaving(null);
    }
  };

  const applyTemplate = async (industry: string) => {
    if (!orgId) return;
    setApplying(true);
    try {
      const res = await fetch(`${base}/modules/org/${orgId}/apply-template`, {
        method: "POST",
        headers,
        body: JSON.stringify({ industry }),
      });
      if (res.ok) {
        const rows: { module_id: string; is_enabled: boolean }[] = await res.json();
        setEnabledIds(rows.filter((r) => r.is_enabled).map((r) => r.module_id));
        setShowTemplates(false);
      }
    } finally {
      setApplying(false);
    }
  };

  const enabledCount = enabledIds ? [...enabledIds].filter((id) =>
    catalog.some((m) => m.id === id)
  ).length : catalog.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#001C2E] font-mono tracking-tight flex items-center gap-2">
            <LayoutGrid size={20} className="text-[#F05230]" />
            Module Catalog
          </h1>
          <p className="text-sm text-[#6A8A9A] mt-1">
            {enabledCount} of {catalog.length} modules enabled for your organisation.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E8E4DF] bg-white text-xs font-medium text-[#001C2E] hover:bg-[#FAFAF8] transition-colors"
          >
            <Sparkles size={13} className="text-[#F05230]" />
            Apply Template
            {showTemplates ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        </div>
      </div>

      {showTemplates && (
        <div className="p-4 rounded-xl border border-[#E8E4DF] bg-white">
          <p className="text-xs font-semibold text-[#001C2E] mb-3 font-mono uppercase tracking-wider">
            Industry Templates — applies recommended module set instantly
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind.id}
                onClick={() => applyTemplate(ind.id)}
                disabled={applying}
                className="px-3 py-2 rounded-lg border border-[#E8E4DF] text-xs font-medium text-[#001C2E] hover:border-[#F05230] hover:text-[#F05230] hover:bg-[#FEF0EB] transition-all disabled:opacity-50"
              >
                {applying ? <RefreshCw size={12} className="animate-spin mx-auto" /> : ind.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-all",
                category === cat
                  ? "bg-[#F05230] text-white"
                  : "bg-white border border-[#E8E4DF] text-[#6A8A9A] hover:border-[#F05230]/40 hover:text-[#001C2E]"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((mod) => {
          const isOn = enabledIds ? enabledIds.has(mod.id) : true;
          const isSaving = saving === mod.id;
          return (
            <div
              key={mod.id}
              onClick={() => !mod.is_core && handleToggle(mod)}
              className={cn(
                "group relative p-4 rounded-xl border transition-all",
                isOn
                  ? "border-[#F05230]/30 bg-[#FEF0EB]/30 hover:border-[#F05230]/50"
                  : "border-[#E8E4DF] bg-white hover:border-[#001C2E]/20",
                mod.is_core ? "opacity-80 cursor-default" : "cursor-pointer"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-[#001C2E]">{mod.label}</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-2xs font-mono uppercase tracking-wider",
                      CAT_COLOR[mod.category] ?? "bg-gray-100 text-gray-600"
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
                <div className="shrink-0">
                  {isSaving ? (
                    <RefreshCw size={18} className="text-[#F05230] animate-spin" />
                  ) : isOn ? (
                    <CheckCircle2 size={18} className="text-[#F05230]" />
                  ) : (
                    <Circle size={18} className="text-[#E8E4DF] group-hover:text-[#6A8A9A]" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-sm text-[#6A8A9A]">
            No modules match your search.
          </div>
        )}
      </div>
    </div>
  );
}
