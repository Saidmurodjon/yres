import { createMiddleware } from "hono/factory";
import { createAuth } from "../auth";
import type { Env } from "../index";

type Auth = ReturnType<typeof createAuth>;
type Session = Awaited<ReturnType<Auth["api"]["getSession"]>>;

export type AuthUser = NonNullable<Session>["user"];

/**
 * Shared Hono environment type: Cloudflare bindings + the request-scoped
 * variables set by our middleware. Route files should type their `Hono`
 * instances with this so `c.get("user")` is available and typed.
 */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    user: AuthUser;
  };
};

/**
 * Resolves the Better Auth session from the incoming request headers and
 * stashes the user on the request context. Responds 401 if there is no
 * valid session. Mount this on any route group that requires auth.
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", session.user);
  await next();
});
