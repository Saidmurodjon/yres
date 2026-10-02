import { afterAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../src/index";
import type { Env } from "../../src/index";
import { signUpTestUser } from "../helpers/test-auth";
import { closeTestDb, resetTestDb, testExecutionCtx } from "../helpers/test-db";
import { testEnv } from "../helpers/test-env";

/** Just enough of R2 for the attachment routes: put/get of whole objects with httpMetadata. */
function fakeBucket() {
  const objects = new Map<string, { body: ArrayBuffer; httpMetadata?: { contentType?: string } }>();
  const bucket = {
    put: async (
      key: string,
      body: ArrayBuffer,
      options?: { httpMetadata?: { contentType?: string } },
    ) => {
      objects.set(key, { body, httpMetadata: options?.httpMetadata });
    },
    get: async (key: string) => objects.get(key) ?? null,
  };
  return { objects, bucket: bucket as unknown as Env["CHAT_ATTACHMENTS_BUCKET"] };
}

describe("Chat attachments (V-1)", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  async function setup() {
    const { objects, bucket } = fakeBucket();
    const env: Env = { ...testEnv, CHAT_ATTACHMENTS_BUCKET: bucket };
    const owner = await signUpTestUser();
    const friend = await signUpTestUser();
    const call = (path: string, init: RequestInit, cookie: string) =>
      app.request(
        path,
        { ...init, headers: { ...init.headers, Cookie: cookie } },
        env,
        testExecutionCtx,
      );

    const created = await call(
      "/api/chat/conversations",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "direct", username: friend.email }),
      },
      owner.cookie,
    );
    const { conversationId } = (await created.json()) as { conversationId: string };

    const upload = (file: File, cookie = owner.cookie) => {
      const form = new FormData();
      form.set("file", file);
      return call(
        `/api/chat/conversations/${conversationId}/attachments`,
        { method: "POST", body: form },
        cookie,
      );
    };
    return { objects, call, upload, conversationId, owner, friend };
  }

  it("rejects HTML and SVG uploads with a stable error code", async () => {
    const { upload, objects } = await setup();
    for (const file of [
      new File(["<script>alert(1)</script>"], "x.html", { type: "text/html" }),
      new File(["<svg onload=alert(1)/>"], "x.svg", { type: "image/svg+xml" }),
      new File(["whatever"], "x.bin", { type: "" }),
    ]) {
      const response = await upload(file);
      expect(response.status).toBe(400);
      expect(((await response.json()) as { code: string }).code).toBe(
        "ATTACHMENT_TYPE_NOT_ALLOWED",
      );
    }
    expect(objects.size).toBe(0);
  });

  it("stores an allowed file under a sanitized name and serves an image inline with hardening headers", async () => {
    const { upload, call, objects, owner } = await setup();
    const response = await upload(
      new File(["png-bytes"], "../../my photo#1.png", { type: "IMAGE/PNG" }),
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      attachmentUrl: string;
      attachmentName: string;
      attachmentMimeType: string;
    };
    expect(body.attachmentMimeType).toBe("image/png");
    expect(body.attachmentName).not.toMatch(/[/#%]/);
    const [key] = [...objects.keys()];
    expect(key).toMatch(/^chat\/[^/]+\/[0-9a-f-]{36}-[^/#%]+$/);

    const served = await call(body.attachmentUrl, {}, owner.cookie);
    expect(served.status).toBe(200);
    expect(served.headers.get("Content-Type")).toBe("image/png");
    expect(served.headers.get("Content-Disposition")).toMatch(/^inline;/);
    expect(served.headers.get("X-Content-Type-Options")).toBe("nosniff");
    // secureHeaders() overwrites the route's own CSP; the global one must therefore keep `sandbox` itself.
    const csp = served.headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("sandbox");
    expect(csp).toContain("default-src 'none'");
    expect(served.headers.get("Cross-Origin-Resource-Policy")).toBe("same-site");
  });

  it("serves a PDF as a download", async () => {
    const { upload, call, owner } = await setup();
    const response = await upload(
      new File(["%PDF-1.4"], "report.pdf", { type: "application/pdf" }),
    );
    const { attachmentUrl } = (await response.json()) as { attachmentUrl: string };
    const served = await call(attachmentUrl, {}, owner.cookie);
    expect(served.headers.get("Content-Disposition")).toMatch(/^attachment; filename="report.pdf"/);
  });

  it("neutralizes an object that was stored as text/html before the allowlist existed", async () => {
    const { objects, call, conversationId, friend } = await setup();
    const key = `chat/${conversationId}/${crypto.randomUUID()}-old.html`;
    objects.set(key, {
      body: new TextEncoder().encode("<script>alert(1)</script>").buffer,
      httpMetadata: { contentType: "text/html" },
    });

    const served = await call(`/api/chat/attachments/${key}`, {}, friend.cookie);
    expect(served.status).toBe(200);
    expect(served.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(served.headers.get("Content-Disposition")).toMatch(/^attachment; filename="old.html"/);
    expect(served.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("still hides attachments from non-members", async () => {
    const { objects, call, conversationId } = await setup();
    const stranger = await signUpTestUser();
    const key = `chat/${conversationId}/${crypto.randomUUID()}-x.png`;
    objects.set(key, { body: new ArrayBuffer(1), httpMetadata: { contentType: "image/png" } });
    expect((await call(`/api/chat/attachments/${key}`, {}, stranger.cookie)).status).toBe(404);
  });
});
