import { createMiddleware } from "hono/factory";
import type { AppEnv } from "./auth";

/**
 * Gates a route group on the caller's global `user.role` (docs/
 * social-features.md) — separate from `building-access.ts`'s per-building
 * owner/editor/viewer checks. Mount after `authMiddleware`, which is what
 * sets `c.get("user")`.
 */
export function requireRole(...roles: Array<"admin" | "auditor" | "viewer">) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    if (!roles.includes(user.role as "admin" | "auditor" | "viewer")) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  });
}
