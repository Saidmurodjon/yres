import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ListParams } from "../lib/api";
import type { CreateBuildingInput, UpdateBuildingInput } from "../lib/api-types";

export function useBuildings(params?: ListParams) {
  return useQuery({
    queryKey: ["buildings", params],
    queryFn: () => api.buildings.list(params),
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
