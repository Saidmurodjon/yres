import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { FinancialParameters } from "../lib/api-types";

const key = (buildingId: string | undefined) => ["buildings", buildingId, "financial-parameters"];

export function useFinancialParameters(buildingId: string | undefined) {
  return useQuery({
    queryKey: key(buildingId),
    queryFn: () => api.financialParameters.get(buildingId as string),
    enabled: !!buildingId,
  });
}

export function useSaveFinancialParameters(buildingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FinancialParameters) => api.financialParameters.put(buildingId, data),
    onSuccess: (response) => {
      queryClient.setQueryData(key(buildingId), response);
      // The audit result is recomputed from these parameters on every request.
      queryClient.invalidateQueries({ queryKey: ["buildings", buildingId, "audit"] });
    },
  });
}
