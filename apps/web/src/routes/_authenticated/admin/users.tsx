import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DeactivateUserDialog } from "../../../components/admin/deactivate-user-dialog";
import { EditUserDialog } from "../../../components/admin/edit-user-dialog";
import { useAdminUsers, useUpdateUserRole, useUpdateUserStatus } from "../../../hooks";
import { ApiError } from "../../../lib/api";
import type { AdminUser } from "../../../lib/api-types";
import { useSession } from "../../../lib/auth-client";
import type { SessionUser, UserRole } from "../../../lib/auth-types";
import { USER_ROLE_LABELS, formatDate } from "../../../lib/labels";

const USER_ROLES = Object.keys(USER_ROLE_LABELS) as UserRole[];

export const Route = createFileRoute("/_authenticated/admin/users")({
  beforeLoad: ({ context }) => {
    const user = context.user as unknown as SessionUser;
    if (user.role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { t } = useTranslation("admin");
  const { data, isLoading, isError, error } = useAdminUsers({ pageSize: 200 });
  const { data: session } = useSession();
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserStatus();
  const [roleError, setRoleError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<AdminUser | null>(null);

  const users = data?.users ?? [];
  const currentUserId = session?.user.id;

  async function handleRoleChange(userId: string, role: UserRole) {
    setRoleError(null);
    try {
      await updateRole.mutateAsync({ userId, role });
    } catch (err) {
      setRoleError(err instanceof ApiError ? err.message : t("roleUpdateFailed"));
    }
  }

  async function handleActivate(userId: string) {
    setStatusError(null);
    try {
      await updateStatus.mutateAsync({ userId, isActive: true });
    } catch (err) {
      setStatusError(err instanceof ApiError ? err.message : t("activate.failed"));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>

      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="p-6 text-sm text-destructive">
            {t("failedToLoad")}{" "}
            {error instanceof ApiError ? error.message : t("common:unknownError")}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("allUsers")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columnName")}</TableHead>
                  <TableHead>{t("columnUsername")}</TableHead>
                  <TableHead>{t("columnEmail")}</TableHead>
                  <TableHead>{t("columnRole")}</TableHead>
                  <TableHead>{t("columnStatus")}</TableHead>
                  <TableHead>{t("columnJoined")}</TableHead>
                  <TableHead className="text-right">{t("columnActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(value) => handleRoleChange(u.id, value as UserRole)}
                        disabled={updateRole.isPending}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {USER_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {USER_ROLE_LABELS[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? "success" : "secondary"}>
                        {u.isActive ? t("statusActive") : t("statusInactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(u.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingUser(u)}>
                          {t("edit.editButton")}
                        </Button>
                        {u.isActive ? (
                          u.id !== currentUserId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeactivatingUser(u)}
                            >
                              {t("deactivate.deactivateButton")}
                            </Button>
                          )
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updateStatus.isPending}
                            onClick={() => handleActivate(u.id)}
                          >
                            {t("activate.activateButton")}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {roleError && <p className="mt-4 text-sm text-destructive">{roleError}</p>}
          {statusError && <p className="mt-4 text-sm text-destructive">{statusError}</p>}
        </CardContent>
      </Card>

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
        />
      )}
      {deactivatingUser && (
        <DeactivateUserDialog
          user={deactivatingUser}
          open={!!deactivatingUser}
          onOpenChange={(open) => !open && setDeactivatingUser(null)}
        />
      )}
    </div>
  );
}
