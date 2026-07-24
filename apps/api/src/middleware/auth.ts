import type { Database } from "@yres/db";
import { createMiddleware } from "hono/factory";
import { createAuth } from "../auth";
import type { Env } from "../index";

type Auth = ReturnType<typeof createAuth>;
type Session = Awaited<ReturnType<Auth["api"]["getSession"]>>;

export type AuthUser = NonNullable<Session>["user"];

/**
 * Shared Hono environment type: Cloudflare bindings + the request-scoped
 * variables set by our middleware. Route files should type their `Hono`
 * instances with this so `c.get("user")`/`c.get("db")` are available and
 * typed. `db` is set by `dbMiddleware` (see middleware/db.ts), which must
 * run before this one.
 */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    user: AuthUser;
    db: Database;
  };
};

/**
 * Resolves the Better Auth session from the incoming request headers and
 * stashes the user on the request context. Responds 401 if there is no
 * valid session. Mount this (after `dbMiddleware`) on any route group that
 * requires auth.
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const auth = createAuth(c.env, c.get("db"));
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (!session.user.isActive) {
    // Blocks every gated route immediately, even for a still-valid session
    // cookie — an admin deactivating an account should take effect right
    // away, not just on the next login (see admin-users.ts's PATCH
    // /users/:id/status).
    return c.json({ error: "Your account has been deactivated." }, 403);
  }

  c.set("user", session.user);
  await next();
});
