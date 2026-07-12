import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useMaterials() {
  return useQuery({
    queryKey: ["reference", "materials"],
    queryFn: () => api.reference.materials(),
    staleTime: 60 * 60 * 1000,
  });
}
