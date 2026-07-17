import { createFileRoute } from "@tanstack/react-router";
import { Button, Textarea } from "@yres/ui";
import { Paperclip, Send, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useConversations,
  useConversationSocket,
  useMarkConversationRead,
  useMessages,
  useUploadChatAttachment,
} from "../../../hooks";
import { API_URL } from "../../../lib/api";
import type { ChatMessage } from "../../../lib/api-types";
import { useSession } from "../../../lib/auth-client";
import type { SessionUser } from "../../../lib/auth-types";
import { formatTime } from "../../../lib/labels";

export const Route = createFileRoute("/_authenticated/chat/$conversationId")({
  component: ChatThreadPage,
});

interface PendingAttachment {
  attachmentUrl: string;
  attachmentName: string;
  attachmentMimeType: string;
  attachmentSizeBytes: number;
}

function ChatThreadPage() {
  const { t } = useTranslation("chat");
  const { conversationId } = Route.useParams();
  const { data: session } = useSession();
  const currentUser = session?.user as SessionUser | undefined;

  const { data: conversationsData } = useConversations();
  const conversation = conversationsData?.conversations.find((item) => item.id === conversationId);

  const { data: messagesData, isLoading } = useMessages(conversationId);
  const messages = useMemo(() => [...(messagesData?.messages ?? [])].reverse(), [messagesData]);

  const socket = useConversationSocket(conversationId);
  const markRead = useMarkConversationRead();
  const uploadAttachment = useUploadChatAttachment(conversationId);

  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-marks read only when switching conversations or a new message arrives — markRead.mutate/socket.sendRead are recreated every render, including them would fire this on every render instead.
  useEffect(() => {
    markRead.mutate(conversationId);
    socket.sendRead();
  }, [conversationId, messages.length]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: messages.length is used only as a re-run trigger (scroll to bottom on new message), not read inside the effect body.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  function cancelComposerExtras() {
    setReplyTo(null);
    setEditing(null);
    setBody("");
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();

    if (editing) {
      if (!body.trim()) return;
      socket.editMessage(editing.id, body.trim());
      cancelComposerExtras();
      return;
    }

    if (!body.trim() && !pendingFile) return;

    let attachment: PendingAttachment | undefined;
    if (pendingFile) {
      attachment = await uploadAttachment.mutateAsync(pendingFile);
    }

    socket.sendMessage(body.trim(), replyTo?.id ?? null, attachment);
    cancelComposerExtras();
  }

  function handleBodyChange(value: string) {
    setBody(value);
    socket.sendTyping();
  }

  const typingLabel =
    socket.typingUserIds.length > 0
      ? t("thread.typing", {
          name:
            conversation?.members.find((m) => m.id === socket.typingUserIds[0])?.name ??
            t("thread.someone"),
        })
      : null;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="border-b border-border pb-3">
        <h1 className="text-lg font-semibold">{conversation?.name ?? t("thread.defaultTitle")}</h1>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto py-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("thread.loading")}</p>
        ) : (
          messages.map((m) => {
            const isOwn = m.senderId === currentUser?.id;
            const sender = conversation?.members.find((member) => member.id === m.senderId);
            const repliedTo = m.replyToId ? messages.find((x) => x.id === m.replyToId) : undefined;

            return (
              <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`group max-w-[75%] rounded-lg px-3 py-2 ${
                    isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {!isOwn && conversation?.type === "group" && (
                    <p className="mb-0.5 text-xs font-medium opacity-80">
                      {sender?.name ?? t("thread.unknownSender")}
                    </p>
                  )}
                  {repliedTo && (
                    <div className="mb-1 rounded border-l-2 border-current/40 bg-black/5 px-2 py-1 text-xs opacity-80">
                      {repliedTo.deletedAt ? t("thread.messageDeleted") : repliedTo.body}
                    </div>
                  )}
                  {m.deletedAt ? (
                    <p className="text-sm italic opacity-70">{t("thread.messageDeleted")}</p>
                  ) : (
                    <>
                      {m.attachmentUrl &&
                        (m.attachmentMimeType?.startsWith("image/") ? (
                          <img
                            src={`${API_URL}${m.attachmentUrl}`}
                            alt={m.attachmentName ?? "attachment"}
                            className="mb-1 max-h-64 rounded"
                          />
                        ) : (
                          <a
                            href={`${API_URL}${m.attachmentUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mb-1 block text-sm underline"
                          >
                            {m.attachmentName ?? t("thread.downloadAttachment")}
                          </a>
                        ))}
                      {m.body && <p className="whitespace-pre-wrap text-sm">{m.body}</p>}
                    </>
                  )}
                  <div className="mt-1 flex items-center justify-end gap-2 text-[10px] opacity-70">
                    {m.editedAt && !m.deletedAt && <span>{t("thread.edited")}</span>}
                    <span>{formatTime(m.createdAt)}</span>
                  </div>
                  {!m.deletedAt && (
                    <div className="mt-1 hidden gap-2 group-hover:flex">
                      <button
                        type="button"
                        className="text-xs underline opacity-70"
                        onClick={() => setReplyTo(m)}
                      >
                        {t("thread.reply")}
                      </button>
                      {isOwn && (
                        <>
                          <button
                            type="button"
                            className="text-xs underline opacity-70"
                            onClick={() => {
                              setEditing(m);
                              setBody(m.body);
                            }}
                          >
                            {t("thread.edit")}
                          </button>
                          <button
                            type="button"
                            className="text-xs underline opacity-70"
                            onClick={() => socket.deleteMessage(m.id)}
                          >
                            {t("thread.delete")}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {typingLabel && <p className="px-1 pb-1 text-xs text-muted-foreground">{typingLabel}</p>}

      {(replyTo || editing) && (
        <div className="mb-2 flex items-center justify-between rounded-md border border-border bg-muted px-3 py-1.5 text-sm">
          <span className="truncate">
            {editing ? t("thread.editingMessage") : t("thread.replyingTo", { body: replyTo?.body })}
          </span>
          <button type="button" onClick={cancelComposerExtras} aria-label={t("thread.cancelAria")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {pendingFile && (
        <div className="mb-2 flex items-center justify-between rounded-md border border-border bg-muted px-3 py-1.5 text-sm">
          <span className="truncate">{pendingFile.name}</span>
          <button
            type="button"
            onClick={() => setPendingFile(null)}
            aria-label={t("thread.removeAttachmentAria")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-border pt-3">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          aria-label={t("thread.attachFileAria")}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          value={body}
          onChange={(e) => handleBodyChange(e.target.value)}
          placeholder={t("thread.placeholder")}
          className="min-h-10 flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as unknown as FormEvent);
            }
          }}
        />
        <Button
          type="submit"
          disabled={uploadAttachment.isPending}
          aria-label={t("thread.sendAria")}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
