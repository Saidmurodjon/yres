import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button, Input, Label, Separator } from "@yres/ui";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { AuthLayout } from "../components/auth/auth-layout";
import { GoogleIcon } from "../components/auth/google-icon";
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
  const [showPassword, setShowPassword] = useState(false);
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
    <AuthLayout>
      <div className="mb-8 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("register.title")}</h1>
        <p className="text-muted-foreground">{t("register.subtitle")}</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="name">{t("register.fullName")}</Label>
          <div className="relative">
            <User className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("register.email")}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("register.password")}</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-9 pl-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          type="submit"
          className="w-full transition-transform active:scale-[0.98]"
          disabled={isSubmitting}
        >
          {isSubmitting ? t("register.creatingAccount") : t("register.createAccount")}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">{t("login.or")}</span>
        <Separator className="flex-1" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 transition-transform active:scale-[0.98]"
        disabled={isGoogleSubmitting}
        onClick={handleGoogleSignIn}
      >
        <GoogleIcon className="h-4 w-4" />
        {isGoogleSubmitting ? t("login.redirecting") : t("login.continueWithGoogle")}
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("register.alreadyHaveAccount")}{" "}
        <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("register.signIn")}
        </Link>
      </p>
    </AuthLayout>
  );
}
