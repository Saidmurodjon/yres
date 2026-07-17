/**
 * Vitest runs `src/index.ts` under plain Node, not the Cloudflare Workers
 * runtime, so the real `cloudflare:workers` built-in module (which provides
 * the `DurableObject` base class used by `src/durable-objects/*.ts`) doesn't
 * exist here. `vitest.config.ts` aliases that specifier to this shim so the
 * module graph can load at all — integration tests never actually
 * instantiate a Durable Object (that only happens against a real deployed
 * Worker), they just need `import { DurableObject } from "cloudflare:workers"`
 * to resolve to *something* extendable.
 */
export class DurableObject<_Env = unknown> {}
