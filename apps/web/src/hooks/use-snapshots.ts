import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuditSnapshotReportLang } from "@yres/types";
import { api } from "../lib/api";

/**
 * "Rasmiy versiyalar" panel (A08), results page. TanStack Query only — no Zustand copy
 * (ui-guidelines.md: anything from the server lives in the query cache, not client state).
 */
export function useSnapshots(buildingId: string | undefined) {
  return useQuery({
    queryKey: ["snapshots", buildingId],
    queryFn: () => api.audit.snapshots.list(buildingId as string),
    enabled: !!buildingId,
  });
}

export function useCreateSnapshot(buildingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.audit.snapshots.create(buildingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots", buildingId] });
    },
  });
}

/**
 * `onSettled` (not just `onSuccess`) refetches even when the status-flow trigger rejects the
 * transition (409 `illegal_transition` — another session already moved this snapshot) so the
 * list reflects the real current status instead of leaving a now-wrong row on screen.
 */
export function useSubmitSnapshot(buildingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (snapshotId: string) => api.audit.snapshots.submit(buildingId, snapshotId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots", buildingId] });
    },
  });
}

export function useApproveSnapshot(buildingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (snapshotId: string) => api.audit.snapshots.approve(buildingId, snapshotId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots", buildingId] });
    },
  });
}

export function useIssueSnapshotReport(buildingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      snapshotId,
      lang,
    }: {
      snapshotId: string;
      lang: AuditSnapshotReportLang;
    }) => api.audit.snapshots.issueReport(buildingId, snapshotId, lang),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots", buildingId] });
    },
  });
}

/** Downloads one already-issued snapshot PDF and triggers a browser save-as (mirrors `useDownloadAuditReport`). */
export function useDownloadSnapshotReport(buildingId: string) {
  return useMutation({
    mutationFn: async ({
      snapshotId,
      lang,
    }: {
      snapshotId: string;
      lang: AuditSnapshotReportLang;
    }) => {
      const { blob, fileName } = await api.audit.snapshots.downloadReport(
        buildingId,
        snapshotId,
        lang,
      );
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
