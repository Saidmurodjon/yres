import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { API_URL } from "../lib/api";
import { api } from "../lib/api";
import type { ChatMessage, CreateConversationInput, UpdateConversationInput } from "../lib/api-types";

const CONVERSATIONS_KEY = ["chat", "conversations"];

export function useConversations() {
  return useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: () => api.chat.listConversations(),
    // Fallback only — live updates arrive over useConversationSocket below;
    // see docs/ui-guidelines.md's rule against polling as the primary path.
    refetchInterval: 30_000,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateConversationInput) => api.chat.createConversation(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY }),
  });
}

export function useUpdateConversation(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateConversationInput) => api.chat.updateConversation(conversationId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY }),
  });
}

function messagesKey(conversationId: string | undefined) {
  return ["chat", "messages", conversationId];
}

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: messagesKey(conversationId),
    queryFn: () => api.chat.messages(conversationId as string, { pageSize: 100 }),
    enabled: !!conversationId,
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => api.chat.markRead(conversationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY }),
  });
}

export function useSearchChatUsers(query: string) {
  return useQuery({
    queryKey: ["chat", "user-search", query],
    queryFn: () => api.chat.searchUsers(query),
    enabled: query.trim().length >= 2,
  });
}

export function useUploadChatAttachment(conversationId: string) {
  return useMutation({
    mutationFn: (file: File) => api.chat.uploadAttachment(conversationId, file),
  });
}

interface MessagesPage {
  messages: ChatMessage[];
  page: number;
  pageSize: number;
}

type IncomingSocketEvent =
  | { type: "message"; message: ChatMessage }
  | { type: "message_edited"; message: ChatMessage }
  | { type: "message_deleted"; messageId: string }
  | { type: "typing"; userId: string }
  | { type: "read"; userId: string; at: string };

/**
 * Opens a WebSocket to this conversation's ConversationRoom Durable Object
 * (apps/api/src/routes/chat.ts's /ws route) — merges live message/edit/
 * delete events straight into the react-query cache (so the thread updates
 * without a refetch) and tracks a short-lived "who's typing" set. Sending
 * a message goes out over this same socket rather than a REST call — see
 * docs/social-features.md's Durable Objects architecture section for why.
 */
export function useConversationSocket(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const typingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!conversationId) return;

    const wsUrl = `${API_URL.replace(/^http/, "ws")}/api/chat/conversations/${conversationId}/ws`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      let data: IncomingSocketEvent;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === "message") {
        queryClient.setQueryData<MessagesPage | undefined>(messagesKey(conversationId), (old) =>
          old ? { ...old, messages: [data.message, ...old.messages] } : old,
        );
        queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      } else if (data.type === "message_edited") {
        queryClient.setQueryData<MessagesPage | undefined>(messagesKey(conversationId), (old) =>
          old
            ? { ...old, messages: old.messages.map((m) => (m.id === data.message.id ? data.message : m)) }
            : old,
        );
      } else if (data.type === "message_deleted") {
        queryClient.setQueryData<MessagesPage | undefined>(messagesKey(conversationId), (old) =>
          old
            ? {
                ...old,
                messages: old.messages.map((m) =>
                  m.id === data.messageId ? { ...m, deletedAt: new Date().toISOString() } : m,
                ),
              }
            : old,
        );
      } else if (data.type === "typing") {
        const userId = data.userId;
        setTypingUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
        const existing = typingTimeouts.current.get(userId);
        if (existing) clearTimeout(existing);
        typingTimeouts.current.set(
          userId,
          setTimeout(() => {
            setTypingUserIds((prev) => prev.filter((id) => id !== userId));
          }, 3000),
        );
      } else if (data.type === "read") {
        queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      }
    };

    return () => {
      socket.close();
      for (const timeout of typingTimeouts.current.values()) clearTimeout(timeout);
      typingTimeouts.current.clear();
      setTypingUserIds([]);
    };
  }, [conversationId, queryClient]);

  function send(payload: Record<string, unknown>) {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  }

  return {
    typingUserIds,
    sendMessage: (
      body: string,
      replyToId?: string | null,
      attachment?: {
        attachmentUrl: string;
        attachmentName: string;
        attachmentMimeType: string;
        attachmentSizeBytes: number;
      },
    ) => send({ type: "message", body, replyToId: replyToId ?? null, ...attachment }),
    sendTyping: () => send({ type: "typing" }),
    sendRead: () => send({ type: "read" }),
    editMessage: (messageId: string, body: string) => send({ type: "edit", messageId, body }),
    deleteMessage: (messageId: string) => send({ type: "delete", messageId }),
  };
}
