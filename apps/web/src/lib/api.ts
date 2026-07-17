import type { AuditResult } from "@yres/types";
import type {
  AdminUser,
  ApiErrorBody,
  AuditRun,
  Building,
  BuildingMember,
  BuildingRole,
  BuildingWithRole,
  ChatAttachmentUploadResult,
  ChatMessage,
  ChatUserSearchResult,
  ClimateRegion,
  ClimateRegionWithNormals,
  ConversationSummary,
  CreateBuildingInput,
  CreateConversationInput,
  CreateMeasureInput,
  CreateNonEeMeasureInput,
  CreateUtilityBillInput,
  EnergyMeasure,
  EnvelopeData,
  InviteMemberInput,
  LampType,
  Material,
  NonEeMeasure,
  Notification,
  ReplaceCoolingSystemsPayload,
  ReplaceCoolingWindowsPayload,
  ReplaceDhwPayload,
  ReplaceDistributionPayload,
  ReplaceEnvelopePayload,
  ReplaceEquipmentPayload,
  ReplaceGenerationPayload,
  ReplaceLightingPayload,
  ReplaceRenewablesPayload,
  ReplaceUtilityBillsInput,
  ReplaceVentilationPayload,
  SystemsData,
  UpdateBuildingInput,
  UpdateConversationInput,
  UpdateUserInput,
  UserProfile,
  UtilityBill,
} from "./api-types";
import type { UserRole } from "./auth-types";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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
  users: {
    me: () => request<{ user: UserProfile }>("/api/users/me"),
    updateMe: (data: UpdateUserInput) =>
      request<{ user: UserProfile }>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  chat: {
    listConversations: () =>
      request<{ conversations: ConversationSummary[] }>("/api/chat/conversations"),
    createConversation: (data: CreateConversationInput) =>
      request<{ conversationId: string }>("/api/chat/conversations", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateConversation: (id: string, data: UpdateConversationInput) =>
      request<{ ok: true }>(`/api/chat/conversations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    messages: (id: string, params?: ListParams) =>
      request<{ messages: ChatMessage[]; page: number; pageSize: number }>(
        `/api/chat/conversations/${id}/messages${toQueryString(params)}`,
      ),
    markRead: (id: string) =>
      request<{ ok: true }>(`/api/chat/conversations/${id}/read`, { method: "PATCH" }),
    searchUsers: (q: string) =>
      request<{ users: ChatUserSearchResult[] }>(`/api/chat/users/search?q=${encodeURIComponent(q)}`),
    uploadAttachment: async (conversationId: string, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(
        `${API_URL}/api/chat/conversations/${conversationId}/attachments`,
        { method: "POST", credentials: "include", body: formData },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new ApiError(response.status, body as ApiErrorBody);
      }
      return body as ChatAttachmentUploadResult;
    },
  },

  notifications: {
    list: (params?: ListParams) =>
      request<{ notifications: Notification[]; unreadCount: number; page: number; pageSize: number }>(
        `/api/notifications${toQueryString(params)}`,
      ),
    markRead: (id: string) =>
      request<{ notification: Notification }>(`/api/notifications/${id}/read`, {
        method: "PATCH",
      }),
    markAllRead: () => request<{ ok: true }>("/api/notifications/read-all", { method: "PATCH" }),
  },

  adminUsers: {
    list: (params?: ListParams) =>
      request<{ users: AdminUser[]; page: number; pageSize: number }>(
        `/api/admin/users${toQueryString(params)}`,
      ),
    updateRole: (userId: string, role: UserRole) =>
      request<{ user: { id: string; role: UserRole } }>(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
  },

  buildings: {
    list: (params?: ListParams) =>
      request<{ buildings: BuildingWithRole[]; page: number; pageSize: number }>(
        `/api/buildings${toQueryString(params)}`,
      ),
    get: (id: string) =>
      request<{ building: Building; role: BuildingRole }>(`/api/buildings/${id}`),
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

  nonEeMeasures: {
    list: (buildingId: string) =>
      request<{ nonEeMeasures: NonEeMeasure[] }>(`/api/buildings/${buildingId}/non-ee-measures`),
    create: (buildingId: string, data: CreateNonEeMeasureInput) =>
      request<{ nonEeMeasure: NonEeMeasure }>(`/api/buildings/${buildingId}/non-ee-measures`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (buildingId: string, measureId: string) =>
      request<void>(`/api/buildings/${buildingId}/non-ee-measures/${measureId}`, {
        method: "DELETE",
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
    replace: (buildingId: string, payload: ReplaceUtilityBillsInput) =>
      request<{ energyCarrier: string; year: number; count: number }>(
        `/api/buildings/${buildingId}/consumption`,
        { method: "PUT", body: JSON.stringify(payload) },
      ),
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

  members: {
    list: (buildingId: string) =>
      request<{ members: BuildingMember[] }>(`/api/buildings/${buildingId}/members`),
    invite: (buildingId: string, data: InviteMemberInput) =>
      request<{ member: BuildingMember }>(`/api/buildings/${buildingId}/members`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateRole: (buildingId: string, memberId: string, role: "editor" | "viewer") =>
      request<{ member: BuildingMember }>(`/api/buildings/${buildingId}/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    remove: (buildingId: string, memberId: string) =>
      request<void>(`/api/buildings/${buildingId}/members/${memberId}`, { method: "DELETE" }),
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
