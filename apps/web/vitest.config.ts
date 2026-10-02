import { defineConfig } from "vitest/config";

// Unit tests for pure helpers under src/lib (no DOM needed). The Playwright E2E specs live in tests/e2e
// and are run by `bunx playwright test`, not here.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
