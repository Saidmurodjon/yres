import { expect, test } from "@playwright/test";

/**
 * Verifies the Phase 7 report-generation feature end-to-end: creates a
 * building, gives it an envelope, runs an audit, then clicks "Download
 * report" on the Results page and confirms a real PDF file lands in the
 * browser's download.
 */
test("downloads a PDF audit report from the Results page", async ({ page }) => {
  const unique = Date.now();
  const email = `e2e-report-${unique}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Full name").fill("E2E Report User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password1234");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "New Building" }).first().click();
  await page.getByLabel("Name *").fill("E2E Report Building");
  await page.getByLabel("Location *").fill("Tashkent");
  await page.getByLabel("Climate region *").click();
  await page.getByRole("option", { name: "Tashkent" }).click();
  await page.getByLabel("Net cooled floor area (m²)").fill("450");
  await page.getByRole("button", { name: "Create building" }).click();
  await expect(page).toHaveURL(/\/buildings\/[0-9a-f-]+$/);

  await page.getByRole("link", { name: "Run Audit" }).click();
  await expect(page.getByRole("heading", { name: "Building footprint" })).toBeVisible();
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
  await page.getByRole("button", { name: "Run audit" }).click();
  await expect(page).toHaveURL(/\/buildings\/[0-9a-f-]+\/results$/, { timeout: 15_000 });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download report" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
});
