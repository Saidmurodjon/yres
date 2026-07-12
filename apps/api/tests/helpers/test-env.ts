import type { Env } from "../../src/index";

/**
 * Trivial in-memory stand-in for the R2Bucket binding — just enough of the
 * interface (`put`) for routes/audit.ts's report route to run in tests
 * without a real Cloudflare R2 bucket. Not a full R2Bucket implementation.
 */
const fakeReportsBucket = {
  put: async () => undefined,
} as unknown as Env["REPORTS_BUCKET"];

/**
 * Fake Worker bindings for `app.request(path, init, env)` in tests.
 * `DATABASE_URL` is never actually used to connect (see test-db.ts —
 * `createDb` is mocked to ignore its argument) but Better Auth's config
 * shape expects non-empty strings for its social-provider fields.
 */
export const testEnv: Env = {
  DATABASE_URL: "postgresql://yres:yres_dev_password@localhost:5432/yres_test",
  GOOGLE_CLIENT_ID: "test-google-client-id",
  GOOGLE_CLIENT_SECRET: "test-google-client-secret",
  BETTER_AUTH_SECRET: "test-better-auth-secret-at-least-32-characters-long",
  API_URL: "http://localhost:3000",
  // Overridable so the Playwright E2E server (apps/web/playwright.config.ts)
  // can point this at whatever port its Vite dev server actually runs on —
  // CORS requires an exact origin match, not just "some localhost".
  WEB_URL: process.env.E2E_WEB_URL ?? "http://localhost:5173",
  REPORTS_BUCKET: fakeReportsBucket,
};
