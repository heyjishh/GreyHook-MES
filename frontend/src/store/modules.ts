"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ModuleDef {
  id: string;
  label: string;
  description: string;
  icon: string;
  path: string;
  category: string;
  section: string | null;
  is_core: boolean;
  industries: string[];
}

interface ModulesState {
  enabledIds: Set<string> | null;
  catalog: ModuleDef[];
  loading: boolean;
  lastFetched: number | null;
  setEnabledIds: (ids: string[]) => void;
  setCatalog: (mods: ModuleDef[]) => void;
  setLoading: (v: boolean) => void;
  toggle: (id: string, enabled: boolean) => void;
  isEnabled: (id: string) => boolean;
}

export const useModulesStore = create<ModulesState>()(
  persist(
    (set, get) => ({
      enabledIds: null,
      catalog: [],
      loading: false,
      lastFetched: null,

      setEnabledIds: (ids) =>
        set({ enabledIds: new Set(ids), lastFetched: Date.now() }),

      setCatalog: (mods) => set({ catalog: mods }),

      setLoading: (v) => set({ loading: v }),

      toggle: (id, enabled) =>
        set((s) => {
          const next = new Set(s.enabledIds ?? []);
          enabled ? next.add(id) : next.delete(id);
          return { enabledIds: next };
        }),

      isEnabled: (id) => {
        const { enabledIds } = get();
        if (enabledIds === null) return true;
        return enabledIds.has(id);
      },
    }),
    {
      name: "greyhook-modules",
      partialize: (s) => ({
        enabledIds: s.enabledIds ? [...s.enabledIds] : null,
        catalog: s.catalog,
        lastFetched: s.lastFetched,
      }),
      merge: (persisted: unknown, current) => {
        const p = persisted as { enabledIds?: string[] | null; catalog?: ModuleDef[]; lastFetched?: number };
        return {
          ...current,
          enabledIds: p?.enabledIds ? new Set(p.enabledIds) : null,
          catalog: p?.catalog ?? [],
          lastFetched: p?.lastFetched ?? null,
        };
      },
    }
  )
);
