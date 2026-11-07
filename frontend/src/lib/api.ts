import {
  ApiErrorException,
  type AIInvestigationSchema,
  type CurrentProductionSchema,
  type DowntimeEventSchema,
  type FactorySchema,
  type MachineEventSchema,
  type MachineSchema,
  type MachineStatusSchema,
  type OEEAggregateSchema,
  type OEESummarySchema,
  type PaginatedResponse,
  type ParetoCategorySchema,
  type ProductDefinitionSchema,
  type ProductionLineSchema,
  type ProductionOrderSchema,
  type ProductionSummarySchema,
  type ShiftSchema,
  type UserRole,
  type UserSchema,
} from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("auth_token");
}

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  noAuth?: boolean;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, noAuth = false } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (!noAuth) {
    const token = getToken();
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorCode = "INTERNAL_ERROR";
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorBody = (await response.json()) as {
        error?: { code?: string; message?: string };
      };
      errorCode = errorBody.error?.code ?? errorCode;
      errorMessage = errorBody.error?.message ?? errorMessage;
    } catch {
    }
    throw new ApiErrorException({
      code: errorCode,
      message: errorMessage,
      status: response.status,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
      user: UserSchema;
    }>("/auth/login", { method: "POST", body: { email, password }, noAuth: true }),

  refresh: (refresh_token: string) =>
    apiFetch<{ access_token: string; expires_in: number }>("/auth/refresh", {
      method: "POST",
      body: { refresh_token },
      noAuth: true,
    }),

  logout: (refresh_token: string) =>
    apiFetch<{ ok: boolean }>("/auth/logout", {
      method: "POST",
      body: { refresh_token },
    }),

  me: () => apiFetch<UserSchema>("/users/me"),
};

export const factoriesApi = {
  list: () => apiFetch<{ items: FactorySchema[]; total: number }>("/factories"),

  get: (factoryId: string) => apiFetch<FactorySchema>(`/factories/${factoryId}`),

  create: (data: { name: string; location: string }) =>
    apiFetch<FactorySchema>("/factories", { method: "POST", body: data }),

  update: (factoryId: string, data: { name: string; location: string }) =>
    apiFetch<FactorySchema>(`/factories/${factoryId}`, {
      method: "PUT",
      body: data,
    }),

  listLines: (factoryId: string) =>
    apiFetch<{ items: ProductionLineSchema[]; total: number }>(
      `/factories/${factoryId}/lines`
    ),

  listMachines: (factoryId: string) =>
    apiFetch<{ items: MachineSchema[]; total: number }>(
      `/factories/${factoryId}/machines`
    ),

  getMachineStatuses: (factoryId: string) =>
    apiFetch<{ items: MachineStatusSchema[]; as_of: string }>(
      `/factories/${factoryId}/machines/status`
    ),

  listShifts: (factoryId: string) =>
    apiFetch<{ items: ShiftSchema[]; total: number }>(
      `/factories/${factoryId}/shifts`
    ),

  createShift: (
    factoryId: string,
    data: Omit<ShiftSchema, "id" | "organization_id" | "factory_id" | "planned_production_time_minutes">
  ) =>
    apiFetch<ShiftSchema>(`/factories/${factoryId}/shifts`, {
      method: "POST",
      body: data,
    }),
};

