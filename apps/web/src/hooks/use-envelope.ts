import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ReplaceEnvelopePayload } from "../lib/api-types";

export function useEnvelope(buildingId: string | undefined) {
  return useQuery({
    queryKey: ["buildings", buildingId, "envelope"],
    queryFn: () => api.envelope.get(buildingId as string),
    enabled: !!buildingId,
  });
}

export function useReplaceEnvelope(buildingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReplaceEnvelopePayload) => api.envelope.replace(buildingId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings", buildingId, "envelope"] });
    },
  });
}
