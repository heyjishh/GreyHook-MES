"use client";

import { useState } from "react";
import {
  Truck,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Star,
  FileText,
  ChevronRight,
  Package,
  BarChart3,
  CircleDot,
} from "lucide-react";
import ReactECharts from "echarts-for-react";
import { cn } from "@/lib/utils";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

type SupplierRating = "A" | "B" | "C" | "D" | "suspended";
type ScarStatus = "open" | "submitted" | "under_review" | "closed" | "rejected";
type AqlResult = "accept" | "reject" | "conditional";

interface AqlInspection {
  id: string;
  date: string;
  poNo: string;
  itemCode: string;
  description: string;
  lotQty: number;
  sampleSize: number;
  defectsFound: number;
  aqlLevel: string;
  result: AqlResult;
  defectTypes: string[];
}

interface SCAR {
  id: string;
  raisedDate: string;
  description: string;
  status: ScarStatus;
  dueDate: string;
  rootCause?: string;
  ca?: string;
}

interface Supplier {
  id: string;
  code: string;
  name: string;
  category: string;
  rating: SupplierRating;
  overallScore: number;
  qualityScore: number;
  deliveryScore: number;
  responseScore: number;
  ppmLast12m: number;
  ppmTrend: "up" | "down" | "flat";
  lotsTested: number;
  lotsAccepted: number;
  openSCARs: number;
  country: string;
  contact: string;
  recentInspections: AqlInspection[];
  scars: SCAR[];
  monthlyPpm: number[];
}

const SUPPLIERS: Supplier[] = [
  {
    id: "SUP-001",
    code: "BSC",
    name: "Bharat Steel Corp",
    category: "Raw Material — Steel",
    rating: "A",
    overallScore: 94,
    qualityScore: 96,
    deliveryScore: 93,
    responseScore: 94,
    ppmLast12m: 320,
    ppmTrend: "down",
    lotsTested: 48,
    lotsAccepted: 47,
    openSCARs: 0,
    country: "India",
    contact: "rajesh.sharma@bharatsteel.com",
    monthlyPpm: [800, 650, 600, 500, 480, 420, 390, 350, 340, 330, 325, 320],
    recentInspections: [
      { id: "AQL-2026-0441", date: "2026-11-01", poNo: "PO-2026-0881", itemCode: "4140-BAR-42MM", description: "4140 Bar ø42mm", lotQty: 500, sampleSize: 50, defectsFound: 0, aqlLevel: "AQL 1.0 Level II", result: "accept", defectTypes: [] },
      { id: "AQL-2026-0409", date: "2026-10-10", poNo: "PO-2026-0810", itemCode: "EN8-BAR-32MM", description: "EN8 Bar ø32mm", lotQty: 300, sampleSize: 32, defectsFound: 1, aqlLevel: "AQL 1.0 Level II", result: "accept", defectTypes: ["Surface scratch — minor"] },
    ],
    scars: [],
  },
  {
    id: "SUP-002",
    code: "DCF",
    name: "Deccan Foundries",
    category: "Raw Material — Castings",
    rating: "C",
    overallScore: 61,
    qualityScore: 55,
    deliveryScore: 68,
    responseScore: 60,
    ppmLast12m: 8200,
    ppmTrend: "up",
    lotsTested: 32,
    lotsAccepted: 25,
    openSCARs: 2,
    country: "India",
    contact: "quality@deccanfoundries.in",
    monthlyPpm: [4000, 4200, 5000, 6000, 6800, 7200, 7800, 8000, 8100, 8200, 8200, 8200],
    recentInspections: [
      { id: "AQL-2026-0438", date: "2026-10-29", poNo: "PO-2026-0875", itemCode: "CAST-IRON-HUB", description: "Cast Iron Hub Blank", lotQty: 200, sampleSize: 32, defectsFound: 7, aqlLevel: "AQL 2.5 Level II", result: "reject", defectTypes: ["Porosity", "Dimensional — ID undersize", "Surface blow-hole"] },
      { id: "AQL-2026-0401", date: "2026-10-01", poNo: "PO-2026-0788", itemCode: "CAST-IRON-HUB", description: "Cast Iron Hub Blank", lotQty: 200, sampleSize: 32, defectsFound: 5, aqlLevel: "AQL 2.5 Level II", result: "reject", defectTypes: ["Porosity", "Dimensional — ID undersize"] },
    ],
    scars: [
      { id: "SCAR-2026-0041", raisedDate: "2026-10-30", description: "Repeated porosity & ID undersize in Cast Iron Hub Blank — 2 consecutive rejections", status: "submitted", dueDate: "2026-11-30", rootCause: "Mould sand permeability out of spec", ca: "Updated sand mix formula; added 100% CMM check on ID before despatch" },
      { id: "SCAR-2026-0029", raisedDate: "2026-09-05", description: "Blow-holes in Hub Blank batch — cosmetic+structural concern", status: "closed", dueDate: "2026-10-05", rootCause: "Venting inadequate on pattern tool", ca: "Reworked venting pattern; re-qualified mould" },
    ],
  },
  {
    id: "SUP-003",
    code: "ECL",
    name: "Eastern Castings Pvt Ltd",
    category: "Castings",
    rating: "B",
    overallScore: 78,
    qualityScore: 80,
    deliveryScore: 76,
    responseScore: 78,
    ppmLast12m: 2100,
    ppmTrend: "flat",
    lotsTested: 40,
    lotsAccepted: 38,
    openSCARs: 0,
    country: "India",
    contact: "qm@easterncastings.com",
    monthlyPpm: [2500, 2400, 2300, 2200, 2200, 2150, 2100, 2100, 2100, 2100, 2100, 2100],
    recentInspections: [
      { id: "AQL-2026-0439", date: "2026-10-30", poNo: "PO-2026-0877", itemCode: "DISC-RAW-700", description: "Raw Brake Disc Casting", lotQty: 150, sampleSize: 20, defectsFound: 1, aqlLevel: "AQL 2.5 Level II", result: "accept", defectTypes: ["Minor surface mark — accepted"] },
    ],
    scars: [],
  },
  {
    id: "SUP-004",
    code: "KEN",
    name: "Kennametal India",
    category: "Cutting Tools",
    rating: "A",
    overallScore: 97,
    qualityScore: 99,
    deliveryScore: 96,
    responseScore: 97,
    ppmLast12m: 0,
    ppmTrend: "flat",
    lotsTested: 60,
    lotsAccepted: 60,
    openSCARs: 0,
    country: "India",
    contact: "indiasupport@kennametal.com",
    monthlyPpm: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    recentInspections: [
      { id: "AQL-2026-0440", date: "2026-11-01", poNo: "PO-2026-0880", itemCode: "CNMG432-KMT", description: "CNMG Insert Set", lotQty: 50, sampleSize: 8, defectsFound: 0, aqlLevel: "AQL 1.0 Level II", result: "accept", defectTypes: [] },
    ],
    scars: [],
  },
];

