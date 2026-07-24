import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { BuildingListParams, BuildingStatsParams } from "../lib/api";
import type { CreateBuildingInput, UpdateBuildingInput } from "../lib/api-types";

export function useBuildings(params?: BuildingListParams) {
  return useQuery({
    queryKey: ["buildings", params],
    queryFn: () => api.buildings.list(params),
  });
}

/** Every distinct `location` the user has across all their buildings — backs the region filter dropdown, independent of the current page/filters. */
export function useBuildingLocations() {
  return useQuery({
    queryKey: ["buildings", "locations"],
    queryFn: () => api.buildings.locations(),
  });
}

/** Aggregate counts/floor-area/region-breakdown for the dashboard's metric cards and region chart — computed server-side over the whole filtered set, not just the current page. */
export function useBuildingStats(params?: BuildingStatsParams) {
  return useQuery({
    queryKey: ["buildings", "stats", params],
    queryFn: () => api.buildings.stats(params),
  });
}

export function useBuilding(id: string | undefined) {
  return useQuery({
    queryKey: ["buildings", id],
    queryFn: () => api.buildings.get(id as string),
    enabled: !!id,
  });
}

export function useCreateBuilding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBuildingInput) => api.buildings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
    },
  });
}

export function useUpdateBuilding(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateBuildingInput) => api.buildings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      queryClient.invalidateQueries({ queryKey: ["buildings", id] });
    },
  });
}

export function useDeleteBuilding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.buildings.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
    },
  });
}
