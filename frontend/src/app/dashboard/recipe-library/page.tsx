"use client";

import { useState } from "react";
import { PLANTS } from "@/lib/enterprise-config";
import { BookOpen, Search, ArrowRight, CheckCircle2, Clock, Lock, Globe, Copy, Download } from "lucide-react";
import { cn } from "@/lib/utils";

function lcg(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

type RecipeStatus = "golden" | "approved" | "draft" | "deprecated";

interface Recipe {
  id: string;
  name: string;
  code: string;
  industry: string;
  plant: string;
  plantEmoji: string;
  plantColor: string;
  status: RecipeStatus;
  version: string;
  parameters: { name: string; value: string; unit: string }[];
  qualityYield: number;
  cycleTime: number;
  usedAt: string[];
  owner: string;
  lastUpdated: string;
  tags: string[];
}

const STATUS_CFG: Record<RecipeStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  golden:     { label: "Golden",     color: "#1A7A40", bg: "#E8F5EC", icon: CheckCircle2 },
  approved:   { label: "Approved",   color: "#0057CC", bg: "#E8F0FF", icon: CheckCircle2 },
  draft:      { label: "Draft",      color: "#A85E00", bg: "#FEF0D6", icon: Clock },
  deprecated: { label: "Deprecated", color: "#6A8A9A", bg: "#F4F0EC", icon: Lock },
};

const RECIPE_DATA: Recipe[] = (() => {
  const recipes: Recipe[] = [];
  const rng = lcg(42);

  const byIndustry: Record<string, { names: string[]; params: { name: string; unit: string }[][] }> = {
    Automotive: {
      names: ["Body Weld Cycle A", "Chassis Assembly M2", "Paint Bake Protocol", "Torque-Tighten Std"],
      params: [[{ name: "Weld Temp", unit: "°C" }, { name: "Dwell Time", unit: "s" }, { name: "Current", unit: "A" }]],
    },
    Pharmaceutical: {
      names: ["Tablet Compress V3", "Coating Solution GX", "Granulation Wet B", "Blending Std 50kg"],
      params: [[{ name: "Compression Force", unit: "kN" }, { name: "Speed", unit: "RPM" }, { name: "Temp", unit: "°C" }]],
    },
    Electronics: {
      names: ["SMT Reflow Profile", "Wave Solder Pb-free", "AOI Thresholds Rev4", "Conformal Coat R1"],
      params: [[{ name: "Peak Temp", unit: "°C" }, { name: "Conveyor Speed", unit: "cm/min" }, { name: "Pre-heat", unit: "°C" }]],
    },
    Textile: {
      names: ["Dye Bath Std Grey", "Loom Speed Config", "Finishing Calendering", "Yarn Tension Profile"],
      params: [[{ name: "Temp", unit: "°C" }, { name: "pH", unit: "" }, { name: "Duration", unit: "min" }]],
    },
  };

  PLANTS.forEach((plant, pi) => {
    const industryData = byIndustry[plant.industry];
    if (!industryData) return;
    industryData.names.forEach((name, ri) => {
      const statuses: RecipeStatus[] = ["golden", "approved", "draft", "deprecated"];
      const status = statuses[Math.floor(rng() * (ri === 0 ? 1 : 3))];
      const params = industryData.params[0].map(p => ({
        ...p,
        value: String(Math.round(rng() * 200 + 50)),
      }));
      const otherPlants = PLANTS.filter(p => p.id !== plant.id).map(p => p.name);
      const usedAt = [plant.name, ...(rng() > 0.5 ? [otherPlants[Math.floor(rng() * otherPlants.length)]] : [])];

      recipes.push({
        id: `rec-${pi}-${ri}`,
        name,
        code: `${plant.industry.substring(0,3).toUpperCase()}-${String(pi * 10 + ri + 1).padStart(3, "0")}`,
        industry: plant.industry,
        plant: plant.name,
        plantEmoji: plant.industryEmoji,
        plantColor: plant.industryColor,
        status,
        version: `v${Math.floor(rng() * 4) + 1}.${Math.floor(rng() * 9)}`,
        parameters: params,
        qualityYield: +(96 + rng() * 4).toFixed(1),
        cycleTime: Math.floor(rng() * 120 + 20),
        usedAt,
        owner: ["Dr. Priya S.", "Rajan M.", "Asha K.", "Vinod T."][Math.floor(rng() * 4)],
        lastUpdated: `2026-${String(Math.floor(rng() * 10) + 1).padStart(2, "0")}-${String(Math.floor(rng() * 28) + 1).padStart(2, "0")}`,
        tags: [plant.industry.toLowerCase(), status, ri < 2 ? "critical" : "standard"],
      });
    });
  });

  return recipes;
})();

