import type {
  AuditResult,
  AuditSnapshotListItem,
  AuditSnapshotReportLang,
  BuildingStatus,
  BuildingType,
  ReportAnnotationSectionKey,
} from "@yres/types";
import i18n from "../i18n";
import type {
  AdminUser,
  ApiErrorBody,
  AuditRun,
  Building,
  BuildingMember,
  BuildingRole,
  BuildingWithRole,
  BulkReplaceYearInput,
  ChatAttachmentUploadResult,
  FinancialParametersResponse,
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
  SaveFinancialParametersInput,
  SurfaceResistance,
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
  code?: string;
  details?: unknown;
  /** Only set when `code === "revision_conflict"` (A10) — the entity's actual revision. */
  currentRevision?: number;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error || `Request failed with status ${status}`);
    this.status = status;
    this.code = body.code;
    this.details = body.details;
    this.currentRevision = body.currentRevision;
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

export interface BuildingListParams extends ListParams {
  search?: string;
  type?: BuildingType;
  status?: BuildingStatus;
  region?: string;
}

export interface BuildingStatsParams {
  search?: string;
  type?: BuildingType;
  status?: BuildingStatus;
}

/**
 * A05/A06 return the full `audit_snapshot`/`audit_snapshot_report` D1 rows (more columns than the
 * UI needs — hashes, R2 keys). A08's panel only reads a handful of fields explicitly; the index
 * signature lets the rest pass through untyped instead of duplicating the whole backend row shape.
 */
interface AuditSnapshotRecord {
  id: string;
  buildingId: string;
  status: "draft" | "submitted" | "approved" | "superseded";
  engineVersion: string;
  generatedAt: string;
  createdAt: string;
  [key: string]: unknown;
}

interface AuditSnapshotReportRecord {
  id: string;
  snapshotId: string;
  lang: AuditSnapshotReportLang;
  sha256: string;
  createdAt: string;
  [key: string]: unknown;
}

