"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Building2, Factory, SlidersHorizontal } from "lucide-react";
import { useFilterStore, BUSINESS_UNITS, type BusinessUnitId } from "@/store/filter";
import { PLANTS } from "@/lib/enterprise-config";
import { cn } from "@/lib/utils";

export function GlobalFilterBar() {
  const { selectedPlants, selectedBusiness, setBusiness, togglePlant, clearFilters } = useFilterStore();
  const [plantOpen, setPlantOpen] = useState(false);
  const plantRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (plantRef.current && !plantRef.current.contains(e.target as Node)) {
        setPlantOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasFilters = selectedBusiness !== "all" || selectedPlants.length > 0;

  const activePlantLabels = selectedPlants.map((id) => {
    const p = PLANTS.find((pl) => pl.id === id);
    return p ? p.name.replace("Sunrise ", "") : id;
  });

  return (
    <div className="flex items-center gap-2 px-4 md:px-6 py-2 bg-bg-subtle border-b border-border shrink-0 overflow-x-auto">
      <div className="flex items-center gap-1 shrink-0">
        <SlidersHorizontal size={11} className="text-text-disabled" />
        <span className="font-mono text-2xs text-text-disabled uppercase tracking-widest">Filter:</span>
      </div>

      {/* Business unit tabs */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setBusiness("all")}
          className={cn(
            "px-2.5 py-1 rounded-full font-mono text-2xs font-semibold transition-all",
            selectedBusiness === "all"
              ? "bg-text-primary text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-muted"
          )}
        >
          All
        </button>
        {BUSINESS_UNITS.map((bu) => (
          <button
            key={bu.id}
            onClick={() => setBusiness(bu.id as BusinessUnitId)}
            className={cn(
              "px-2.5 py-1 rounded-full font-mono text-2xs font-semibold transition-all whitespace-nowrap",
              selectedBusiness === bu.id
                ? "bg-brand text-white"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-muted"
            )}
          >
            {bu.emoji} {bu.label}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-border shrink-0" />

      {/* Plant multi-select */}
      <div ref={plantRef} className="relative shrink-0">
        <button
          onClick={() => setPlantOpen((o) => !o)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-2xs font-semibold border transition-all",
            selectedPlants.length > 0
              ? "bg-brand/10 text-brand border-brand/30"
              : "text-text-secondary border-border hover:border-text-disabled"
          )}
        >
          <Factory size={10} />
          {selectedPlants.length === 0
            ? "All Plants"
            : selectedPlants.length === 1
            ? activePlantLabels[0]
            : `${selectedPlants.length} Plants`}
          <ChevronDown size={10} className={cn("transition-transform", plantOpen && "rotate-180")} />
        </button>

        {plantOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl border border-border shadow-lg p-2 min-w-[220px]">
            <p className="font-mono text-2xs text-text-disabled uppercase tracking-widest px-2 pb-1.5">Select Plants</p>
            {PLANTS.map((plant) => {
              const checked = selectedPlants.includes(plant.id);
              return (
                <button
                  key={plant.id}
                  onClick={() => togglePlant(plant.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors",
                    checked ? "bg-brand/8" : "hover:bg-bg-subtle"
                  )}
                >
                  <div className={cn(
                    "w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                    checked ? "border-brand bg-brand" : "border-border"
                  )}>
                    {checked && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
                  </div>
                  <span className="font-mono text-xs" style={{ color: plant.industryColor }}>{plant.industryEmoji}</span>
                  <div>
                    <p className="font-sans text-xs font-medium text-text-primary leading-none">{plant.name.replace("Sunrise ", "")}</p>
                    <p className="font-mono text-2xs text-text-disabled">{plant.location}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <>
          <div className="w-px h-4 bg-border shrink-0" />
          <div className="flex items-center gap-1 overflow-x-auto">
            {selectedBusiness !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand/10 text-brand font-mono text-2xs font-semibold whitespace-nowrap">
                <Building2 size={9} />
                {BUSINESS_UNITS.find((b) => b.id === selectedBusiness)?.label}
                <button onClick={() => setBusiness("all")} className="hover:opacity-70 ml-0.5"><X size={9} /></button>
              </span>
            )}
            {selectedPlants.length > 0 && selectedBusiness === "all" && activePlantLabels.map((label, i) => (
              <span key={selectedPlants[i]} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg-muted text-text-secondary font-mono text-2xs whitespace-nowrap">
                {label}
                <button onClick={() => togglePlant(selectedPlants[i])} className="hover:opacity-70 ml-0.5"><X size={9} /></button>
              </span>
            ))}
            <button
              onClick={clearFilters}
              className="font-mono text-2xs text-text-disabled hover:text-danger transition-colors px-1 whitespace-nowrap"
            >
              Clear all
            </button>
          </div>
        </>
      )}
    </div>
  );
}
