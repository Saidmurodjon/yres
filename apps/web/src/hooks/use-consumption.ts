import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ListParams } from "../lib/api";
import { api } from "../lib/api";
import type { CreateUtilityBillInput } from "../lib/api-types";

export function useConsumption(buildingId: string | undefined, params?: ListParams) {
  return useQuery({
    queryKey: ["buildings", buildingId, "consumption", params],
    queryFn: () => api.consumption.list(buildingId as string, params),
    enabled: !!buildingId,
  });
}

export function useCreateConsumption(buildingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bills: CreateUtilityBillInput[]) => api.consumption.create(buildingId, bills),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings", buildingId, "consumption"] });
    },
  });
}