function toQueryString(params?: ListParams | BuildingListParams | BuildingStatsParams): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
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
      request<{ users: ChatUserSearchResult[] }>(
        `/api/chat/users/search?q=${encodeURIComponent(q)}`,
      ),
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
      request<{
        notifications: Notification[];
        unreadCount: number;
        page: number;
        pageSize: number;
      }>(`/api/notifications${toQueryString(params)}`),
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
    update: (userId: string, data: { name?: string; username?: string }) =>
      request<{ user: { id: string; name: string; username: string } }>(
        `/api/admin/users/${userId}`,
        { method: "PATCH", body: JSON.stringify(data) },
      ),
    updateStatus: (userId: string, isActive: boolean) =>
      request<{ user: { id: string; isActive: boolean } }>(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),
  },

  buildings: {
    list: (params?: BuildingListParams) =>
      request<{ buildings: BuildingWithRole[]; page: number; pageSize: number; total: number }>(
        `/api/buildings${toQueryString(params)}`,
      ),
    locations: () => request<{ locations: string[] }>("/api/buildings/locations"),
    stats: (params?: BuildingStatsParams) =>
      request<{
        totalCount: number;
        totalFloorAreaM2: number;
        byRegion: { location: string; count: number }[];
      }>(`/api/buildings/stats${toQueryString(params)}`),
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
        /** A10: `expectedRevision + 1` when the payload guarded the write; omitted otherwise (this PUT is
         * already at the D1 query budget ceiling, so it never spends an extra query to re-read it). */
        revision?: number;
      }>(`/api/buildings/${buildingId}/envelope`, { method: "PUT", body: JSON.stringify(payload) }),
  },

  financialParameters: {
    get: (buildingId: string) =>
      request<FinancialParametersResponse>(`/api/buildings/${buildingId}/financial-parameters`),
    put: (buildingId: string, data: SaveFinancialParametersInput) =>
      request<FinancialParametersResponse>(`/api/buildings/${buildingId}/financial-parameters`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },

  measures: {
    list: (buildingId: string, params?: ListParams) =>
      request<{ measures: EnergyMeasure[]; page: number; pageSize: number; revision: number }>(
        `/api/buildings/${buildingId}/measures${toQueryString(params)}`,
      ),
    select: (buildingId: string, measureIds: string[], expectedRevision?: number) =>
      request<{ selected: string[]; revision?: number }>(
        `/api/buildings/${buildingId}/measures/select`,
        { method: "POST", body: JSON.stringify({ measureIds, expectedRevision }) },
      ),
    create: (buildingId: string, data: CreateMeasureInput) =>
      request<{ measure: EnergyMeasure }>(`/api/buildings/${buildingId}/measures`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (buildingId: string, measureId: string, data: CreateMeasureInput) =>
      request<{ measure: EnergyMeasure }>(`/api/buildings/${buildingId}/measures/${measureId}`, {
        method: "PUT",
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
    update: (buildingId: string, measureId: string, data: CreateNonEeMeasureInput) =>
      request<{ nonEeMeasure: NonEeMeasure }>(
        `/api/buildings/${buildingId}/non-ee-measures/${measureId}`,
        { method: "PUT", body: JSON.stringify(data) },
      ),
    delete: (buildingId: string, measureId: string) =>
      request<void>(`/api/buildings/${buildingId}/non-ee-measures/${measureId}`, {
        method: "DELETE",
      }),
  },

  consumption: {
    list: (buildingId: string, params?: ListParams) =>
      request<{ bills: UtilityBill[]; page: number; pageSize: number; revision: number }>(
        `/api/buildings/${buildingId}/consumption${toQueryString(params)}`,
      ),
    create: (buildingId: string, bills: CreateUtilityBillInput[]) =>
      request<{ bills: UtilityBill[] }>(`/api/buildings/${buildingId}/consumption`, {
        method: "POST",
        body: JSON.stringify({ bills }),
      }),
    replace: (buildingId: string, payload: ReplaceUtilityBillsInput) =>
      request<{ energyCarrier: string; year: number; count: number; revision?: number }>(
        `/api/buildings/${buildingId}/consumption`,
        { method: "PUT", body: JSON.stringify(payload) },
      ),
    bulkReplace: (buildingId: string, years: BulkReplaceYearInput[], expectedRevision?: number) =>
      request<{
        groups: { energyCarrier: string; year: number; count: number }[];
        revision?: number;
      }>(`/api/buildings/${buildingId}/consumption/bulk`, {
        method: "PUT",
        body: JSON.stringify({ years, expectedRevision }),
      }),
  },

  systems: {
    get: (buildingId: string) => request<SystemsData>(`/api/buildings/${buildingId}/systems`),
    replaceVentilation: (buildingId: string, payload: ReplaceVentilationPayload) =>
      request<{ scenario: string; count: number; revision?: number }>(
        `/api/buildings/${buildingId}/systems/ventilation`,
        { method: "PUT", body: JSON.stringify(payload) },
      ),
    replaceDhw: (buildingId: string, payload: ReplaceDhwPayload) =>
      request<{ scenario: string; count: number; revision?: number }>(
        `/api/buildings/${buildingId}/systems/dhw`,
        { method: "PUT", body: JSON.stringify(payload) },
      ),
    replaceDistribution: (buildingId: string, payload: ReplaceDistributionPayload) =>
      request<{ scenario: string; count: number; revision?: number }>(
        `/api/buildings/${buildingId}/systems/distribution`,
        { method: "PUT", body: JSON.stringify(payload) },
      ),
    replaceGeneration: (buildingId: string, payload: ReplaceGenerationPayload) =>
      request<{ scenario: string; count: number; revision?: number }>(
        `/api/buildings/${buildingId}/systems/generation`,
        { method: "PUT", body: JSON.stringify(payload) },
      ),
    replaceCoolingWindows: (buildingId: string, payload: ReplaceCoolingWindowsPayload) =>
      request<{ scenario: string; count: number; revision?: number }>(
        `/api/buildings/${buildingId}/systems/cooling-windows`,
        { method: "PUT", body: JSON.stringify(payload) },
      ),
    replaceCoolingSystems: (buildingId: string, payload: ReplaceCoolingSystemsPayload) =>
      request<{ scenario: string; count: number; revision?: number }>(
        `/api/buildings/${buildingId}/systems/cooling-systems`,
        { method: "PUT", body: JSON.stringify(payload) },
      ),
    replaceLighting: (buildingId: string, payload: ReplaceLightingPayload) =>
      request<{ scenario: string; count: number; revision?: number }>(
        `/api/buildings/${buildingId}/systems/lighting`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      ),
    replaceEquipment: (buildingId: string, payload: ReplaceEquipmentPayload) =>
      request<{ scenario: string; count: number; revision?: number }>(
        `/api/buildings/${buildingId}/systems/equipment`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      ),
    replaceRenewables: (buildingId: string, payload: ReplaceRenewablesPayload) =>
      request<{ count: number; revision?: number }>(
        `/api/buildings/${buildingId}/systems/renewables`,
        { method: "PUT", body: JSON.stringify(payload) },
      ),
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
    surfaceResistance: () =>
      request<{ surfaceResistances: SurfaceResistance[] }>("/api/reference/surface-resistance"),
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
      // Report is generated server-side (no access to this tab's i18next
      // instance), so the current UI language is passed explicitly
      // (docs/report-redesign-proposal.md §2).
      const response = await fetch(
        `${API_URL}/api/buildings/${buildingId}/audit/report?lang=${encodeURIComponent(i18n.language)}`,
        { credentials: "include" },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new ApiError(response.status, body as ApiErrorBody);
      }
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "audit-report.pdf";
      return { blob: await response.blob(), fileName };
    },
    annotations: (buildingId: string) =>
      request<{ annotations: Partial<Record<ReportAnnotationSectionKey, string>> }>(
        `/api/buildings/${buildingId}/audit/annotations`,
      ),
    upsertAnnotation: (buildingId: string, sectionKey: ReportAnnotationSectionKey, note: string) =>
      request<{ annotation: { id: string; note: string } | null }>(
        `/api/buildings/${buildingId}/audit/annotations/${sectionKey}`,
        { method: "PUT", body: JSON.stringify({ note }) },
      ),
    /** "Rasmiy versiyalar" paneli (A08) — immutable snapshots, A05/A06 ustida. */
    snapshots: {
      list: (buildingId: string) =>
        request<{ snapshots: AuditSnapshotListItem[] }>(
          `/api/buildings/${buildingId}/audit/snapshots`,
        ),
      get: (buildingId: string, snapshotId: string) =>
        request<{ snapshot: AuditSnapshotRecord; result: AuditResult }>(
          `/api/buildings/${buildingId}/audit/snapshots/${snapshotId}`,
        ),
      create: (buildingId: string) =>
        request<{ snapshot: AuditSnapshotRecord }>(
          `/api/buildings/${buildingId}/audit/snapshots`,
          { method: "POST" },
        ),
      submit: (buildingId: string, snapshotId: string) =>
        request<{ ok: true }>(
          `/api/buildings/${buildingId}/audit/snapshots/${snapshotId}/submit`,
          { method: "POST" },
        ),
      approve: (buildingId: string, snapshotId: string) =>
        request<{ ok: true }>(
          `/api/buildings/${buildingId}/audit/snapshots/${snapshotId}/approve`,
          { method: "POST" },
        ),
      issueReport: (buildingId: string, snapshotId: string, lang: AuditSnapshotReportLang) =>
        request<{ report: AuditSnapshotReportRecord }>(
          `/api/buildings/${buildingId}/audit/snapshots/${snapshotId}/reports`,
          { method: "POST", body: JSON.stringify({ lang }) },
        ),
      downloadReport: async (
        buildingId: string,
        snapshotId: string,
        lang: AuditSnapshotReportLang,
      ): Promise<{ blob: Blob; fileName: string }> => {
        const response = await fetch(
          `${API_URL}/api/buildings/${buildingId}/audit/snapshots/${snapshotId}/reports/${lang}`,
          { credentials: "include" },
        );
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new ApiError(response.status, body as ApiErrorBody);
        }
        const disposition = response.headers.get("Content-Disposition") ?? "";
        const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `snapshot-${lang}.pdf`;
        return { blob: await response.blob(), fileName };
      },
    },
  },
  /** Public, unauthenticated — the report's cover-page QR code links here (docs/report-redesign-proposal.md §8). */
  verify: (auditRunId: string) =>
    request<{ valid: boolean; legacy?: boolean; buildingName?: string; completedAt?: string }>(
      `/api/verify/${auditRunId}`,
    ),
  /**
   * Public, unauthenticated (A07) — a snapshot-backed report's QR code links to
   * `/verify/s/:snapshotId` instead of the legacy `/verify/:auditRunId` above. Response is a
   * strict whitelist (apps/api/src/routes/verify.ts) — no location/financial/result data.
   */
  verifySnapshot: (snapshotId: string) =>
    request<{
      valid: boolean;
      buildingName?: string;
      status?: "submitted" | "approved" | "superseded";
      generatedAt?: string;
      submittedAt?: string | null;
      approvedAt?: string | null;
      supersededAt?: string | null;
      engineVersion?: string;
      methodologyVersion?: string;
      inputsSha256?: string;
      reports?: { lang: "en" | "ru" | "uz"; sha256: string; sizeBytes: number; createdAt: string }[];
    }>(`/api/verify/s/${snapshotId}`),
};
