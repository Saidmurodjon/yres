import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { UpdateUserInput } from "../lib/api-types";

export function useMyProfile() {
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: () => api.users.me(),
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserInput) => api.users.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
    },
  });
}
