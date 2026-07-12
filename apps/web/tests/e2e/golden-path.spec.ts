import { expect, test } from "@playwright/test";

/**
 * Golden-path E2E test: register -> create building -> quick envelope setup
 * -> skip consumption -> run audit -> view results. Mirrors the brief's
 * "5 minute audit" flow. Runs against the real Hono app (tests/e2e/server.ts
 * in apps/api) backed by a local Postgres instance seeded with real
 * reference data (see packages/db/src/seed.ts).
 */
test("register, create building, run a quick audit, and see results", async ({ page }) => {
  const unique = Date.now();
  const email = `e2e-${unique}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Full name").fill("E2E Test User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password1234");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByRole("link", { name: "New Building" }).first().click();
  await expect(page).toHaveURL(/\/buildings\/new$/);

  await page.getByLabel("Name *").fill("E2E Test Building");
  await page.getByLabel("Location *").fill("Tashkent");
  await page.getByLabel("Climate region *").click();
  await page.getByRole("option", { name: "Tashkent" }).click();
  await page.getByLabel("Net cooled floor area (m²)").fill("450");

  await page.getByRole("button", { name: "Create building" }).click();
  await expect(page).toHaveURL(/\/buildings\/[0-9a-f-]+$/);

  await page.getByRole("link", { name: "Run Audit" }).click();
  await expect(page).toHaveURL(/\/buildings\/[0-9a-f-]+\/audit$/);

  await expect(page.getByRole("heading", { name: "Building footprint" })).toBeVisible();

  // The quick-envelope form ships with sensible area/thickness defaults for
  // walls, roof, and ground floor — only the material needs picking. Radix
  // Select renders a hidden native <select> alongside the visible trigger
  // button (for form-autofill semantics), which shares the "combobox" ARIA
  // role and confuses role+accessible-name based lookups here, so target
  // the trigger buttons directly by tag/attribute and DOM position instead
  // (wall, roof, floor, in that fixed JSX order).
  const materialTriggers = page.locator('button[role="combobox"]');
  for (let i = 0; i < 3; i++) {
    await materialTriggers.nth(i).click();
    await page.getByRole("option").first().click();
  }

  await page.getByRole("button", { name: "Save and continue" }).click();

  await expect(
    page.getByRole("heading", { name: "Historical utility bills (optional)" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();

  await expect(page.getByRole("heading", { name: "Ready to run" })).toBeVisible();
  await page.getByRole("button", { name: "Run audit" }).click();

  await expect(page).toHaveURL(/\/buildings\/[0-9a-f-]+\/results$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Audit Results" })).toBeVisible();
  await expect(page.getByText("Current energy use")).toBeVisible();
  await expect(page.getByText("Potential savings")).toBeVisible();
});
