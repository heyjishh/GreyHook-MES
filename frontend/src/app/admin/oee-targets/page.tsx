"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { Target, RefreshCw, Save, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface OEETarget {
  id: string;
  name: string;
  code: string;
  type: "line" | "machine";
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

function clamp(v: number) { return Math.max(0, Math.min(100, v)); }
function oee(a: number, p: number, q: number) { return Math.round(a * p * q / 10000); }

const DEFAULT_TARGETS: OEETarget[] = [
  { id: "default-automotive",    name: "Assembly Line (Automotive)",  code: "AL-01", type: "line",    availability: 90, performance: 85, quality: 99, oee: oee(90,85,99) },
  { id: "default-pharma",        name: "Fill & Finish (Pharma)",      code: "FF-01", type: "line",    availability: 95, performance: 90, quality: 99, oee: oee(95,90,99) },
  { id: "default-cnc",           name: "CNC Machining Cell",          code: "CNC-1", type: "machine", availability: 88, performance: 82, quality: 98, oee: oee(88,82,98) },
  { id: "default-packaging",     name: "Packaging Line",              code: "PKG-1", type: "line",    availability: 92, performance: 88, quality: 99, oee: oee(92,88,99) },
];

export default function OEETargetsPage() {
  const token = useAuthStore((s) => s.token);
  const [targets, setTargets] = useState<OEETarget[]>(DEFAULT_TARGETS);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const handleChange = (id: string, field: "availability" | "performance" | "quality", raw: string) => {
    const val = clamp(parseFloat(raw) || 0);
    setTargets((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, [field]: val };
        next.oee = oee(next.availability, next.performance, next.quality);
        return next;
      })
    );
  };

  const handleSave = async (id: string) => {
    setSaving(id);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(null);
    setSaved(id);
    setTimeout(() => setSaved(null), 2000);
  };

  const oeeColor = (v: number) =>
    v >= 85 ? "text-[#1A7A40]" : v >= 65 ? "text-[#A85E00]" : "text-[#CC1800]";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#001C2E] font-mono tracking-tight flex items-center gap-2">
          <Target size={20} className="text-[#F05230]" />
          OEE Targets
        </h1>
        <p className="text-sm text-[#6A8A9A] mt-1">
          Configure availability, performance and quality targets per production line or machine.
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50">
        <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          OEE = Availability × Performance × Quality. World-class OEE is considered 85%+.
          These targets drive the OEE dashboard colour coding and alert triggers.
        </p>
      </div>

      <div className="space-y-3">
        {targets.map((t) => (
          <div key={t.id} className="p-5 rounded-xl border border-[#E8E4DF] bg-white">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm text-[#001C2E]">{t.name}</span>
                  <span className="font-mono text-2xs px-1.5 py-0.5 rounded bg-[#F05230]/10 text-[#F05230]">{t.code}</span>
                  <span className={cn(
                    "text-2xs px-1.5 py-0.5 rounded font-mono capitalize",
                    t.type === "line" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                  )}>{t.type}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-[#6A8A9A]">OEE Target:</span>
                  <span className={cn("text-sm font-bold font-mono", oeeColor(t.oee))}>{t.oee}%</span>
                </div>
              </div>
              <button
                onClick={() => handleSave(t.id)}
                disabled={!!saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#001C2E] text-white text-xs font-semibold hover:bg-[#002d47] disabled:opacity-50 transition-colors"
              >
                {saving === t.id ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : saved === t.id ? (
                  <CheckCircle2 size={12} className="text-[#1A7A40]" />
                ) : (
                  <Save size={12} />
                )}
                {saved === t.id ? "Saved!" : "Save"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(["availability", "performance", "quality"] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-[#001C2E] mb-2 capitalize">{field} (%)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={t[field]}
                      onChange={(e) => handleChange(t.id, field, e.target.value)}
                      className="flex-1 accent-[#F05230]"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={t[field]}
                      onChange={(e) => handleChange(t.id, field, e.target.value)}
                      className="w-14 px-2 py-1 rounded-lg border border-[#E8E4DF] text-sm text-center font-mono text-[#001C2E] focus:outline-none focus:ring-2 focus:ring-[#F05230]/20 focus:border-[#F05230]"
                    />
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-[#E8E4DF] overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", t[field] >= 90 ? "bg-[#1A7A40]" : t[field] >= 70 ? "bg-[#A85E00]" : "bg-[#CC1800]")}
                      style={{ width: `${t[field]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setTargets((prev) => [...prev, {
          id: `custom-${Date.now()}`,
          name: "New Target",
          code: "NEW-1",
          type: "line",
          availability: 90,
          performance: 85,
          quality: 99,
          oee: oee(90, 85, 99),
        }])}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[#E8E4DF] text-sm text-[#6A8A9A] hover:border-[#F05230] hover:text-[#F05230] hover:bg-[#FEF0EB]/20 transition-all"
      >
        + Add Target
      </button>
    </div>
  );
}
