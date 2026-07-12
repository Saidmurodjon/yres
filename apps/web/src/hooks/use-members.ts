import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { InviteMemberInput } from "../lib/api-types";

export function useMembers(buildingId: string | undefined) {
  return useQuery({
    queryKey: ["buildings", buildingId, "members"],
    queryFn: () => api.members.list(buildingId as string),
    enabled: !!buildingId,
  });
}

function useInvalidateMembers(buildingId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["buildings", buildingId, "members"] });
}

export function useInviteMember(buildingId: string) {
  const invalidate = useInvalidateMembers(buildingId);
  return useMutation({
    mutationFn: (data: InviteMemberInput) => api.members.invite(buildingId, data),
    onSuccess: invalidate,
  });
}

export function useUpdateMemberRole(buildingId: string) {
  const invalidate = useInvalidateMembers(buildingId);
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: "editor" | "viewer" }) =>
      api.members.updateRole(buildingId, memberId, role),
    onSuccess: invalidate,
  });
}

export function useRemoveMember(buildingId: string) {
  const invalidate = useInvalidateMembers(buildingId);
  return useMutation({
    mutationFn: (memberId: string) => api.members.remove(buildingId, memberId),
    onSuccess: invalidate,
  });
}
