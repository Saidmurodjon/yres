import { afterAll, describe, expect, it } from "vitest";
import app from "../../src/index";
import { closeTestDb, testExecutionCtx } from "../helpers/test-db";
import { testEnv } from "../helpers/test-env";

describe("API security headers (V-5)", () => {
  afterAll(async () => {
    await closeTestDb();
  });

  it("sets the baseline headers on ordinary responses", async () => {
    const response = await app.request("/health", {}, testEnv, testExecutionCtx);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Strict-Transport-Security")).toContain("max-age=");
    expect(response.headers.get("Content-Security-Policy")).toBe(
      "default-src 'none'; frame-ancestors 'none'; sandbox",
    );
  });

  it("uses same-site CORP (chat images are loaded cross-origin by the web app) and no COEP/COOP", async () => {
    const response = await app.request("/health", {}, testEnv, testExecutionCtx);
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("same-site");
    expect(response.headers.get("Cross-Origin-Embedder-Policy")).toBeNull();
    expect(response.headers.get("Cross-Origin-Opener-Policy")).toBeNull();
  });

  it("keeps CORS working next to the security headers", async () => {
    const response = await app.request(
      "/health",
      { headers: { Origin: testEnv.WEB_URL } },
      testEnv,
      testExecutionCtx,
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(testEnv.WEB_URL);
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });
});
