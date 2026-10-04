import { afterAll, describe, expect, it } from "vitest";
import app from "../../src/index";
import { ENGINE_VERSION } from "../../src/services/engine-version";
import { closeTestDb, testExecutionCtx } from "../helpers/test-db";
import { testEnv } from "../helpers/test-env";

describe("GET /health", () => {
  afterAll(async () => {
    await closeTestDb();
  });

  it("reports the engine version and a null gitSha when none is configured (A01)", async () => {
    const response = await app.request("/health", {}, testEnv, testExecutionCtx);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: "ok", engineVersion: ENGINE_VERSION, gitSha: null });
  });
});
