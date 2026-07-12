import app from "../../src/index";
import { testEnv } from "./test-env";

let userCounter = 0;

/**
 * Signs up a fresh user through the real Better Auth email/password flow
 * (not a shortcut/mock) and returns the session cookie header to attach to
 * subsequent `app.request()` calls, plus the created user's id/email.
 */
export async function signUpTestUser(): Promise<{ cookie: string; userId: string; email: string }> {
  userCounter += 1;
  const email = `test-user-${userCounter}-${Date.now()}@example.com`;
  const password = "correct horse battery staple 42";

  const response = await app.request(
    "/api/auth/sign-up/email",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: `Test User ${userCounter}` }),
    },
    testEnv,
  );

  if (!response.ok) {
    throw new Error(`Sign-up failed: ${response.status} ${await response.text()}`);
  }

  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Sign-up succeeded but no session cookie was returned");
  }
  // Multiple Set-Cookie directives can be comma-joined by fetch's Headers;
  // Better Auth only needs the cookie name=value pairs back, not the
  // Path/HttpOnly/etc. attributes, so keep just the first segment of each.
  const cookie = setCookie
    .split(/,(?=[^;]+?=)/)
    .map((part) => part.split(";")[0])
    .join("; ");

  const body = (await response.clone().json()) as { user?: { id?: string } };
  const userId = body.user?.id;
  if (!userId) {
    throw new Error("Sign-up response did not include a user id");
  }

  return { cookie, userId, email };
}

export function authRequest(
  path: string,
  init: RequestInit,
  cookie: string,
): Promise<Response> {
  return app.request(
    path,
    { ...init, headers: { ...init.headers, Cookie: cookie } },
    testEnv,
  );
}
