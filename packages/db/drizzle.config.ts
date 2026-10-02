import { defineConfig } from "drizzle-kit";

// Only `generate` runs through drizzle-kit — migrations are applied with
// `wrangler d1 migrations apply` (database.md), so no credentials are needed.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schemas/index.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
});
