import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@yres/ui";
import { type FormEvent, useState } from "react";
import { authClient } from "../lib/auth-client";

interface ResetPasswordSearch {
  token?: string;
}

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch =>
    typeof search.token === "string" ? { token: search.token } : {},
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is invalid or expired. Request a new one.");
      return;
    }

    setIsSubmitting(true);
    const { error: resetError } = await authClient.resetPassword({ newPassword: password, token });
    setIsSubmitting(false);

    if (resetError) {
      setError(resetError.message ?? "Could not reset your password. The link may have expired.");
      return;
    }

    navigate({ to: "/login" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{token ? "Choose a new password" : "Invalid reset link"}</CardTitle>
          {token && <CardDescription>Your reset link has been verified.</CardDescription>}
        </CardHeader>
        <CardContent>
          {!token ? (
            <p className="text-sm text-destructive">
              This reset link is invalid or expired.{" "}
              <Link to="/forgot-password" className="font-medium underline-offset-4 hover:underline">
                Request a new one
              </Link>
              .
            </p>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save new password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