const RATING_CONFIG: Record<SupplierRating, { label: string; color: string }> = {
  A:         { label: "A",         color: "bg-success/15 text-success border-success/25" },
  B:         { label: "B",         color: "bg-brand/10 text-brand border-brand/20" },
  C:         { label: "C",         color: "bg-warning/15 text-warning border-warning/25" },
  D:         { label: "D",         color: "bg-danger/15 text-danger border-danger/25" },
  suspended: { label: "Suspended", color: "bg-danger/15 text-danger border-danger/25" },
};

const SCAR_STATUS_CONFIG: Record<ScarStatus, { label: string; color: string }> = {
  open:         { label: "Open",         color: "text-danger bg-danger/10 border-danger/20" },
  submitted:    { label: "Submitted",    color: "text-brand bg-brand/10 border-brand/20" },
  under_review: { label: "Under Review", color: "text-warning bg-warning/10 border-warning/20" },
  closed:       { label: "Closed",       color: "text-success bg-success/10 border-success/20" },
  rejected:     { label: "Rejected",     color: "text-text-disabled bg-surface border-border" },
};

const AQL_COLOR: Record<AqlResult, string> = {
  accept:      "text-success bg-success/10 border-success/20",
  reject:      "text-danger bg-danger/10 border-danger/20",
  conditional: "text-warning bg-warning/10 border-warning/20",
};

function ScoreMeter({ value, label }: { value: number; label: string }) {
  const color = value >= 90 ? "text-success" : value >= 70 ? "text-warning" : "text-danger";
  return (
    <div className="p-2 rounded-lg bg-surface border border-border text-center">
      <div className={cn("font-heading text-lg font-bold", color)}>{value}</div>
      <div className="font-sans text-2xs text-text-disabled">{label}</div>
    </div>
  );
}

