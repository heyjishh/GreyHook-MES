"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useModulesStore } from "@/store/modules";
import {
  Building2, Factory, Sparkles, CheckCircle2, ArrowRight,
  ChevronRight, ChevronLeft, Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const INDUSTRIES = [
  { id: "automotive",    emoji: "🚗", label: "Automotive",      desc: "Assembly lines, ANDON, supplier quality, genealogy" },
  { id: "pharmaceutical",emoji: "💊", label: "Pharmaceutical",  desc: "EBR, golden batch, CAPA, 21 CFR Part 11 compliance" },
  { id: "food_beverage", emoji: "🧃", label: "Food & Beverage", desc: "Recipe management, yield, batch records, HACCP" },
  { id: "electronics",   emoji: "🔌", label: "Electronics",     desc: "Traceability, genealogy, SPC, line balance" },
  { id: "textile",       emoji: "🧵", label: "Textile",         desc: "ANDON, line balance, energy, labor management" },
  { id: "aerospace",     emoji: "✈️", label: "Aerospace",       desc: "Calibration, tooling, supplier quality, compliance" },
  { id: "chemical",      emoji: "⚗️", label: "Chemical",        desc: "Recipe, EBR, yield, process SPC, compliance" },
  { id: "plastics",      emoji: "🧴", label: "Plastics",        desc: "Tooling, energy, yield, SPC, ANDON" },
  { id: "generic",       emoji: "🏭", label: "Generic",         desc: "Standard MES modules for any factory" },
];

const STEPS = ["Industry", "Business", "Modules"] as const;

export default function SetupPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { setEnabledIds } = useModulesStore();

  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState("");
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);

  const orgId = (user as { organization_id?: string })?.organization_id;
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const applyAndFinish = async () => {
    if (!orgId || !industry) return;
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
        setDone(true);
        setTimeout(() => router.push("/admin/modules"), 1800);
      }
    } finally {
      setApplying(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-full bg-[#1A7A40]/10 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-[#1A7A40]" />
        </div>
        <h2 className="text-xl font-bold text-[#001C2E] font-mono">Setup Complete</h2>
        <p className="text-sm text-[#6A8A9A]">Redirecting to Module Manager…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[#001C2E] font-mono tracking-tight flex items-center gap-2">
          <Sparkles size={20} className="text-[#F05230]" />
          Setup Wizard
        </h1>
        <p className="text-sm text-[#6A8A9A] mt-1">Configure your factory in 3 steps.</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all",
              i < step  ? "bg-[#1A7A40] text-white" :
              i === step? "bg-[#F05230] text-white" :
                          "bg-[#E8E4DF] text-[#6A8A9A]"
            )}>
              {i < step ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span className={cn("text-xs font-medium", i === step ? "text-[#001C2E]" : "text-[#6A8A9A]")}>{s}</span>
            {i < STEPS.length - 1 && <ChevronRight size={14} className="text-[#E8E4DF]" />}
          </div>
        ))}
      </div>

      {/* Step 0 — Industry */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-[#001C2E]">Select your industry</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind.id}
                onClick={() => setIndustry(ind.id)}
                className={cn(
                  "text-left p-4 rounded-xl border transition-all",
                  industry === ind.id
                    ? "border-[#F05230] bg-[#FEF0EB]/40 ring-2 ring-[#F05230]/20"
                    : "border-[#E8E4DF] bg-white hover:border-[#F05230]/40"
                )}
              >
                <div className="text-2xl mb-1">{ind.emoji}</div>
                <div className="font-semibold text-sm text-[#001C2E]">{ind.label}</div>
                <div className="text-xs text-[#6A8A9A] mt-0.5 leading-relaxed">{ind.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setStep(1)}
              disabled={!industry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F05230] text-white text-sm font-semibold hover:bg-[#d94720] disabled:opacity-40 transition-colors"
            >
              Next <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 1 — Business */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-[#001C2E]">Your business details</h2>
          <div className="p-5 rounded-xl border border-[#E8E4DF] bg-white space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#FAFAF8]">
              <Building2 size={18} className="text-[#F05230]" />
              <div>
                <div className="text-xs text-[#6A8A9A]">Organisation</div>
                <div className="text-sm font-semibold text-[#001C2E]">
                  {(user as { organization_name?: string })?.organization_name ?? "Your Organisation"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#FAFAF8]">
              <Sparkles size={18} className="text-[#F05230]" />
              <div>
                <div className="text-xs text-[#6A8A9A]">Selected Industry</div>
                <div className="text-sm font-semibold text-[#001C2E] capitalize">
                  {industry.replace("_", " & ")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#FAFAF8]">
              <Factory size={18} className="text-[#F05230]" />
              <div>
                <div className="text-xs text-[#6A8A9A]">Plants & Lines</div>
                <div className="text-xs text-[#6A8A9A] mt-0.5">Configure plants and production lines in <strong>Admin → Plants</strong></div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#FAFAF8]">
              <Cpu size={18} className="text-[#F05230]" />
              <div>
                <div className="text-xs text-[#6A8A9A]">Machines</div>
                <div className="text-xs text-[#6A8A9A] mt-0.5">Add machines in <strong>Admin → Machines</strong></div>
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(0)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm text-[#6A8A9A] hover:bg-[#FAFAF8]">
              <ChevronLeft size={14} /> Back
            </button>
            <button onClick={() => setStep(2)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F05230] text-white text-sm font-semibold hover:bg-[#d94720]">
              Next <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Modules */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-[#001C2E]">Apply industry module template</h2>
          <div className="p-5 rounded-xl border border-[#E8E4DF] bg-white">
            <p className="text-sm text-[#6A8A9A] mb-3">
              This will enable the recommended module set for <strong className="text-[#001C2E] capitalize">{industry.replace("_", " & ")}</strong> factories.
              You can customise individual modules afterwards.
            </p>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#FEF0EB]/30 border border-[#F05230]/20">
              <Sparkles size={14} className="text-[#F05230] shrink-0" />
              <span className="text-xs text-[#001C2E]">AI-recommended modules based on your industry will be pre-activated.</span>
            </div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E8E4DF] text-sm text-[#6A8A9A] hover:bg-[#FAFAF8]">
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={applyAndFinish}
              disabled={applying}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F05230] text-white text-sm font-semibold hover:bg-[#d94720] disabled:opacity-50"
            >
              {applying ? "Applying…" : "Apply & Finish"}
              <CheckCircle2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
