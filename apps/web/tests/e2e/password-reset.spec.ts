import { expect, test } from "@playwright/test";

/**
 * Verifies the Phase 11 fix through the real UI: previously there was no
 * "Forgot password?" link and no pages for the reset flow at all — the
 * only recovery path Better Auth exposes (request-password-reset /
 * reset-password) was completely unreachable from the app. The full loop
 * (receiving a real token and completing a reset) is covered at the API
 * level by apps/api/tests/integration/password-reset.test.ts, since
 * RESEND_API_KEY isn't configured for this test server and no email
 * actually sends — this covers the browser-reachable parts: navigation,
 * the "check your inbox" confirmation, and the invalid/missing-token error
 * states on the landing page a real email link points to.
 */
test("forgot-password flow is reachable from login and handles invalid tokens", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);

  const unique = Date.now();
  await page.getByLabel("Email").fill(`e2e-reset-${unique}@example.com`);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/reset link is on its way/)).toBeVisible();

  // A user opening the reset page without a token (link expired, or typed
  // in directly) sees a clear error and a way back, not a broken form.
  await page.goto("/reset-password");
  await expect(page.getByText(/invalid or expired/)).toBeVisible();
  await page.getByRole("link", { name: "Request a new one" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);

  // A bogus/expired token reaches the real API and surfaces its error.
  await page.goto("/reset-password?token=not-a-real-token");
  await page.getByLabel("New password").fill("some new password 123");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText(/expired|invalid/i)).toBeVisible();
});
