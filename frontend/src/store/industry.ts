import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { IndustryId } from "@/lib/industry-config";

interface IndustryState {
  selectedIndustry: IndustryId;
  setIndustry: (id: IndustryId) => void;
}

export const useIndustryStore = create<IndustryState>()(
  persist(
    (set) => ({
      selectedIndustry: "automotive",
      setIndustry: (id) => set({ selectedIndustry: id }),
    }),
    { name: "greyhook-industry" }
  )
);
