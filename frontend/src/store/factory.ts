import { create } from "zustand";

interface FactoryState {
  selectedFactoryId: string | null;
  selectedLineId: string | null;
  setFactory: (factoryId: string | null) => void;
  setLine: (lineId: string | null) => void;
}

export const useFactoryStore = create<FactoryState>((set) => ({
  selectedFactoryId: null,
  selectedLineId: null,

  setFactory: (factoryId) =>
    set({ selectedFactoryId: factoryId, selectedLineId: null }),

  setLine: (lineId) => set({ selectedLineId: lineId }),
}));
