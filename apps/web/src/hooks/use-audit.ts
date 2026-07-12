import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