export default function SupplierQualityPage() {
  const [selectedId, setSelectedId] = useState<string>("SUP-001");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"inspections" | "scars">("inspections");

  const filtered = SUPPLIERS.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
  );

  const selected = SUPPLIERS.find((s) => s.id === selectedId) ?? SUPPLIERS[0];
  const RCfg = RATING_CONFIG[selected.rating];
  const acceptRate = selected.lotsTested > 0 ? Math.round((selected.lotsAccepted / selected.lotsTested) * 100) : 100;

  const ppmChartOpts = {
    animation: false,
    grid: { left: 32, right: 8, top: 8, bottom: 24 },
    xAxis: {
      type: "category" as const,
      data: ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
      axisLabel: { fontSize: 9, color: "#6B7E99" },
      axisLine: { lineStyle: { color: "#2A3A54" } },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: { fontSize: 9, color: "#6B7E99" },
      splitLine: { lineStyle: { color: "#1E2D45" } },
    },
    series: [{
      type: "line" as const,
      data: selected.monthlyPpm,
      smooth: true,
      symbol: "circle",
      symbolSize: 4,
      lineStyle: { color: selected.ppmLast12m > 3000 ? "#CC1800" : selected.ppmLast12m > 1000 ? "#A85E00" : "#1A7A40", width: 2 },
      itemStyle: { color: selected.ppmLast12m > 3000 ? "#CC1800" : selected.ppmLast12m > 1000 ? "#A85E00" : "#1A7A40" },
      areaStyle: { color: selected.ppmLast12m > 3000 ? "rgba(204,24,0,0.08)" : "rgba(26,122,64,0.08)" },
    }],
    tooltip: { trigger: "axis" as const, axisPointer: { type: "line" as const } },
  };

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <h1 className="font-heading text-lg font-bold text-text-primary">Supplier Quality</h1>
        <p className="font-sans text-xs text-text-secondary mt-0.5">
          Vendor scorecards · AQL incoming inspection · SCAR management
        </p>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Supplier list */}
        <div className="hidden md:flex flex-col w-64 shrink-0 border-r border-border">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-disabled" />
              <input
                className="w-full pl-7 pr-2 py-1.5 bg-surface border border-border rounded-lg font-sans text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand"
                placeholder="Search suppliers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {filtered.map((sup) => {
              const cfg = RATING_CONFIG[sup.rating];
              return (
                <button
                  key={sup.id}
                  onClick={() => setSelectedId(sup.id)}
                  className={cn(
                    "w-full text-left p-3 hover:bg-surface transition-colors",
                    selectedId === sup.id && "bg-brand/5"
                  )}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-mono text-xs font-bold text-text-primary">{sup.code}</span>
                    <div className="flex items-center gap-1.5">
                      {sup.openSCARs > 0 && (
                        <span className="w-4 h-4 rounded-full bg-danger text-white font-mono text-2xs flex items-center justify-center">
                          {sup.openSCARs}
                        </span>
                      )}
                      <span className={cn("px-1.5 py-0.5 rounded-sm text-2xs font-bold border", cfg.color)}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                  <p className="font-sans text-xs text-text-secondary truncate">{sup.name}</p>
                  <p className="font-mono text-2xs text-text-disabled truncate">{sup.category}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="font-mono text-2xs text-text-disabled">{sup.overallScore}/100</span>
                    <span className={cn(
                      "font-mono text-2xs flex items-center gap-0.5",
                      sup.ppmLast12m > 3000 ? "text-danger" : sup.ppmLast12m > 1000 ? "text-warning" : "text-success"
                    )}>
                      {sup.ppmTrend === "up" ? <TrendingUp size={9} /> : sup.ppmTrend === "down" ? <TrendingDown size={9} /> : null}
                      {sup.ppmLast12m.toLocaleString()} ppm
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 max-w-2xl space-y-4">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("px-2 py-0.5 rounded text-sm font-bold border", RCfg.color)}>
                  {RCfg.label}
                </span>
                <span className="font-mono text-xs text-text-disabled">{selected.code}</span>
                {selected.openSCARs > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-danger/10 border border-danger/20 text-danger">
                    <AlertTriangle size={10} />
                    {selected.openSCARs} Open SCAR{selected.openSCARs > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <h2 className="font-heading text-base font-bold text-text-primary">{selected.name}</h2>
              <p className="font-sans text-xs text-text-secondary">{selected.category} · {selected.country}</p>
              <p className="font-mono text-2xs text-text-disabled mt-0.5">{selected.contact}</p>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-4 gap-2">
              <ScoreMeter value={selected.overallScore} label="Overall" />
              <ScoreMeter value={selected.qualityScore} label="Quality" />
              <ScoreMeter value={selected.deliveryScore} label="Delivery" />
              <ScoreMeter value={selected.responseScore} label="Response" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-surface border border-border">
                <div className="font-mono text-2xs text-text-disabled">PPM (12m)</div>
                <div className={cn("font-heading text-sm font-bold", selected.ppmLast12m > 3000 ? "text-danger" : selected.ppmLast12m > 1000 ? "text-warning" : "text-success")}>
                  {selected.ppmLast12m.toLocaleString()}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-surface border border-border">
                <div className="font-mono text-2xs text-text-disabled">Lots Accepted</div>
                <div className="font-heading text-sm font-bold text-text-primary">{selected.lotsAccepted}/{selected.lotsTested}</div>
              </div>
              <div className="p-2 rounded-lg bg-surface border border-border">
                <div className="font-mono text-2xs text-text-disabled">Accept Rate</div>
                <div className={cn("font-heading text-sm font-bold", acceptRate >= 95 ? "text-success" : acceptRate >= 85 ? "text-warning" : "text-danger")}>
                  {acceptRate}%
                </div>
              </div>
            </div>

            {/* PPM trend */}
            <div className="p-3 rounded-lg bg-surface border border-border">
              <div className="font-sans text-2xs text-text-disabled uppercase tracking-widest mb-2">PPM Trend (12 months)</div>
              <ReactECharts option={ppmChartOpts} style={{ height: 80 }} />
            </div>

            {/* Tabs */}
            <div>
              <div className="flex border-b border-border mb-3">
                {(["inspections", "scars"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={cn(
                      "px-4 py-2 font-sans text-xs font-medium capitalize transition-colors",
                      activeTab === t ? "border-b-2 border-brand text-brand -mb-px" : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {t === "scars" ? `SCARs (${selected.scars.length})` : `AQL Inspections (${selected.recentInspections.length})`}
                  </button>
                ))}
              </div>

              {activeTab === "inspections" && (
                <div className="space-y-2">
                  {selected.recentInspections.map((ins) => (
                    <div key={ins.id} className="p-3 rounded-lg bg-surface border border-border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-text-primary">{ins.date}</span>
                        <span className={cn("px-2 py-0.5 rounded text-2xs border capitalize font-medium", AQL_COLOR[ins.result])}>
                          {ins.result.charAt(0).toUpperCase() + ins.result.slice(1)}
                        </span>
                      </div>
                      <p className="font-sans text-xs text-text-secondary">{ins.description}</p>
                      <div className="flex items-center gap-3 mt-1 font-mono text-2xs text-text-disabled">
                        <span>{ins.lotQty} pcs lot</span>
                        <span>n={ins.sampleSize}</span>
                        <span>defects={ins.defectsFound}</span>
                        <span>{ins.aqlLevel}</span>
                      </div>
                      {ins.defectTypes.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {ins.defectTypes.map((d, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-danger/10 border border-danger/20 font-sans text-2xs text-danger">
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="font-mono text-2xs text-text-disabled mt-1">PO: {ins.poNo} · {ins.id}</div>
                    </div>
                  ))}
                  {selected.recentInspections.length === 0 && (
                    <div className="text-center py-8 text-text-disabled font-sans text-xs">No inspection records.</div>
                  )}
                </div>
              )}

              {activeTab === "scars" && (
                <div className="space-y-2">
                  {selected.scars.map((scar) => {
                    const scfg = SCAR_STATUS_CONFIG[scar.status];
                    return (
                      <div key={scar.id} className="p-3 rounded-lg bg-surface border border-border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs font-bold text-text-primary">{scar.id}</span>
                          <span className={cn("px-2 py-0.5 rounded text-2xs border", scfg.color)}>{scfg.label}</span>
                        </div>
                        <p className="font-sans text-xs text-text-secondary">{scar.description}</p>
                        <div className="font-mono text-2xs text-text-disabled mt-0.5">Raised: {scar.raisedDate} · Due: {scar.dueDate}</div>
                        {scar.rootCause && (
                          <div className="mt-2 p-2 rounded bg-surface-elevated border border-border">
                            <div className="font-mono text-2xs text-text-disabled mb-0.5">Root Cause</div>
                            <div className="font-sans text-xs text-text-secondary">{scar.rootCause}</div>
                          </div>
                        )}
                        {scar.ca && (
                          <div className="mt-1 p-2 rounded bg-success/5 border border-success/20">
                            <div className="font-mono text-2xs text-text-disabled mb-0.5">Corrective Action</div>
                            <div className="font-sans text-xs text-text-secondary">{scar.ca}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {selected.scars.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle2 size={24} className="text-success mx-auto mb-2" />
                      <p className="font-sans text-xs text-text-secondary">No SCARs raised for this supplier.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
