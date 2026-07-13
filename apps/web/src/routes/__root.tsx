import { Button } from "@yres/ui";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { useEffect } from "react";

const RELOAD_GUARD_KEY = "yres-chunk-reload-attempted";

// Vite content-hashes every chunk's filename, so a tab left open across a
// deploy holds route manifest entries pointing at hashes the new deployment
// no longer serves — the next lazy-loaded route 404s with this exact
// message instead of a normal network error.
function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i.test(
    message,
  );
}

function RootErrorComponent({ error }: { error: Error }) {
  // Only auto-reload the *first* time this tab hits a stale-chunk error —
  // if it were guaranteed to happen again (already tried once this session),
  // silently reloading forever would hide a genuine, unrelated failure
  // behind an endless "Updating…" screen with no way out.
  const alreadyAttemptedReload = sessionStorage.getItem(RELOAD_GUARD_KEY) === "1";
  const staleChunk = isStaleChunkError(error) && !alreadyAttemptedReload;

  useEffect(() => {
    if (!staleChunk) return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
    window.location.reload();
  }, [staleChunk]);

  if (staleChunk) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4 text-center">
        <p className="text-sm text-muted-foreground">Updating to the latest version…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        An unexpected error occurred. Reloading the page usually fixes it.
      </p>
      <Button onClick={() => window.location.reload()}>Reload</Button>
    </main>
  );
}

function RootComponent() {
  // A route rendered successfully, so this tab's chunk manifest is good —
  // let a *future* stale-chunk error (after the next deploy) auto-reload
  // again instead of being permanently suppressed by the guard above.
  useEffect(() => {
    sessionStorage.removeItem(RELOAD_GUARD_KEY);
  }, []);

  return <Outlet />;
}

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RootErrorComponent,
});
