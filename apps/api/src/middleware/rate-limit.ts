import { createMiddleware } from "hono/factory";
import type { AppEnv } from "./auth";

interface Bucket {
  count: number;
  resetAt: number;
}

// Module-scope, so it persists across requests within one Worker isolate
// (or one Bun/Node process in tests). Not shared across isolates — that's
// what the Cloudflare RATE_LIMITER binding below is for in production.
const memoryBuckets = new Map<string, Bucket>();

interface RateLimitOptions {
  /** Requests allowed per window. */
  max: number;
  /** Window length in milliseconds (only used by the in-memory fallback). */
  windowMs: number;
  /** Distinguishes this limiter's keys from others sharing the same bucket map/binding. */
  keyPrefix: string;
}

/**
 * Rate-limits requests by client IP. Uses the Cloudflare Workers native
 * Rate Limiting binding (`env.RATE_LIMITER`) when configured — see
 * wrangler.toml — which is enforced at the edge and shared across all
 * Worker isolates. Falls back to an in-memory per-process limiter when that
 * binding isn't present (local dev, tests, or a deployment that hasn't
 * provisioned it yet), so this middleware is never a silent no-op and stays
 * testable without Cloudflare infra.
 */
export function rateLimit(options: RateLimitOptions) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const ip =
      c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown";
    const key = `${options.keyPrefix}:${ip}`;

    const binding = c.env.RATE_LIMITER;
    if (binding) {
      const { success } = await binding.limit({ key });
      if (!success) {
        return c.json({ error: "Too many requests. Please try again later." }, 429);
      }
      return next();
    }

    const now = Date.now();
    const bucket = memoryBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      memoryBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }
    if (bucket.count >= options.max) {
      return c.json({ error: "Too many requests. Please try again later." }, 429);
    }
    bucket.count += 1;
    return next();
  });
}
