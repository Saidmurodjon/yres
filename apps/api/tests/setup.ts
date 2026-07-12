import { vi } from "vitest";
import { testDb } from "./helpers/test-db";

// Every route imports `createDb` from "@yres/db" and calls it with
// `c.env.DATABASE_URL`. Intercepting it here means every route file under
// test runs completely unmodified against the local test database instead
// of Neon — see tests/helpers/test-db.ts for why a real Neon endpoint can't
// be substituted with plain local Postgres.
vi.mock("@yres/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@yres/db")>();
  return {
    ...actual,
    createDb: () => testDb,
  };
});
