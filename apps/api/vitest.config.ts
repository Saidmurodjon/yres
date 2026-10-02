import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // See tests/helpers/cloudflare-workers-shim.ts — Vitest runs under
      // Node, which has no real `cloudflare:workers` module for the
      // Durable Object classes that `src/index.ts` imports and re-exports.
      "cloudflare:workers": fileURLToPath(
        new URL("./tests/helpers/cloudflare-workers-shim.ts", import.meta.url),
      ),
    },
  },
  test: {
    // Each test file boots its own in-memory Miniflare D1 (tests/helpers/test-db.ts), so files
    // don't share state; run them one at a time anyway — several Miniflare instances at once are
    // slow to start and make timing-sensitive tests flaky.
    fileParallelism: false,
    // Booting Miniflare + applying the migrations happens at import time.
    hookTimeout: 30_000,
  },
});
