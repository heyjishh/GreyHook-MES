"use client";

import Link from "next/link";
import { Cable, ArrowUpRight, CheckCircle2, XCircle, Clock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const SAP_MODULES = [
  { id: "PP", label: "Production Planning (PP)",   dir: "ERP → MES",    desc: "Production orders, confirmations" },
  { id: "MM", label: "Materials Management (MM)",  dir: "Bidirectional", desc: "Stock levels, GI/GR, BOM write-back" },
  { id: "QM", label: "Quality Management (QM)",    dir: "Bidirectional", desc: "Inspection lots, defect push-back" },
  { id: "PM", label: "Plant Maintenance (PM)",     dir: "Bidirectional", desc: "Maintenance orders, fault notifications" },
  { id: "SD", label: "Sales & Distribution (SD)",  dir: "ERP → MES",    desc: "Sales orders, delivery schedules" },
];

const ORACLE_MODULES = [
  { id: "MFG", label: "Manufacturing Cloud",   dir: "Bidirectional", desc: "Production jobs, completions" },
  { id: "WMS", label: "Warehouse Mgmt (WMS)",  dir: "Bidirectional", desc: "Inventory, transactions" },
  { id: "QA",  label: "Quality Management",    dir: "Bidirectional", desc: "Inspection results" },
];

export default function ERPConnectorsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#001C2E] font-mono tracking-tight flex items-center gap-2">
            <Cable size={20} className="text-[#F05230]" />
            ERP Connectors
          </h1>
          <p className="text-sm text-[#6A8A9A] mt-1">Manage SAP S/4HANA and Oracle Cloud integration connectors.</p>
        </div>
        <Link
          href="/dashboard/erp-sync"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E8E4DF] text-xs font-medium text-[#001C2E] hover:border-[#F05230]/40 hover:text-[#F05230] bg-white"
        >
          <ArrowUpRight size={13} />
          Open ERP Hub
        </Link>
      </div>

      {/* SAP */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded bg-[#007DB8] flex items-center justify-center">
            <span className="text-white font-bold text-2xs">S</span>
          </div>
          <h2 className="text-sm font-bold text-[#001C2E] font-mono">SAP S/4HANA</h2>
          <span className="px-2 py-0.5 rounded-full text-2xs bg-[#E8E4DF] text-[#6A8A9A] font-mono">OData v4</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {SAP_MODULES.map((m) => (
            <div key={m.id} className="p-4 rounded-xl border border-[#E8E4DF] bg-white hover:border-[#007DB8]/30 transition-all">
              <div className="flex items-start justify-between mb-2">
                <span className="font-mono text-xs font-bold text-[#007DB8] bg-[#007DB8]/10 px-2 py-0.5 rounded">{m.id}</span>
                <span className={cn(
                  "text-2xs px-1.5 py-0.5 rounded font-mono",
                  m.dir === "Bidirectional" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                )}>{m.dir}</span>
              </div>
              <div className="font-medium text-sm text-[#001C2E] mb-1">{m.label}</div>
              <div className="text-xs text-[#6A8A9A]">{m.desc}</div>
            </div>
          ))}
          <Link
            href="/dashboard/erp-sync"
            className="p-4 rounded-xl border border-dashed border-[#E8E4DF] hover:border-[#F05230] hover:bg-[#FEF0EB]/20 transition-all flex flex-col items-center justify-center gap-2 text-[#6A8A9A] hover:text-[#F05230] min-h-[100px]"
          >
            <Plus size={18} />
            <span className="text-xs font-medium">Add SAP Connector</span>
          </Link>
        </div>
      </div>

      {/* Oracle */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded bg-[#C74634] flex items-center justify-center">
            <span className="text-white font-bold text-2xs">O</span>
          </div>
          <h2 className="text-sm font-bold text-[#001C2E] font-mono">Oracle ERP Cloud</h2>
          <span className="px-2 py-0.5 rounded-full text-2xs bg-[#E8E4DF] text-[#6A8A9A] font-mono">REST v2</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {ORACLE_MODULES.map((m) => (
            <div key={m.id} className="p-4 rounded-xl border border-[#E8E4DF] bg-white hover:border-[#C74634]/30 transition-all">
              <div className="flex items-start justify-between mb-2">
                <span className="font-mono text-xs font-bold text-[#C74634] bg-[#C74634]/10 px-2 py-0.5 rounded">{m.id}</span>
                <span className="text-2xs px-1.5 py-0.5 rounded font-mono bg-purple-100 text-purple-700">{m.dir}</span>
              </div>
              <div className="font-medium text-sm text-[#001C2E] mb-1">{m.label}</div>
              <div className="text-xs text-[#6A8A9A]">{m.desc}</div>
            </div>
          ))}
          <Link
            href="/dashboard/erp-sync"
            className="p-4 rounded-xl border border-dashed border-[#E8E4DF] hover:border-[#F05230] hover:bg-[#FEF0EB]/20 transition-all flex flex-col items-center justify-center gap-2 text-[#6A8A9A] hover:text-[#F05230] min-h-[100px]"
          >
            <Plus size={18} />
            <span className="text-xs font-medium">Add Oracle Connector</span>
          </Link>
        </div>
      </div>

      {/* Config pointer */}
      <div className="p-4 rounded-xl border border-[#E8E4DF] bg-[#FAFAF8] flex items-center gap-4">
        <Cable size={18} className="text-[#F05230] shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-[#001C2E] mb-0.5">Manage connector credentials & sync schedules</div>
          <div className="text-xs text-[#6A8A9A]">Credentials, sync intervals, module toggles and health logs are managed from the ERP Integration Hub.</div>
        </div>
        <Link
          href="/dashboard/erp-sync"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F05230] text-white text-xs font-semibold hover:bg-[#d94720] shrink-0"
        >
          Open Hub <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>
  );
}
