import type { AuditResult } from "@yres/types";
import type {
  ApiErrorBody,
  AuditRun,
  Building,
  ClimateRegion,
  ClimateRegionWithNormals,
  CreateBuildingInput,
  CreateUtilityBillInput,
  CreateMeasureInput,
  EnergyMeasure,
  EnvelopeData,
  LampType,
  Material,
  ReplaceCoolingSystemsPayload,
  ReplaceCoolingWindowsPayload,
  ReplaceDhwPayload,
  ReplaceDistributionPayload,
  ReplaceEnvelopePayload,
  ReplaceEquipmentPayload,
  ReplaceGenerationPayload,
  ReplaceLightingPayload,
  ReplaceRenewablesPayload,
  ReplaceVentilationPayload,
  SystemsData,
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
    create: (buildingId: string, data: CreateMeasureInput) =>
      request<{ measure: EnergyMeasure }>(`/api/buildings/${buildingId}/measures`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (buildingId: string, measureId: string) =>
      request<void>(`/api/buildings/${buildingId}/measures/${measureId}`, { method: "DELETE" }),
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

  systems: {
    get: (buildingId: string) => request<SystemsData>(`/api/buildings/${buildingId}/systems`),
    replaceVentilation: (buildingId: string, payload: ReplaceVentilationPayload) =>
      request<{ scenario: string; count: number }>(
        `/api/buildings/${buildingId}/systems/ventilation`,
        { method: "PUT", body: JSON.stringify(payload) },
      ),
    replaceDhw: (buildingId: string, payload: ReplaceDhwPayload) =>
      request<{ scenario: string; count: number }>(`/api/buildings/${buildingId}/systems/dhw`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    replaceDistribution: (buildingId: string, payload: ReplaceDistributionPayload) =>
      request<{ scenario: string; count: number }>(
        `/api/buildings/${buildingId}/systems/distribution`,
        { method: "PUT", body: JSON.stringify(payload) },
      ),
    replaceGeneration: (buildingId: string, payload: ReplaceGenerationPayload) =>
      request<{ scenario: string; count: number }>(
        `/api/buildings/${buildingId}/systems/generation`,
        { method: "PUT", body: JSON.stringify(payload) },
      ),
    replaceCoolingWindows: (buildingId: string, payload: ReplaceCoolingWindowsPayload) =>
      request<{ scenario: string; count: number }>(
        `/api/buildings/${buildingId}/systems/cooling-windows`,
        { method: "PUT", body: JSON.stringify(payload) },
      ),
    replaceCoolingSystems: (buildingId: string, payload: ReplaceCoolingSystemsPayload) =>
      request<{ scenario: string; count: number }>(
        `/api/buildings/${buildingId}/systems/cooling-systems`,
        { method: "PUT", body: JSON.stringify(payload) },
      ),
    replaceLighting: (buildingId: string, payload: ReplaceLightingPayload) =>
      request<{ scenario: string; count: number }>(`/api/buildings/${buildingId}/systems/lighting`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    replaceEquipment: (buildingId: string, payload: ReplaceEquipmentPayload) =>
      request<{ scenario: string; count: number }>(`/api/buildings/${buildingId}/systems/equipment`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    replaceRenewables: (buildingId: string, payload: ReplaceRenewablesPayload) =>
      request<{ count: number }>(`/api/buildings/${buildingId}/systems/renewables`, {
        method: "PUT",
        body: JSON.stringify(payload),
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

  reference: {
    materials: () => request<{ materials: Material[] }>("/api/reference/materials"),
    lampTypes: () => request<{ lampTypes: LampType[] }>("/api/reference/lamp-types"),
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
    report: async (buildingId: string): Promise<{ blob: Blob; fileName: string }> => {
      const response = await fetch(`${API_URL}/api/buildings/${buildingId}/audit/report`, {
        credentials: "include",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new ApiError(response.status, body as ApiErrorBody);
      }
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "audit-report.pdf";
      return { blob: await response.blob(), fileName };
    },
  },
};
