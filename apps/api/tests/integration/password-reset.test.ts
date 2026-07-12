import { desc, like } from "drizzle-orm";
import { verification } from "@yres/db";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../../src/index";
import { resetTestDb, testDb } from "../helpers/test-db";
import { testEnv } from "../helpers/test-env";

/**
 * Verifies the Phase 11 fix end-to-end: there was previously no
 * `sendResetPassword` configured at all, so Better Auth rejected every
 * `/request-password-reset` call with "Reset password isn't enabled" and
 * users who forgot a password had no recovery path. RESEND_API_KEY is
 * blank in tests, so the actual email never sends (see src/lib/email.ts) —
 * this reads the reset token straight out of Better Auth's own
 * `verification` table instead of intercepting an email, which is what a
 * real user would receive as the `?token=` query param on the link.
 */
describe("Password reset", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  async function signUp(email: string) {
    const response = await app.request(
      "/api/auth/sign-up/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.1" },
        body: JSON.stringify({ email, password: "original password 123", name: "Reset Test User" }),
      },
      testEnv,
    );
    expect(response.status).toBe(200);
  }

  async function latestResetToken(): Promise<string> {
    const [row] = await testDb
      .select()
      .from(verification)
      .where(like(verification.identifier, "reset-password:%"))
      .orderBy(desc(verification.createdAt))
      .limit(1);
    if (!row) throw new Error("No reset-password verification row found");
    return row.identifier.replace("reset-password:", "");
  }

  it("lets a user request a reset, set a new password, and sign in with it", async () => {
    const email = `reset-flow-${Date.now()}@example.com`;
    await signUp(email);

    const requestResponse = await app.request(
      "/api/auth/request-password-reset",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.2" },
        body: JSON.stringify({ email, redirectTo: "http://localhost:5173/reset-password" }),
      },
      testEnv,
    );
    expect(requestResponse.status).toBe(200);

    const token = await latestResetToken();

    const resetResponse = await app.request(
      "/api/auth/reset-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: "brand new password 456", token }),
      },
      testEnv,
    );
    expect(resetResponse.status).toBe(200);

    const oldPasswordSignIn = await app.request(
      "/api/auth/sign-in/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "original password 123" }),
      },
      testEnv,
    );
    expect(oldPasswordSignIn.status).toBe(401);

    const newPasswordSignIn = await app.request(
      "/api/auth/sign-in/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "brand new password 456" }),
      },
      testEnv,
    );
    expect(newPasswordSignIn.status).toBe(200);
  });

  it("does not leak whether an email is registered (still 200 for an unknown address)", async () => {
    const response = await app.request(
      "/api/auth/request-password-reset",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.3" },
        body: JSON.stringify({
          email: `never-registered-${Date.now()}@example.com`,
          redirectTo: "http://localhost:5173/reset-password",
        }),
      },
      testEnv,
    );
    expect(response.status).toBe(200);
  });

  it("rejects reusing an already-consumed reset token", async () => {
    const email = `reset-reuse-${Date.now()}@example.com`;
    await signUp(email);

    await app.request(
      "/api/auth/request-password-reset",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.4" },
        body: JSON.stringify({ email, redirectTo: "http://localhost:5173/reset-password" }),
      },
      testEnv,
    );
    const token = await latestResetToken();

    const first = await app.request(
      "/api/auth/reset-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: "first new password 789", token }),
      },
      testEnv,
    );
    expect(first.status).toBe(200);

    const second = await app.request(
      "/api/auth/reset-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: "second new password 789", token }),
      },
      testEnv,
    );
    expect(second.status).toBe(400);
  });
});
