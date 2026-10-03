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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError(t("resetPassword.invalidOrExpired"));
      return;
    }

    setIsSubmitting(true);
    const { error: resetError } = await authClient.resetPassword({ newPassword: password, token });
    setIsSubmitting(false);

    if (resetError) {
      setError(resetError.message ?? t("resetPassword.resetFailed"));
      return;
    }

    navigate({ to: "/login" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{token ? t("resetPassword.chooseNewPassword") : t("resetPassword.invalidLink")}</CardTitle>
          {token && <CardDescription>{t("resetPassword.verified")}</CardDescription>}
        </CardHeader>
        <CardContent>
          {!token ? (
            <p className="text-sm text-destructive">
              {t("resetPassword.invalidLink")}.{" "}
              <Link to="/forgot-password" className="font-medium underline-offset-4 hover:underline">
                {t("resetPassword.requestNewOne")}
              </Link>
              .
            </p>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="password">{t("resetPassword.newPassword")}</Label>
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
                {isSubmitting ? t("resetPassword.saving") : t("resetPassword.saveNewPassword")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
