import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ListParams } from "../lib/api";
import { api } from "../lib/api";
import type { UserRole } from "../lib/auth-types";

export function useAdminUsers(params?: ListParams) {
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => api.adminUsers.list(params),
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      api.adminUsers.updateRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}
