"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const BUSINESS_UNITS = [
  { id: "manufacturing", label: "Manufacturing", emoji: "🏭", plantIds: ["plant-chennai", "plant-bangalore"] },
  { id: "life-sciences", label: "Life Sciences",  emoji: "💊", plantIds: ["plant-hyderabad"] },
  { id: "consumer",      label: "Consumer",        emoji: "🧵", plantIds: ["plant-pune"] },
] as const;

export type BusinessUnitId = typeof BUSINESS_UNITS[number]["id"];

interface FilterState {
  selectedPlants: string[];
  selectedBusiness: BusinessUnitId | "all";
  setPlants: (plants: string[]) => void;
  setBusiness: (bu: BusinessUnitId | "all") => void;
  togglePlant: (plantId: string) => void;
  clearFilters: () => void;
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      selectedPlants: [],
      selectedBusiness: "all",

      setPlants: (plants) => set({ selectedPlants: plants }),

      setBusiness: (bu) => {
        if (bu === "all") {
          set({ selectedBusiness: "all", selectedPlants: [] });
        } else {
          const unit = BUSINESS_UNITS.find((b) => b.id === bu);
          set({ selectedBusiness: bu, selectedPlants: unit ? [...unit.plantIds] : [] });
        }
      },

      togglePlant: (plantId) => {
        const { selectedPlants } = get();
        const next = selectedPlants.includes(plantId)
          ? selectedPlants.filter((p) => p !== plantId)
          : [...selectedPlants, plantId];
        set({ selectedPlants: next, selectedBusiness: "all" });
      },

      clearFilters: () => set({ selectedPlants: [], selectedBusiness: "all" }),
    }),
    { name: "greyhook-filter" }
  )
);
