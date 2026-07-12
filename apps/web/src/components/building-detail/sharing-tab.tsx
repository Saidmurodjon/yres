import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yres/ui";
import { Trash2, UserPlus, Users } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useInviteMember, useMembers, useRemoveMember, useUpdateMemberRole } from "../../hooks";
import { ApiError } from "../../lib/api";
import type { BuildingRole } from "../../lib/api-types";
import { formatDate } from "../../lib/labels";

const ROLE_LABELS: Record<"editor" | "viewer", string> = {
  editor: "Editor — can view and change everything",
  viewer: "Viewer — can view, but not change anything",
};

export function SharingTab({ buildingId, role }: { buildingId: string; role: BuildingRole }) {
  const { data, isLoading, isError, error } = useMembers(buildingId);
  const inviteMember = useInviteMember(buildingId);
  const updateRole = useUpdateMemberRole(buildingId);
  const removeMember = useRemoveMember(buildingId);

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isOwner = role === "owner";

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    setInviteError(null);
    if (!email.trim()) {
      setInviteError("Email is required.");
      return;
    }
    try {
      await inviteMember.mutateAsync({ email: email.trim(), role: inviteRole });
      setEmail("");
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : "Failed to invite that person.");
    }
  }

  async function handleRoleChange(memberId: string, newRole: "editor" | "viewer") {
    setActionError(null);
    try {
      await updateRole.mutateAsync({ memberId, role: newRole });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to change role.");
    }
  }

  async function handleRemove(memberId: string) {
    setActionError(null);
    try {
      await removeMember.mutateAsync(memberId);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to remove that person.");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6 text-sm text-destructive">
          Failed to load members: {error instanceof ApiError ? error.message : "Unknown error"}
        </CardContent>
      </Card>
    );
  }

  const members = data?.members ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shared access</CardTitle>
          <CardDescription>
            People invited here (owners, ESCOs, auditors, banks) can view this building. Editors can
            also change its data; viewers cannot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Users className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Not shared with anyone yet</p>
              {isOwner && (
                <p className="max-w-sm text-sm text-muted-foreground">
                  Invite a collaborator below — they need an existing YRES account.
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  {isOwner && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="text-muted-foreground">{member.email}</TableCell>
                    <TableCell>
                      {isOwner ? (
                        <Select
                          value={member.role}
                          onValueChange={(v) => handleRoleChange(member.id, v as "editor" | "viewer")}
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="capitalize">
                          {member.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(member.createdAt)}
                    </TableCell>
                    {isOwner && (
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(member.id)}
                          disabled={removeMember.isPending}
                          aria-label={`Remove ${member.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {actionError && <p className="mt-4 text-sm text-destructive">{actionError}</p>}
        </CardContent>
      </Card>

      {isOwner && (
        <form onSubmit={handleInvite}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invite someone</CardTitle>
              <CardDescription>
                They must already have a YRES account — this doesn't send an email invite.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "editor" | "viewer")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">{ROLE_LABELS.editor}</SelectItem>
                      <SelectItem value="viewer">{ROLE_LABELS.viewer}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {inviteError && <p className="mt-4 text-sm text-destructive">{inviteError}</p>}
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={inviteMember.isPending}>
                <UserPlus className="h-4 w-4" />
                {inviteMember.isPending ? "Inviting..." : "Invite"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  );
}
