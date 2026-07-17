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
import { useTranslation } from "react-i18next";
import { useInviteMember, useMembers, useRemoveMember, useUpdateMemberRole } from "../../hooks";
import { ApiError } from "../../lib/api";
import type { BuildingRole } from "../../lib/api-types";
import { formatDate } from "../../lib/labels";

export function SharingTab({ buildingId, role }: { buildingId: string; role: BuildingRole }) {
  const { t } = useTranslation("buildings");
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
      setInviteError(t("sharing.emailRequired"));
      return;
    }
    try {
      await inviteMember.mutateAsync({ email: email.trim(), role: inviteRole });
      setEmail("");
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : t("sharing.inviteFailed"));
    }
  }

  async function handleRoleChange(memberId: string, newRole: "editor" | "viewer") {
    setActionError(null);
    try {
      await updateRole.mutateAsync({ memberId, role: newRole });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t("sharing.roleChangeFailed"));
    }
  }

  async function handleRemove(memberId: string) {
    setActionError(null);
    try {
      await removeMember.mutateAsync(memberId);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t("sharing.removeFailed"));
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
          {t("sharing.failedToLoad")}{" "}
          {error instanceof ApiError ? error.message : t("common:unknownError")}
        </CardContent>
      </Card>
    );
  }

  const members = data?.members ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("sharing.title")}</CardTitle>
          <CardDescription>{t("sharing.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Users className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">{t("sharing.notSharedYet")}</p>
              {isOwner && (
                <p className="max-w-sm text-sm text-muted-foreground">{t("sharing.inviteHint")}</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("sharing.columnName")}</TableHead>
                  <TableHead>{t("sharing.columnEmail")}</TableHead>
                  <TableHead>{t("sharing.columnRole")}</TableHead>
                  <TableHead>{t("sharing.columnAdded")}</TableHead>
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
                          onValueChange={(v) =>
                            handleRoleChange(member.id, v as "editor" | "viewer")
                          }
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="editor">{t("sharing.roleEditor")}</SelectItem>
                            <SelectItem value="viewer">{t("sharing.roleViewer")}</SelectItem>
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
                          aria-label={t("sharing.removeAria", { name: member.name })}
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
              <CardTitle className="text-base">{t("sharing.inviteSomeone")}</CardTitle>
              <CardDescription>{t("sharing.inviteDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="invite-email">{t("sharing.email")}</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("sharing.role")}</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as "editor" | "viewer")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">{t("sharing.roleEditorDescription")}</SelectItem>
                      <SelectItem value="viewer">{t("sharing.roleViewerDescription")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {inviteError && <p className="mt-4 text-sm text-destructive">{inviteError}</p>}
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={inviteMember.isPending}>
                <UserPlus className="h-4 w-4" />
                {inviteMember.isPending ? t("sharing.inviting") : t("sharing.invite")}
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  );
}
