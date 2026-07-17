import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Skeleton,
} from "@yres/ui";
import { MessageCircle, Plus, Users } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateConversation, useConversations, useSearchChatUsers } from "../../../hooks";
import { ApiError } from "../../../lib/api";
import { formatDate } from "../../../lib/labels";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatListPage,
});

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    parts.length > 1 ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}` : name.slice(0, 2)
  ).toUpperCase();
}

function ChatListPage() {
  const { t } = useTranslation("chat");
  const { data, isLoading, isError, error } = useConversations();
  const conversations = data?.conversations ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("list.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("list.subtitle")}</p>
        </div>
        <NewChatDialog />
      </div>

      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="p-6 text-sm text-destructive">
            {t("list.failedToLoad")}{" "}
            {error instanceof ApiError ? error.message : t("common:unknownError")}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">{t("list.noConversationsYet")}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t("list.noConversationsDescription")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                to="/chat/$conversationId"
                params={{ conversationId: conv.id }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback>
                    {conv.type === "group" ? <Users className="h-4 w-4" /> : initialsFor(conv.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{conv.name}</p>
                    {conv.lastMessage && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {conv.lastMessage
                      ? conv.lastMessage.deletedAt
                        ? t("list.messageDeleted")
                        : conv.lastMessage.body
                      : t("list.noMessagesYet")}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <Badge className="shrink-0">
                    {conv.unreadCount > 9 ? t("list.unreadOverflow") : conv.unreadCount}
                  </Badge>
                )}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NewChatDialog() {
  const { t } = useTranslation("chat");
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [username, setUsername] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupUsernames, setGroupUsernames] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createConversation = useCreateConversation();
  const { data: searchResults } = useSearchChatUsers(query);

  function reset() {
    setUsername("");
    setGroupName("");
    setGroupUsernames("");
    setQuery("");
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      if (mode === "direct") {
        if (!username.trim()) {
          setError(t("newChat.usernameRequired"));
          return;
        }
        const { conversationId } = await createConversation.mutateAsync({
          type: "direct",
          username: username.trim(),
        });
        setOpen(false);
        reset();
        navigate({ to: "/chat/$conversationId", params: { conversationId } });
      } else {
        const usernames = groupUsernames
          .split(",")
          .map((u) => u.trim())
          .filter(Boolean);
        if (!groupName.trim() || usernames.length === 0) {
          setError(t("newChat.groupRequired"));
          return;
        }
        const { conversationId } = await createConversation.mutateAsync({
          type: "group",
          name: groupName.trim(),
          usernames,
        });
        setOpen(false);
        reset();
        navigate({ to: "/chat/$conversationId", params: { conversationId } });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("newChat.startFailed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          {t("newChat.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("newChat.title")}</DialogTitle>
        </DialogHeader>
        <div className="mb-2 flex gap-2">
          <Button
            type="button"
            variant={mode === "direct" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("direct")}
          >
            {t("newChat.direct")}
          </Button>
          <Button
            type="button"
            variant={mode === "group" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("group")}
          >
            {t("newChat.group")}
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "direct" ? (
            <div className="space-y-1.5">
              <Label htmlFor="chat-username">{t("newChat.usernameLabel")}</Label>
              <Input
                id="chat-username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setQuery(e.target.value);
                }}
                placeholder={t("newChat.usernamePlaceholder")}
              />
              {searchResults && searchResults.users.length > 0 && (
                <div className="rounded-md border border-border">
                  {searchResults.users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        setUsername(u.username);
                        setQuery("");
                      }}
                    >
                      <span className="font-medium">{u.name}</span>
                      <span className="text-muted-foreground">@{u.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="group-name">{t("newChat.groupNameLabel")}</Label>
                <Input
                  id="group-name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="group-usernames">{t("newChat.groupUsernamesLabel")}</Label>
                <Input
                  id="group-usernames"
                  value={groupUsernames}
                  onChange={(e) => setGroupUsernames(e.target.value)}
                  placeholder={t("newChat.groupUsernamesPlaceholder")}
                />
              </div>
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={createConversation.isPending}>
            {createConversation.isPending ? t("newChat.starting") : t("newChat.startChat")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
