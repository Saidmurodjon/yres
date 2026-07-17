import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { API_URL, type ListParams } from "../lib/api";
import { api } from "../lib/api";

const NOTIFICATIONS_KEY = ["notifications"];

export function useNotifications(params?: ListParams) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, params],
    queryFn: () => api.notifications.list(params),
    // Live updates normally arrive over the WebSocket (useNotificationSocket
    // below); this is just a slow fallback in case that socket drops, per
    // docs/ui-guidelines.md's rule against layering polling on top of a
    // working push channel as the *primary* update path.
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

/**
 * Opens a WebSocket to the caller's UserNotificationChannel Durable Object
 * (apps/api/src/routes/notifications.ts's /ws route) and invalidates the
 * notifications query on every push so the bell badge/list update live.
 * Unverified in this sandbox — there's no way to run the app against a
 * real Cloudflare deploy here; confirm the socket actually connects and
 * receives pushes after a real deploy.
 */
export function useNotificationSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const wsUrl = `${API_URL.replace(/^http/, "ws")}/api/notifications/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    };

    return () => socket.close();
  }, [queryClient]);
}