export const machinesApi = {
  createForLine: (
    lineId: string,
    data: {
      name: string;
      machine_type: string;
      protocol?: string;
      asset_tag?: string;
      endpoint_config?: Record<string, unknown>;
      default_product_id?: string | null;
    }
  ) =>
    apiFetch<MachineSchema>(`/lines/${lineId}/machines`, {
      method: "POST",
      body: data,
    }),

  update: (
    machineId: string,
    data: {
      name?: string;
      machine_type?: string;
      asset_tag?: string;
      endpoint_config?: Record<string, unknown>;
      default_product_id?: string | null;
    }
  ) =>
    apiFetch<MachineSchema>(`/machines/${machineId}`, {
      method: "PATCH",
      body: data,
    }),

  deactivate: (machineId: string) =>
    apiFetch<{ ok: boolean; deactivated: boolean; note?: string }>(
      `/machines/${machineId}`,
      { method: "DELETE" }
    ),

  getStatus: (machineId: string) =>
    apiFetch<MachineStatusSchema>(`/machines/${machineId}/status`),

  listEvents: (
    machineId: string,
    params: { from?: string; to?: string; limit?: number; cursor?: string }
  ) => {
    const qs = new URLSearchParams();
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.cursor) qs.set("cursor", params.cursor);
    return apiFetch<{ items: MachineEventSchema[]; next_cursor: string | null }>(
      `/machines/${machineId}/events?${qs.toString()}`
    );
  },
};

export const productionApi = {
  listOrders: (
    lineId: string,
    params: {
      status?: string;
      from?: string;
      to?: string;
      limit?: number;
      cursor?: string;
    }
  ) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.cursor) qs.set("cursor", params.cursor);
    return apiFetch<PaginatedResponse<ProductionOrderSchema>>(
      `/lines/${lineId}/production/orders?${qs.toString()}`
    );
  },

  createOrder: (
    lineId: string,
    data: {
      order_number: string;
      product_code: string;
      product_id?: string | null;
      planned_qty: number;
      shift_id: string;
      planned_start: string;
      planned_end: string;
    }
  ) =>
    apiFetch<ProductionOrderSchema>(`/lines/${lineId}/production/orders`, {
      method: "POST",
      body: data,
    }),

  getOrder: (orderId: string) =>
    apiFetch<ProductionOrderSchema>(`/production/orders/${orderId}`),

  getOrderSummary: (orderId: string) =>
    apiFetch<{
      order_id: string;
      order_number: string;
      product_code: string;
      shift_id: string;
      planned_qty: number;
      actual_qty: number;
      good_qty: number;
      rejected_qty: number;
      status: string;
      planned_start: string;
      planned_end: string;
      actual_start: string | null;
      actual_end: string | null;
      total_downtime_seconds: number;
      top_downtime_categories: Array<{
        category: string;
        duration_s: number;
        event_count: number;
      }>;
      production_miss: boolean;
      production_miss_qty: number;
    }>(`/production/orders/${orderId}/summary`),

  updateOrderStatus: (orderId: string, status: string) =>
    apiFetch<ProductionOrderSchema>(`/production/orders/${orderId}`, {
      method: "PATCH",
      body: { status },
    }),

  getCurrentProduction: (lineId: string) =>
    apiFetch<CurrentProductionSchema | null>(
      `/lines/${lineId}/production/current`
    ),

  getHistory: (
    lineId: string,
    params: { from: string; to: string; granularity: "shift" | "day" }
  ) => {
    const qs = new URLSearchParams({
      from: params.from,
      to: params.to,
      granularity: params.granularity,
    });
    return apiFetch<{ items: ProductionSummarySchema[] }>(
      `/lines/${lineId}/production/history?${qs.toString()}`
    );
  },
};

export const downtimeApi = {
  listForMachine: (machineId: string, params: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    return apiFetch<{ items: DowntimeEventSchema[]; total_duration_s: number }>(
      `/machines/${machineId}/downtime?${qs.toString()}`
    );
  },

  create: (
    machineId: string,
    data: {
      category: string;
      reason?: string | null;
      started_at: string;
      ended_at?: string;
      is_planned: boolean;
    }
  ) =>
    apiFetch<DowntimeEventSchema>(`/machines/${machineId}/downtime`, {
      method: "POST",
      body: data,
    }),

  update: (
    downtimeId: string,
    data: { category?: string; reason?: string; ended_at?: string }
  ) =>
    apiFetch<DowntimeEventSchema>(`/downtime/${downtimeId}`, {
      method: "PATCH",
      body: data,
    }),

  delete: (downtimeId: string) =>
    apiFetch<{ ok: boolean }>(`/downtime/${downtimeId}`, {
      method: "DELETE",
    }),

  getPareto: (lineId: string, params: { from: string; to: string }) => {
    const qs = new URLSearchParams({ from: params.from, to: params.to });
    return apiFetch<{
      items: ParetoCategorySchema[];
      total_duration_s: number;
      period: { from: string; to: string };
    }>(`/lines/${lineId}/downtime/pareto?${qs.toString()}`);
  },
};

