import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  ReplaceCoolingSystemsPayload,
  ReplaceCoolingWindowsPayload,
  ReplaceDhwPayload,
  ReplaceDistributionPayload,
  ReplaceGenerationPayload,
  ReplaceVentilationPayload,
} from "../lib/api-types";

export function useSystems(buildingId: string | undefined) {
  return useQuery({
    queryKey: ["buildings", buildingId, "systems"],
    queryFn: () => api.systems.get(buildingId as string),
    enabled: !!buildingId,
  });
}

function useInvalidateSystems(buildingId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["buildings", buildingId, "systems"] });
}

export function useReplaceVentilation(buildingId: string) {
  const invalidate = useInvalidateSystems(buildingId);
  return useMutation({
    mutationFn: (payload: ReplaceVentilationPayload) =>
      api.systems.replaceVentilation(buildingId, payload),
    onSuccess: invalidate,
  });
}

export function useReplaceDhw(buildingId: string) {
  const invalidate = useInvalidateSystems(buildingId);
  return useMutation({
    mutationFn: (payload: ReplaceDhwPayload) => api.systems.replaceDhw(buildingId, payload),
    onSuccess: invalidate,
  });
}

export function useReplaceDistribution(buildingId: string) {
  const invalidate = useInvalidateSystems(buildingId);
  return useMutation({
    mutationFn: (payload: ReplaceDistributionPayload) =>
      api.systems.replaceDistribution(buildingId, payload),
    onSuccess: invalidate,
  });
}

export function useReplaceGeneration(buildingId: string) {
  const invalidate = useInvalidateSystems(buildingId);
  return useMutation({
    mutationFn: (payload: ReplaceGenerationPayload) =>
      api.systems.replaceGeneration(buildingId, payload),
    onSuccess: invalidate,
  });
}

export function useReplaceCoolingWindows(buildingId: string) {
  const invalidate = useInvalidateSystems(buildingId);
  return useMutation({
    mutationFn: (payload: ReplaceCoolingWindowsPayload) =>
      api.systems.replaceCoolingWindows(buildingId, payload),
    onSuccess: invalidate,
  });
}

export function useReplaceCoolingSystems(buildingId: string) {
  const invalidate = useInvalidateSystems(buildingId);
  return useMutation({
    mutationFn: (payload: ReplaceCoolingSystemsPayload) =>
      api.systems.replaceCoolingSystems(buildingId, payload),
    onSuccess: invalidate,
  });
}