function StatusChip({ status }: { status: RecipeStatus }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-2xs font-semibold"
          style={{ background: cfg.bg, color: cfg.color }}>
      <Icon size={9} />
      {cfg.label}
    </span>
  );
}

function RecipeCard({ recipe, onSelect }: { recipe: Recipe; onSelect: (r: Recipe) => void }) {
  return (
    <div className="bg-white border border-border rounded-xl p-4 flex flex-col gap-3 hover:shadow-card hover:border-brand/30 transition-all cursor-pointer"
         onClick={() => onSelect(recipe)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-2xs text-muted mb-0.5">{recipe.code}</div>
          <div className="font-heading text-sm font-bold text-text leading-tight">{recipe.name}</div>
        </div>
        <StatusChip status={recipe.status} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-base">{recipe.plantEmoji}</span>
        <span className="font-mono text-2xs text-muted">{recipe.plant.replace("Sunrise ","")}</span>
        <span className="font-mono text-2xs text-muted">·</span>
        <span className="font-mono text-2xs" style={{ color: recipe.plantColor }}>{recipe.industry}</span>
        <span className="font-mono text-2xs text-muted ml-auto">{recipe.version}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-bgSubtle rounded-lg p-2">
          <div className="font-mono text-2xs text-muted">Yield</div>
          <div className="font-heading text-sm font-bold text-text">{recipe.qualityYield}%</div>
        </div>
        <div className="bg-bgSubtle rounded-lg p-2">
          <div className="font-mono text-2xs text-muted">Cycle Time</div>
          <div className="font-heading text-sm font-bold text-text">{recipe.cycleTime}s</div>
        </div>
      </div>
      {recipe.usedAt.length > 1 && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-border">
          <Globe size={10} className="text-muted" />
          <span className="font-mono text-2xs text-muted">{recipe.usedAt.length} plants</span>
        </div>
      )}
    </div>
  );
}

