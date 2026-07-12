import { describe, expect, it } from "vitest";
import app from "../../src/index";
import { testEnv } from "../helpers/test-env";

/**
 * Verifies the Phase 11 fix end-to-end: sign-up/sign-in are brute-force
 * targets and previously had no throttling at all. This exercises the real
 * in-memory fallback path of src/middleware/rate-limit.ts (no Cloudflare
 * RATE_LIMITER binding exists in tests, same as local dev without one
 * provisioned) — every request here shares one synthetic IP so they share
 * one rate-limit bucket, unlike signUpTestUser()'s per-call unique IP.
 */
describe("Auth rate limiting", () => {
  it("throttles repeated sign-up attempts from the same IP with 429", async () => {
    const ip = "203.0.113.42";
    const headers = { "Content-Type": "application/json", "x-forwarded-for": ip };

    let lastStatus = 0;
    for (let i = 0; i < 10; i++) {
      const response = await app.request(
        "/api/auth/sign-up/email",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            email: `rate-limit-${i}-${Date.now()}@example.com`,
            password: "correct horse battery staple 42",
            name: `Rate Limit User ${i}`,
          }),
        },
        testEnv,
      );
      lastStatus = response.status;
    }
    expect(lastStatus).toBe(200);

    const eleventh = await app.request(
      "/api/auth/sign-up/email",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: `rate-limit-eleventh-${Date.now()}@example.com`,
          password: "correct horse battery staple 42",
          name: "Rate Limit User 11",
        }),
      },
      testEnv,
    );
    expect(eleventh.status).toBe(429);
    const body = await eleventh.json();
    expect(body).toMatchObject({ error: expect.stringContaining("Too many requests") });
  });

  it("does not throttle a different IP sharing no history with the first", async () => {
    const response = await app.request(
      "/api/auth/sign-up/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.7" },
        body: JSON.stringify({
          email: `rate-limit-other-ip-${Date.now()}@example.com`,
          password: "correct horse battery staple 42",
          name: "Other IP User",
        }),
      },
      testEnv,
    );
    expect(response.status).toBe(200);
  });
});
