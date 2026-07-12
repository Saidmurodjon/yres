import type { AuditResult } from "@yres/types";
import type {
  ApiErrorBody,
  AuditRun,
  Building,
  ClimateRegion,
  ClimateRegionWithNormals,
  CreateBuildingInput,
  CreateUtilityBillInput,
  EnergyMeasure,
  EnvelopeData,
  ReplaceEnvelopePayload,
  UpdateBuildingInput,
  UtilityBill,
} from "./api-types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error || `Request failed with status ${status}`);
    this.status = status;
    this.details = body.details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, body as ApiErrorBody);
  }

  return body as T;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
}

function toQueryString(params?: ListParams): string {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const api = {
  buildings: {
    list: (params?: ListParams) =>
      request<{ buildings: Building[]; page: number; pageSize: number }>(
        `/api/buildings${toQueryString(params)}`,
      ),
    get: (id: string) => request<{ building: Building }>(`/api/buildings/${id}`),
    create: (data: CreateBuildingInput) =>
      request<{ building: Building }>("/api/buildings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateBuildingInput) =>
      request<{ building: Building }>(`/api/buildings/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/api/buildings/${id}`, { method: "DELETE" }),
  },

  envelope: {
    get: (buildingId: string) => request<EnvelopeData>(`/api/buildings/${buildingId}/envelope`),
    replace: (buildingId: string, payload: ReplaceEnvelopePayload) =>
      request<{
        scenario: string;
        constructionTypeIds: string[];
        openingTypeIds: string[];
        envelopeElementIds: string[];
      }>(`/api/buildings/${buildingId}/envelope`, { method: "PUT", body: JSON.stringify(payload) }),
  },

  measures: {
    list: (buildingId: string, params?: ListParams) =>
      request<{ measures: EnergyMeasure[]; page: number; pageSize: number }>(
        `/api/buildings/${buildingId}/measures${toQueryString(params)}`,
      ),
    select: (buildingId: string, measureIds: string[]) =>
      request<{ selected: string[] }>(`/api/buildings/${buildingId}/measures/select`, {
        method: "POST",
        body: JSON.stringify({ measureIds }),
      }),
  },

  consumption: {
    list: (buildingId: string, params?: ListParams) =>
      request<{ bills: UtilityBill[]; page: number; pageSize: number }>(
        `/api/buildings/${buildingId}/consumption${toQueryString(params)}`,
      ),
    create: (buildingId: string, bills: CreateUtilityBillInput[]) =>
      request<{ bills: UtilityBill[] }>(`/api/buildings/${buildingId}/consumption`, {
        method: "POST",
        body: JSON.stringify({ bills }),
      }),
  },

  climate: {
    regions: (params?: ListParams) =>
      request<{ regions: ClimateRegion[]; page: number; pageSize: number }>(
        `/api/climate/regions${toQueryString(params)}`,
      ),
    region: (id: string) =>
      request<{ region: ClimateRegionWithNormals }>(`/api/climate/regions/${id}`),
  },

  audit: {
    run: (buildingId: string) =>
      request<{ auditRun: AuditRun; result?: AuditResult; error?: string }>(
        `/api/buildings/${buildingId}/audit/run`,
        { method: "POST" },
      ),
    status: (buildingId: string) =>
      request<{ auditRun: AuditRun }>(`/api/buildings/${buildingId}/audit/status`),
    results: (buildingId: string) =>
      request<{ auditRun: AuditRun; result: AuditResult }>(
        `/api/buildings/${buildingId}/audit/results`,
      ),
  },
};