export const oeeApi = {
  getMachineOEE: (
    machineId: string,
    params: { from: string; to: string; granularity: "hour" | "shift" | "day" }
  ) => {
    const qs = new URLSearchParams({
      from: params.from,
      to: params.to,
      granularity: params.granularity,
    });
    return apiFetch<{ items: OEEAggregateSchema[] }>(
      `/machines/${machineId}/oee?${qs.toString()}`
    );
  },

  getLineSummary: (lineId: string, params: { from: string; to: string }) => {
    const qs = new URLSearchParams({ from: params.from, to: params.to });
    return apiFetch<OEESummarySchema>(`/lines/${lineId}/oee/summary?${qs.toString()}`);
  },
};

export const aiApi = {
  createInvestigation: (data: {
    question: string;
    context?: {
      machine_id?: string;
      from: string;
      to: string;
    };
  }) =>
    apiFetch<{ investigation_id: string; status: string }>("/ai/investigations", {
      method: "POST",
      body: data,
    }),

  getInvestigation: (investigationId: string) =>
    apiFetch<AIInvestigationSchema>(`/ai/investigations/${investigationId}`),

  submitFeedback: (
    investigationId: string,
    data: { feedback: "positive" | "negative"; comment?: string | null }
  ) =>
    apiFetch<{ ok: boolean }>(`/ai/investigations/${investigationId}/feedback`, {
      method: "POST",
      body: data,
    }),
};

export const usersApi = {
  list: (params?: {
    is_active?: boolean;
    role?: UserRole;
    limit?: number;
    cursor?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.is_active !== undefined)
      qs.set("is_active", String(params.is_active));
    if (params?.role) qs.set("role", params.role);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.cursor) qs.set("cursor", params.cursor);
    return apiFetch<PaginatedResponse<UserSchema>>(`/users?${qs.toString()}`);
  },

  create: (data: {
    email: string;
    name: string;
    role: UserRole;
    password: string;
  }) => apiFetch<UserSchema>("/users", { method: "POST", body: data }),

  update: (
    userId: string,
    data: { name?: string; role?: UserRole; is_active?: boolean }
  ) =>
    apiFetch<UserSchema>(`/users/${userId}`, { method: "PATCH", body: data }),

  me: () => apiFetch<UserSchema>("/users/me"),
};

export const productDefinitionsApi = {
  list: (params?: { is_active?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.is_active !== undefined)
      qs.set("is_active", String(params.is_active));
    return apiFetch<{ items: ProductDefinitionSchema[]; total: number }>(
      `/product-definitions?${qs.toString()}`
    );
  },

  create: (data: {
    product_code: string;
    name: string;
    ideal_cycle_time_seconds: number;
    unit: string;
  }) =>
    apiFetch<ProductDefinitionSchema>("/product-definitions", {
      method: "POST",
      body: data,
    }),

  update: (
    productId: string,
    data: {
      name?: string;
      ideal_cycle_time_seconds?: number;
      unit?: string;
      is_active?: boolean;
    }
  ) =>
    apiFetch<ProductDefinitionSchema>(`/product-definitions/${productId}`, {
      method: "PATCH",
      body: data,
    }),
};

export const shiftsApi = {
  update: (
    shiftId: string,
    data: Omit<ShiftSchema, "id" | "organization_id" | "factory_id" | "planned_production_time_minutes">
  ) =>
    apiFetch<ShiftSchema>(`/shifts/${shiftId}`, { method: "PUT", body: data }),

  delete: (shiftId: string) =>
    apiFetch<{ ok: boolean }>(`/shifts/${shiftId}`, { method: "DELETE" }),
};
