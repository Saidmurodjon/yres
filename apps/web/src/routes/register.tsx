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
  Separator,
} from "@yres/ui";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { signIn, signUp } from "../lib/auth-client";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signUpError } = await signUp.email({ name, email, password });

    setIsSubmitting(false);
    if (signUpError) {
      setError(signUpError.message ?? t("register.createFailed"));
      return;
    }

    navigate({ to: "/dashboard" });
  }

  async function handleGoogleSignIn() {
    if (isGoogleSubmitting) return;
    setError(null);
    setIsGoogleSubmitting(true);
    try {
      // Both must be absolute: the API (a different origin from this app)
      // performs the final redirect after the OAuth callback, so a relative
      // path would resolve against the API's own origin instead of this app's.
      // errorCallbackURL keeps failures on this app too — without it, Better
      // Auth falls back to its own bare error page on the API's origin.
      const { error: signInError } = await signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/dashboard`,
        errorCallbackURL: `${window.location.origin}/login?error=oauth_failed`,
      });
      // A successful call navigates the browser away to Google before this
      // line runs — only an error (rejected API call, no redirect issued)
      // reaches here, so it's safe to always re-enable the button below.
      if (signInError) setError(signInError.message ?? t("login.googleStartFailed"));
    } catch {
      setError(t("login.connectionError"));
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("register.title")}</CardTitle>
          <CardDescription>{t("register.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">{t("register.fullName")}</Label>
              <Input
                id="name"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("register.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("register.password")}</Label>
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
              {isSubmitting ? t("register.creatingAccount") : t("register.createAccount")}
            </Button>
          </form>
          <div className="my-4 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">{t("login.or")}</span>
            <Separator className="flex-1" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isGoogleSubmitting}
            onClick={handleGoogleSignIn}
          >
            {isGoogleSubmitting ? t("login.redirecting") : t("login.continueWithGoogle")}
          </Button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("register.alreadyHaveAccount")}{" "}
            <Link
              to="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("register.signIn")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
