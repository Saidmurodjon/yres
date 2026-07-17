import { createFileRoute } from "@tanstack/react-router";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
} from "@yres/ui";
import { type FormEvent, useEffect, useState } from "react";
import { useMyProfile, useUpdateMyProfile } from "../../hooks";
import { ApiError } from "../../lib/api";
import { authClient } from "../../lib/auth-client";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-muted-foreground">Manage your account details and password.</p>
      </div>
      <ProfileDetailsCard />
      <PasswordCard />
    </div>
  );
}

function ProfileDetailsCard() {
  const { data, isLoading } = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.user) {
      setName(data.user.name);
      setUsername(data.user.username);
    }
  }, [data]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!username.trim()) {
      setError("Username is required.");
      return;
    }

    try {
      await updateProfile.mutateAsync({ name: name.trim(), username: username.trim() });
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update profile. Please try again.",
      );
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Name</Label>
            <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-username">Username</Label>
            <Input
              id="profile-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Used to find you when starting a chat.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <p className="text-sm text-muted-foreground">{data?.user.email}</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && !error && <p className="text-sm text-success">Profile updated.</p>}
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? "Saving..." : "Save changes"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: changeError } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (changeError) {
        setError(changeError.message ?? "Failed to change password.");
        return;
      }
      setSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && !error && <p className="text-sm text-success">Password changed.</p>}
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Changing..." : "Change password"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