function RecipeDetail({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  return (
    <div className="bg-white border border-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-2xs text-muted mb-0.5">{recipe.code} · {recipe.version}</div>
          <h2 className="font-heading text-lg font-bold text-text">{recipe.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip status={recipe.status} />
          <button onClick={onClose} className="font-mono text-2xs text-muted hover:text-text px-2 py-1 border border-border rounded-lg">
            ✕ Close
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Plant", value: recipe.plant.replace("Sunrise ", "") },
          { label: "Owner", value: recipe.owner },
          { label: "Quality Yield", value: `${recipe.qualityYield}%` },
          { label: "Cycle Time", value: `${recipe.cycleTime}s` },
        ].map(item => (
          <div key={item.label} className="bg-bgSubtle rounded-lg p-3">
            <div className="font-mono text-2xs text-muted mb-0.5">{item.label}</div>
            <div className="font-heading text-sm font-bold text-text">{item.value}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-heading text-xs font-bold text-text mb-2">Process Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {recipe.parameters.map((p, i) => (
            <div key={i} className="border border-border rounded-lg p-3">
              <div className="font-mono text-2xs text-muted">{p.name}</div>
              <div className="font-heading text-base font-bold text-text">{p.value}<span className="font-mono text-2xs text-muted ml-1">{p.unit}</span></div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-heading text-xs font-bold text-text mb-2">Deployed At</h3>
        <div className="flex flex-wrap gap-2">
          {recipe.usedAt.map(plant => {
            const p = PLANTS.find(pl => pl.name === plant);
            return (
              <span key={plant} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border font-mono text-2xs text-text">
                {p?.industryEmoji} {plant.replace("Sunrise ", "")}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {recipe.tags.map(tag => (
          <span key={tag} className="px-2 py-0.5 bg-bgMuted rounded font-mono text-2xs text-muted">#{tag}</span>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg font-mono text-2xs text-muted hover:text-text hover:border-brand transition-colors">
            <Copy size={11} /> Clone
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg font-mono text-2xs text-muted hover:text-text hover:border-brand transition-colors">
            <Download size={11} /> Export
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="font-mono text-2xs text-muted">Last updated: {recipe.lastUpdated}</span>
        <span className="font-mono text-2xs text-muted">Updated by: {recipe.owner}</span>
      </div>
    </div>
  );
}

export default function RecipeLibraryPage() {
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Recipe | null>(null);

  const industries = [...new Set(RECIPE_DATA.map(r => r.industry))];

  const filtered = RECIPE_DATA.filter(r =>
    (industryFilter === "all" || r.industry === industryFilter) &&
    (statusFilter === "all" || r.status === statusFilter) &&
    (!search || r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase()))
  );

  const golden = RECIPE_DATA.filter(r => r.status === "golden").length;
  const crossPlant = RECIPE_DATA.filter(r => r.usedAt.length > 1).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={16} className="text-brand" />
          <span className="font-mono text-2xs text-brand font-semibold uppercase tracking-widest">Enterprise</span>
        </div>
        <h1 className="font-heading text-2xl font-bold text-text">Global Recipe Library</h1>
        <p className="font-mono text-xs text-muted mt-0.5">Standardised process recipes shared across all plants</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Recipes", value: RECIPE_DATA.length, icon: BookOpen },
          { label: "Golden Standard", value: golden, icon: CheckCircle2 },
          { label: "Cross-Plant", value: crossPlant, icon: Globe },
          { label: "Industries", value: industries.length, icon: ArrowRight },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={12} className="text-muted" />
                <span className="font-mono text-2xs text-muted">{item.label}</span>
              </div>
              <div className="font-heading text-2xl font-bold text-text">{item.value}</div>
            </div>
          );
        })}
      </div>

      {selected && (
        <RecipeDetail recipe={selected} onClose={() => setSelected(null)} />
      )}

      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search recipes…"
              className="w-full pl-8 pr-3 py-2 bg-bgSubtle border border-border rounded-lg font-mono text-xs text-text placeholder:text-muted focus:outline-none focus:border-brand"
            />
          </div>
          <div className="flex items-center gap-1 bg-bgMuted rounded-lg p-1">
            <button onClick={() => setIndustryFilter("all")}
              className={cn("px-2.5 py-1 rounded-md font-mono text-2xs transition-all", industryFilter === "all" ? "bg-white text-text shadow-sm font-semibold" : "text-muted hover:text-text")}>
              All
            </button>
            {industries.map(ind => (
              <button key={ind} onClick={() => setIndustryFilter(ind)}
                className={cn("px-2.5 py-1 rounded-md font-mono text-2xs transition-all", industryFilter === ind ? "bg-white text-text shadow-sm font-semibold" : "text-muted hover:text-text")}>
                {ind}
              </button>
            ))}
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-2 py-1.5 bg-bgMuted border border-border rounded-lg font-mono text-2xs text-text focus:outline-none focus:border-brand">
            <option value="all">All status</option>
            <option value="golden">Golden</option>
            <option value="approved">Approved</option>
            <option value="draft">Draft</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} onSelect={setSelected} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 py-12 text-center font-mono text-xs text-muted">No recipes match</div>
          )}
        </div>
      </div>
    </div>
  );
}
