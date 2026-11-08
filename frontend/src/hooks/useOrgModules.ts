"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { useModulesStore } from "@/store/modules";

const STALE_MS = 5 * 60 * 1000;

export function useOrgModules() {
  const user = useAuthStore((s) => s.user);
  const { enabledIds, catalog, lastFetched, setEnabledIds, setCatalog, setLoading } =
    useModulesStore();

  useEffect(() => {
    if (!user) return;
    const isStale = !lastFetched || Date.now() - lastFetched > STALE_MS;
    if (!isStale && enabledIds !== null && catalog.length > 0) return;

    const orgId = (user as { organization_id?: string }).organization_id;
    if (!orgId) return;

    const token = useAuthStore.getState().token;

    setLoading(true);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

    Promise.all([
      fetch(`${base}/modules/catalog`, { headers }).then((r) => r.json()),
      fetch(`${base}/modules/org/${orgId}`, { headers }).then((r) => r.json()),
    ])
      .then(([catalogRes, orgRes]) => {
        if (catalogRes?.modules) setCatalog(catalogRes.modules);
        if (Array.isArray(orgRes)) {
          const enabled = orgRes
            .filter((m: { is_enabled: boolean }) => m.is_enabled)
            .map((m: { module_id: string }) => m.module_id);
          setEnabledIds(enabled);
        } else {
          if (catalogRes?.modules) {
            setEnabledIds(catalogRes.modules.map((m: { id: string }) => m.id));
          }
        }
      })
      .catch(() => {
        if (catalog.length > 0) {
          setEnabledIds(catalog.map((m) => m.id));
        }
      })
      .finally(() => setLoading(false));
  }, [user?.id]);
}
