import { type Database, createDb } from "@yres/db";
import { createMiddleware } from "hono/factory";
import type { Env } from "../index";

export type DbEnv = {
  Bindings: Env;
  Variables: {
    db: Database;
  };
};

/**
 * Constructs the Drizzle client once per request and stashes it on context,
 * so route handlers read `c.get("db")` instead of each calling
 * `createDb(c.env.DATABASE_URL)` themselves. Beyond avoiding the repetition,
 * this is what makes the client swappable in tests: a standalone test
 * server (see apps/web/tests/e2e/server.ts) can mount its own version of
 * this middleware that injects a local-Postgres-backed client instead,
 * without needing to intercept module resolution at all.
 */
export const dbMiddleware = createMiddleware<DbEnv>(async (c, next) => {
  c.set("db", createDb(c.env.DATABASE_URL));
  await next();
});
