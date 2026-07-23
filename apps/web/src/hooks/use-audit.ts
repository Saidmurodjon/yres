import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReportAnnotationSectionKey } from "@yres/types";
import { ApiError } from "../lib/api";
import { api } from "../lib/api";

export function useAuditStatus(buildingId: string | undefined) {
  return useQuery({
    queryKey: ["buildings", buildingId, "audit", "status"],
    queryFn: () => api.audit.status(buildingId as string),
    enabled: !!buildingId,
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status === 404 ? false : failureCount < 2,
  });
}

export function useAuditResults(buildingId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["buildings", buildingId, "audit", "results"],
    queryFn: () => api.audit.results(buildingId as string),
    enabled: !!buildingId && enabled,
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status === 404 ? false : failureCount < 2,
  });
}

export function useRunAudit(buildingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.audit.run(buildingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings", buildingId, "audit"] });
    },
  });
}

export function useReportAnnotations(buildingId: string | undefined) {
  return useQuery({
    queryKey: ["buildings", buildingId, "audit", "annotations"],
    queryFn: () => api.audit.annotations(buildingId as string),
    enabled: !!buildingId,
  });
}

export function useUpsertReportAnnotation(buildingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionKey, note }: { sectionKey: ReportAnnotationSectionKey; note: string }) =>
      api.audit.upsertAnnotation(buildingId, sectionKey, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings", buildingId, "audit", "annotations"] });
    },
  });
}

/** Public, unauthenticated (docs/report-redesign-proposal.md §8) — used by the /verify/$auditRunId page, not gated behind a building/session. */
export function useVerifyAuditRun(auditRunId: string | undefined) {
  return useQuery({
    queryKey: ["verify", auditRunId],
    queryFn: () => api.verify(auditRunId as string),
    enabled: !!auditRunId,
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status === 404 ? false : failureCount < 2,
  });
}

/** Downloads the audit report PDF and triggers a browser save-as, rather than just returning the blob. */
export function useDownloadAuditReport(buildingId: string) {
  return useMutation({
    mutationFn: async () => {
      const { blob, fileName } = await api.audit.report(buildingId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
  });
}
