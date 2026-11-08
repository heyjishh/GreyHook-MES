"use client";

import { useAuthStore } from "@/store/auth";
import { useIndustryStore } from "@/store/industry";
import { Building2, Globe, Hash, Calendar, Shield, CheckCircle2 } from "lucide-react";

const INDUSTRY_LABEL: Record<string, string> = {
  automotive: "Automotive",
  pharmaceutical: "Pharmaceutical",
  food_beverage: "Food & Beverage",
  electronics: "Electronics",
  textile: "Textile",
  aerospace: "Aerospace",
  chemical: "Chemical",
  plastics: "Plastics",
  generic: "Generic",
};

export default function BusinessPage() {
  const user = useAuthStore((s) => s.user);
  const { selectedIndustry } = useIndustryStore();

  const org = user as {
    organization_id?: string;
    organization_name?: string;
    email?: string;
    role?: string;
    created_at?: string;
  };

  const fields = [
    { icon: Building2, label: "Organisation Name", value: org?.organization_name ?? "—" },
    { icon: Hash,       label: "Organisation ID",   value: org?.organization_id ? org.organization_id.slice(0, 8) + "…" : "—" },
    { icon: Globe,      label: "Industry",          value: INDUSTRY_LABEL[selectedIndustry] ?? selectedIndustry },
    { icon: Shield,     label: "Admin User",        value: org?.email ?? "—" },
    { icon: Calendar,   label: "Account Created",   value: org?.created_at ? new Date(org.created_at).toLocaleDateString() : "—" },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#001C2E] font-mono tracking-tight flex items-center gap-2">
          <Building2 size={20} className="text-[#F05230]" />
          Business
        </h1>
        <p className="text-sm text-[#6A8A9A] mt-1">Your organisation profile and tenant settings.</p>
      </div>

      <div className="rounded-xl border border-[#E8E4DF] bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E8E4DF] bg-[#FAFAF8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F05230]/10 flex items-center justify-center">
              <Building2 size={20} className="text-[#F05230]" />
            </div>
            <div>
              <div className="font-semibold text-[#001C2E]">{org?.organization_name ?? "Your Organisation"}</div>
              <div className="text-xs text-[#6A8A9A]">Tenant profile</div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-[#E8E4DF]">
          {fields.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-4">
              <Icon size={15} className="text-[#6A8A9A] shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-[#6A8A9A]">{label}</div>
                <div className="text-sm font-medium text-[#001C2E] mt-0.5">{value}</div>
              </div>
              <CheckCircle2 size={14} className="text-[#1A7A40]" />
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-xl border border-[#E8E4DF] bg-[#FAFAF8]">
        <p className="text-xs text-[#6A8A9A]">
          To update organisation name, timezone, or industry classification, contact your GreyHook account manager or use the Setup Wizard to re-apply an industry template.
        </p>
      </div>
    </div>
  );
}
