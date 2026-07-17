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
import { useCreateConversation, useConversations, useSearchChatUsers } from "../../../hooks";
import { ApiError } from "../../../lib/api";
import { formatDate } from "../../../lib/labels";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatListPage,
});

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}` : name.slice(0, 2)).toUpperCase();
}

function ChatListPage() {
  const { data, isLoading, isError, error } = useConversations();
  const conversations = data?.conversations ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
          <p className="mt-1 text-muted-foreground">Message other YRES users directly or in a group.</p>
        </div>
        <NewChatDialog />
      </div>

      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="p-6 text-sm text-destructive">
            Failed to load conversations: {error instanceof ApiError ? error.message : "Unknown error"}
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
            <p className="font-medium">No conversations yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Start a direct chat by username, or create a group with a few people.
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
                      ? (conv.lastMessage.deletedAt ? "Message deleted" : conv.lastMessage.body)
                      : "No messages yet"}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <Badge className="shrink-0">{conv.unreadCount > 9 ? "9+" : conv.unreadCount}</Badge>
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
          setError("Enter a username.");
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
          setError("Enter a group name and at least one username.");
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
      setError(err instanceof ApiError ? err.message : "Failed to start conversation.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New chat
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New chat</DialogTitle>
        </DialogHeader>
        <div className="mb-2 flex gap-2">
          <Button
            type="button"
            variant={mode === "direct" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("direct")}
          >
            Direct
          </Button>
          <Button
            type="button"
            variant={mode === "group" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("group")}
          >
            Group
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "direct" ? (
            <div className="space-y-1.5">
              <Label htmlFor="chat-username">Username</Label>
              <Input
                id="chat-username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setQuery(e.target.value);
                }}
                placeholder="jdoe"
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
                <Label htmlFor="group-name">Group name</Label>
                <Input id="group-name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="group-usernames">Usernames (comma-separated)</Label>
                <Input
                  id="group-usernames"
                  value={groupUsernames}
                  onChange={(e) => setGroupUsernames(e.target.value)}
                  placeholder="jdoe, asmith"
                />
              </div>
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={createConversation.isPending}>
            {createConversation.isPending ? "Starting..." : "Start chat"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
