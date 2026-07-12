import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ListParams } from "../lib/api";
import { api } from "../lib/api";

export function useMeasures(buildingId: string | undefined, params?: ListParams) {
  return useQuery({
    queryKey: ["buildings", buildingId, "measures", params],
    queryFn: () => api.measures.list(buildingId as string, params),
    enabled: !!buildingId,
  });
}

export function useSelectMeasures(buildingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (measureIds: string[]) => api.measures.select(buildingId, measureIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings", buildingId, "measures"] });
    },
  });
}
