export type UserRole = "admin" | "manager" | "supervisor" | "operator";

export interface UserSchema {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  organization_id?: string;
}

export type MachineState = "running" | "idle" | "fault" | "offline";

export type MachineProtocol = "mqtt" | "opcua" | "simulated";

export interface MachineSchema {
  id: string;
  organization_id: string;
  line_id: string;
  name: string;
  machine_type: string;
  asset_tag: string | null;
  protocol: MachineProtocol;
  is_active: boolean;
  created_at: string;
  default_product_id: string | null;
}

export interface MachineStatusSchema {
  machine_id: string;
  name: string;
  line_id: string;
  current_state: MachineState;
  state_since: string;
  last_event_at: string | null;
}

export interface MachineStatusUpdateEvent {
  machine_id: string;
  state: MachineState;
  timestamp: string;
  factory_id: string;
}

export type ProductionOrderStatus =
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "cancelled";

export interface ProductionOrderSchema {
  id: string;
  organization_id: string;
  line_id: string;
  shift_id: string | null;
  order_number: string;
  product_code: string;
  product_id: string | null;
  planned_qty: number;
  actual_qty: number;
  rejected_qty: number;
  status: ProductionOrderStatus;
  planned_start: string;
  planned_end: string;
  actual_start: string | null;
  actual_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface CurrentProductionSchema {
  order_id: string;
  order_number: string;
  product_code: string;
  planned_qty: number;
  actual_qty: number;
  rejected_qty: number;
  shift_start: string;
  shift_end: string;
  elapsed_pct: number;
  completion_pct: number;
  estimated_completion_at: string | null;
}

export interface DowntimeEventSchema {
  id: string;
  organization_id: string;
  machine_id: string;
  order_id: string | null;
  category: string;
  reason: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  is_planned: boolean;
  logged_by: string | null;
  created_at: string;
}

export interface ParetoCategorySchema {
  category: string;
  duration_s: number;
  event_count: number;
  pct: number;
}

export interface OEEAggregateSchema {
  period_start: string;
  period_end: string;
  granularity: "hour" | "shift" | "day";
  availability: number;
  performance: number | null;
  quality: number | null;
  oee: number | null;
}

export interface OEESummarySchema {
  availability: number;
  performance: number | null;
  quality: number | null;
  oee: number | null;
  period: {
    from: string;
    to: string;
  };
}

export type AIInvestigationStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export interface EvidenceItem {
  source: string;
  value: unknown;
  timestamp: string;
}

export interface ObservationSchema {
  claim: string;
  evidence: EvidenceItem[];
}

export interface HypothesisSchema {
  text: string;
  confidence: "low" | "medium" | "high";
  supporting_evidence: EvidenceItem[];
}

export interface RecommendationSchema {
  action: string;
  rationale: string;
}

export interface AIResultSchema {
  summary: string;
  observations: ObservationSchema[];
  hypotheses: HypothesisSchema[];
  recommendations: RecommendationSchema[];
}

export interface AIInvestigationSchema {
  id: string;
  status: AIInvestigationStatus;
  question: string;
  result: AIResultSchema | null;
  model_provider: string;
  model_id: string;
  created_at: string;
  completed_at: string | null;
}

export interface ShiftPlannedStop {
  name: string;
  duration_minutes: number;
}

export interface ShiftSchema {
  id: string;
  organization_id: string;
  factory_id: string;
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  planned_stops: ShiftPlannedStop[];
  planned_production_time_minutes: number;
}

export interface FactorySchema {
  id: string;
  organization_id: string;
  name: string;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductionLineSchema {
  id: string;
  organization_id: string;
  factory_id: string;
  name: string;
  created_at: string;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
}

export class ApiErrorException extends Error {
  readonly code: string;
  readonly status: number;

  constructor(error: ApiError) {
    super(error.message);
    this.code = error.code;
    this.status = error.status;
  }
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  next_cursor?: string | null;
}

export interface MachineEventSchema {
  event_id: string;
  machine_id: string;
  event_time: string;
  ingested_at: string;
  event_type: string;
  payload: Record<string, unknown>;
  source_seq: number | null;
  gateway_id: string;
}

export interface ProductDefinitionSchema {
  id: string;
  organization_id: string;
  product_code: string;
  name: string;
  ideal_cycle_time_seconds: number;
  unit: string;
  is_active: boolean;
}

export interface ProductionSummarySchema {
  order_id: string;
  order_number: string;
  product_code: string;
  shift_id: string | null;
  planned_qty: number;
  actual_qty: number;
  good_qty: number;
  rejected_qty: number;
  status: string;
  planned_start: string;
  planned_end: string;
}

export interface OrganizationSchema {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}
