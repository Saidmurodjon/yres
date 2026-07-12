import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
    // Integration tests share one real Postgres connection pool and
    // truncate tables between tests — running test files in parallel
    // workers would race on that shared state.
    fileParallelism: false,
  },
});
