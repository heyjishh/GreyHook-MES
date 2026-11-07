"use client";

import { useQuery } from "@tanstack/react-query";
import { factoriesApi, downtimeApi, oeeApi, productionApi, machinesApi } from "@/lib/api";
import {
  MOCK_FACTORY,
  MOCK_FACTORY_ID,
  MOCK_LINE,
  MOCK_LINE_ID,
  MOCK_MACHINE_STATUSES,
  MOCK_MACHINES,
  MOCK_OEE_7DAY,
  MOCK_MACHINE_OEE_HOURLY,
  MOCK_OEE_PER_MACHINE,
  MOCK_DOWNTIME_EVENTS,
  MOCK_PARETO,
  MOCK_CURRENT_PRODUCTION,
  MOCK_PRODUCTION_ORDERS,
} from "@/lib/mock-data";
import type {
  MachineStatusSchema,
  OEEAggregateSchema,
  OEESummarySchema,
  DowntimeEventSchema,
  ProductionOrderSchema,
  CurrentProductionSchema,
  ParetoCategorySchema,
  MachineSchema,
  FactorySchema,
} from "@/types/api";

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export function useFactory() {
  return useQuery<FactorySchema | undefined>({
    queryKey: ["factory", IS_MOCK],
    queryFn: async () => {
      if (IS_MOCK) return MOCK_FACTORY;
      const data = await factoriesApi.list();
      return data.items[0];
    },
    staleTime: 60_000,
  });
}

export function useFactoryLine() {
  const { data: factory } = useFactory();
  return useQuery({
    queryKey: ["factory-line", factory?.id, IS_MOCK],
    queryFn: async () => {
      if (IS_MOCK) return MOCK_LINE;
      const data = await factoriesApi.listLines(factory!.id);
      return data.items[0];
    },
    enabled: IS_MOCK || !!factory?.id,
    staleTime: 60_000,
  });
}

export function useMachineStatuses() {
  const { data: factory } = useFactory();
  return useQuery<{ items: MachineStatusSchema[]; as_of: string }>({
    queryKey: ["machine-statuses", factory?.id ?? MOCK_FACTORY_ID, IS_MOCK],
    queryFn: async () => {
      if (IS_MOCK) {
        return { items: MOCK_MACHINE_STATUSES, as_of: new Date().toISOString() };
      }
      return factoriesApi.getMachineStatuses(factory!.id);
    },
    enabled: IS_MOCK || !!factory?.id,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useFactoryMachines() {
  const { data: factory } = useFactory();
  return useQuery<MachineSchema[]>({
    queryKey: ["factory-machines", factory?.id ?? MOCK_FACTORY_ID, IS_MOCK],
    queryFn: async () => {
      if (IS_MOCK) return MOCK_MACHINES;
      const data = await factoriesApi.listMachines(factory!.id);
      return data.items;
    },
    enabled: IS_MOCK || !!factory?.id,
    staleTime: 60_000,
  });
}

export function useMachineStatus(machineId: string) {
  const mockStatus = MOCK_MACHINE_STATUSES.find((s) => s.machine_id === machineId);
  return useQuery<MachineStatusSchema>({
    queryKey: ["machine-status", machineId, IS_MOCK],
    queryFn: async () => {
      if (IS_MOCK && mockStatus) return mockStatus;
      return machinesApi.getStatus(machineId);
    },
    enabled: IS_MOCK || !!machineId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useMachineOEEHourly(machineId: string) {
  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString();

  return useQuery<OEEAggregateSchema[]>({
    queryKey: ["machine-oee-hourly", machineId, IS_MOCK],
    queryFn: async () => {
      if (IS_MOCK) return MOCK_MACHINE_OEE_HOURLY;
      const data = await oeeApi.getMachineOEE(machineId, { from, to, granularity: "hour" });
      return data.items;
    },
    enabled: IS_MOCK || !!machineId,
    staleTime: 30_000,
  });
}

export function useMachineDowntime(machineId: string) {
  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString();

  return useQuery<DowntimeEventSchema[]>({
    queryKey: ["machine-downtime", machineId, IS_MOCK],
    queryFn: async () => {
      if (IS_MOCK) return MOCK_DOWNTIME_EVENTS.filter((e) => e.machine_id === machineId).slice(0, 10);
      const data = await downtimeApi.listForMachine(machineId, { from, to });
      return data.items.slice(0, 10);
    },
    enabled: IS_MOCK || !!machineId,
    staleTime: 30_000,
  });
}

export function useCurrentProduction() {
  const { data: line } = useFactoryLine();
  return useQuery<CurrentProductionSchema | null>({
    queryKey: ["current-production", line?.id ?? MOCK_LINE_ID, IS_MOCK],
    queryFn: async () => {
      if (IS_MOCK) return MOCK_CURRENT_PRODUCTION;
      return productionApi.getCurrentProduction(line!.id);
    },
    enabled: IS_MOCK || !!line?.id,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useOEE7Day() {
  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: factory } = useFactory();
  const { data: machines } = useFactoryMachines();

  const firstMachineId = IS_MOCK ? MOCK_MACHINES[0].id : machines?.[0]?.id;

  return useQuery<OEEAggregateSchema[]>({
    queryKey: ["oee-7day", firstMachineId, IS_MOCK],
    queryFn: async () => {
      if (IS_MOCK) return MOCK_OEE_7DAY;
      if (!firstMachineId) return [];
      const data = await oeeApi.getMachineOEE(firstMachineId, { from, to, granularity: "day" });
      return data.items;
    },
    enabled: IS_MOCK || (!!factory?.id && !!firstMachineId),
    staleTime: 60_000,
  });
}

export function useOEEPerMachine() {
  return useQuery<Array<{ machine_id: string; name: string; oee: OEESummarySchema }>>({
    queryKey: ["oee-per-machine", IS_MOCK],
    queryFn: async () => {
      if (IS_MOCK) return MOCK_OEE_PER_MACHINE;
      return [];
    },
    staleTime: 60_000,
  });
}

export function useDowntimePareto() {
  const { data: line } = useFactoryLine();
  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now.setHours(0, 0, 0, 0)).toISOString();

  return useQuery<{ items: ParetoCategorySchema[]; total_duration_s: number }>({
    queryKey: ["downtime-pareto", line?.id ?? MOCK_LINE_ID, IS_MOCK],
    queryFn: async () => {
      if (IS_MOCK) {
        const total = MOCK_PARETO.reduce((s, p) => s + p.duration_s, 0);
        return { items: MOCK_PARETO, total_duration_s: total };
      }
      return downtimeApi.getPareto(line!.id, { from, to });
    },
    enabled: IS_MOCK || !!line?.id,
    staleTime: 30_000,
  });
}

export function useDowntimeEvents() {
  return useQuery<DowntimeEventSchema[]>({
    queryKey: ["downtime-events", IS_MOCK],
    queryFn: async () => {
      if (IS_MOCK) return MOCK_DOWNTIME_EVENTS;
      return [];
    },
    staleTime: 30_000,
  });
}

export function useProductionOrders() {
  const { data: line } = useFactoryLine();
  return useQuery<ProductionOrderSchema[]>({
    queryKey: ["production-orders", line?.id ?? MOCK_LINE_ID, IS_MOCK],
    queryFn: async () => {
      if (IS_MOCK) return MOCK_PRODUCTION_ORDERS;
      const data = await productionApi.listOrders(line!.id, { limit: 50 });
      return data.items;
    },
    enabled: IS_MOCK || !!line?.id,
    staleTime: 30_000,
  });
}
