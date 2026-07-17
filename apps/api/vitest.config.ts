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
    setupFiles: ["./tests/setup.ts"],
    // Integration tests share one real Postgres connection pool and
    // truncate tables between tests — running test files in parallel
    // workers would race on that shared state.
    fileParallelism: false,
  },
});
