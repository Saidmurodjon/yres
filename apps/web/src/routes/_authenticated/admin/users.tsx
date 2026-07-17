import { createFileRoute, redirect } from "@tanstack/react-router";
import {
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
import { useAdminUsers, useUpdateUserRole } from "../../../hooks";
import { ApiError } from "../../../lib/api";
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
  const updateRole = useUpdateUserRole();
  const [roleError, setRoleError] = useState<string | null>(null);

  const users = data?.users ?? [];

  async function handleRoleChange(userId: string, role: UserRole) {
    setRoleError(null);
    try {
      await updateRole.mutateAsync({ userId, role });
    } catch (err) {
      setRoleError(err instanceof ApiError ? err.message : t("roleUpdateFailed"));
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
                  <TableHead>{t("columnJoined")}</TableHead>
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
                    <TableCell>{formatDate(u.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {roleError && <p className="mt-4 text-sm text-destructive">{roleError}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
