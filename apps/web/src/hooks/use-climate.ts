import { useQuery } from "@tanstack/react-query";
import type { ListParams } from "../lib/api";
import { api } from "../lib/api";

export function useClimateRegions(params?: ListParams) {
  return useQuery({
    queryKey: ["climate", "regions", params],
    queryFn: () => api.climate.regions(params),
  });
}

export function useClimateRegion(id: string | undefined) {
  return useQuery({
    queryKey: ["climate", "regions", id],
    queryFn: () => api.climate.region(id as string),
    enabled: !!id,
  });
}
