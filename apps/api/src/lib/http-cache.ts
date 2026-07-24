import type { Context } from "hono";
import type { AppEnv } from "../middleware/auth";

/**
 * Wraps a GET handler's data fetch with the Workers edge Cache API, keyed on
 * the exact request URL. Only safe for responses that are the same for
 * every caller (no per-user data) — every route using this is a global
 * reference table, not scoped to `c.get("user")`.
 */
export async function withEdgeCache<T>(
  c: Context<AppEnv>,
  ttlSeconds: number,
  fetchData: () => Promise<T>,
): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(c.req.url, c.req.raw);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const data = await fetchData();
  const response = c.json(data);
  response.headers.set("Cache-Control", `public, max-age=${ttlSeconds}`);
  c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
