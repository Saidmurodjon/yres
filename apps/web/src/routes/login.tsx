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
import { signIn } from "../lib/auth-client";

interface LoginSearch {
  redirect?: string;
  error?: string;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    search.error ? "Google sign-in failed. Please try again." : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await signIn.email({ email, password });

    setIsSubmitting(false);
    if (signInError) {
      setError(signInError.message ?? "Could not sign in with those credentials.");
      return;
    }

    navigate({ to: search.redirect ?? "/dashboard" });
  }

  async function handleGoogleSignIn() {
    if (isGoogleSubmitting) return;
    setError(null);
    setIsGoogleSubmitting(true);
    try {
      // Both must be absolute: the API (a different origin from this app)
      // performs the final redirect after the OAuth callback, so a relative
      // path would resolve against the API's own origin instead of this app's.
      // errorCallbackURL keeps failures (e.g. a stale/expired OAuth state) on
      // this app too — without it, Better Auth falls back to its own bare
      // error page on the API's origin.
      const { error: signInError } = await signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}${search.redirect ?? "/dashboard"}`,
        errorCallbackURL: `${window.location.origin}/login?error=oauth_failed`,
      });
      // A successful call navigates the browser away to Google before this
      // line runs — only an error (rejected API call, no redirect issued)
      // reaches here, so it's safe to always re-enable the button below.
      if (signInError) setError(signInError.message ?? "Could not start Google sign-in.");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in to YRES</CardTitle>
          <CardDescription>Energy efficiency audits, five minutes to bank-ready.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="my-4 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isGoogleSubmitting}
            onClick={handleGoogleSignIn}
          >
            {isGoogleSubmitting ? "Redirecting…" : "Continue with Google"}
          </Button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link
              to="/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
