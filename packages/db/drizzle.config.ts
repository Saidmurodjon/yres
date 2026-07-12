import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run drizzle-kit.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schemas/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
