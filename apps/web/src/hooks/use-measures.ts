import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ListParams } from "../lib/api";
import { api } from "../lib/api";
import type { CreateMeasureInput, CreateNonEeMeasureInput } from "../lib/api-types";

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
    mutationFn: ({
      measureIds,
      expectedRevision,
    }: {
      measureIds: string[];
      /** A10: the "measures" revision last seen (`MeasuresList.revision`). */
      expectedRevision?: number;
    }) => api.measures.select(buildingId, measureIds, expectedRevision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings", buildingId, "measures"] });
    },
  });
}

export function useCreateMeasure(buildingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMeasureInput) => api.measures.create(buildingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings", buildingId, "measures"] });
    },
  });
}

export function useUpdateMeasure(buildingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateMeasureInput }) =>
      api.measures.update(buildingId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings", buildingId, "measures"] });
      queryClient.invalidateQueries({ queryKey: ["buildings", buildingId, "audit"] });
    },
  });
}

export function useDeleteMeasure(buildingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (measureId: string) => api.measures.delete(buildingId, measureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings", buildingId, "measures"] });
    },
  });
}

export function useNonEeMeasures(buildingId: string | undefined) {
  return useQuery({
    queryKey: ["buildings", buildingId, "non-ee-measures"],
    queryFn: () => api.nonEeMeasures.list(buildingId as string),
    enabled: !!buildingId,
  });
}

export function useCreateNonEeMeasure(buildingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNonEeMeasureInput) => api.nonEeMeasures.create(buildingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings", buildingId, "non-ee-measures"] });
    },
  });
}

export function useUpdateNonEeMeasure(buildingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateNonEeMeasureInput }) =>
      api.nonEeMeasures.update(buildingId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings", buildingId, "non-ee-measures"] });
      queryClient.invalidateQueries({ queryKey: ["buildings", buildingId, "audit"] });
    },
  });
}

export function useDeleteNonEeMeasure(buildingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (measureId: string) => api.nonEeMeasures.delete(buildingId, measureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings", buildingId, "non-ee-measures"] });
    },
  });
}
