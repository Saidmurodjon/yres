import { afterAll, describe, expect, it } from "vitest";
import app from "../../src/index";
import { closeTestDb, testExecutionCtx } from "../helpers/test-db";
import { testEnv } from "../helpers/test-env";

describe("Request body limits (V-3)", () => {
  afterAll(async () => {
    await closeTestDb();
  });

  it("answers 413 PAYLOAD_TOO_LARGE for a JSON body over 1 MB, before auth or parsing", async () => {
    const big = JSON.stringify({ note: "x".repeat(1024 * 1024 + 10) });
    const response = await app.request(
      "/api/buildings",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: big },
      testEnv,
      testExecutionCtx,
    );
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: "Payload too large",
      code: "PAYLOAD_TOO_LARGE",
    });
  });

  it("lets the chat upload route take a body above 1 MB (it has its own 11 MB limit)", async () => {
    const form = new FormData();
    form.set("file", new File([new Uint8Array(2 * 1024 * 1024)], "big.png", { type: "image/png" }));
    const response = await app.request(
      "/api/chat/conversations/some-id/attachments",
      { method: "POST", body: form },
      testEnv,
      testExecutionCtx,
    );
    // Not 413: it got past the body limit and failed authentication instead.
    expect(response.status).toBe(401);
  });

  it("still caps the chat upload route at 11 MB", async () => {
    const form = new FormData();
    form.set(
      "file",
      new File([new Uint8Array(12 * 1024 * 1024)], "huge.png", { type: "image/png" }),
    );
    const response = await app.request(
      "/api/chat/conversations/some-id/attachments",
      { method: "POST", body: form },
      testEnv,
      testExecutionCtx,
    );
    expect(response.status).toBe(413);
  });
});
