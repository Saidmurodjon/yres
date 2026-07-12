import { expect, test } from "@playwright/test";

/**
 * Verifies the Phase 8 fix end-to-end through the real UI: before Lighting/
 * Equipment were wired into AuditEngine, entering data there had zero
 * effect on any KPI (their measure categories always showed 0 savings, and
 * their consumption wasn't counted anywhere). This creates a building with
 * just enough envelope data for a nonzero floor area, adds a lighting zone
 * via the Systems tab (no ventilation/generation configured, so heating
 * final energy stays exactly 0), and confirms "Current energy use" moves
 * off 0 purely from that.
 */
test("configuring a lighting zone via the Systems tab produces nonzero current energy use", async ({
  page,
}) => {
  const unique = Date.now();
  const email = `e2e-lighting-${unique}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Full name").fill("E2E Lighting User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password1234");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "New Building" }).first().click();
  await page.getByLabel("Name *").fill("E2E Lighting Building");
  await page.getByLabel("Location *").fill("Tashkent");
  await page.getByLabel("Climate region *").click();
  await page.getByRole("option", { name: "Tashkent" }).click();
  await page.getByLabel("Net cooled floor area (m²)").fill("450");
  await page.getByRole("button", { name: "Create building" }).click();
  await expect(page).toHaveURL(/\/buildings\/[0-9a-f-]+$/);
  const buildingUrl = page.url();

  // Audit wizard's envelope step establishes a building block (needed for
  // a nonzero heatedFloorAreaM2 denominator) — skip material selection by
  // leaving wall/roof/floor areas at their quick-setup defaults but never
  // picking a material, so no construction types/elements get created and
  // heating final energy stays exactly 0.
  await page.getByRole("link", { name: "Run Audit" }).click();
  await expect(page.getByRole("heading", { name: "Building footprint" })).toBeVisible();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Historical utility bills (optional)" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await page.getByRole("button", { name: "Run audit" }).click();
  await expect(page).toHaveURL(/\/buildings\/[0-9a-f-]+\/results$/, { timeout: 15_000 });

  const currentEnergyCard = page
    .locator("div.rounded-lg")
    .filter({ has: page.getByText("Current energy use", { exact: true }) });
  await expect(currentEnergyCard).toContainText("0 kWh/m²/yr");

  await page.goto(buildingUrl);
  await page.getByRole("tab", { name: "Systems" }).click();
  await expect(page.getByRole("heading", { name: "Lighting" })).toBeVisible();

  const lightingCard = page
    .locator("div.rounded-lg")
    .filter({ has: page.getByRole("heading", { name: "Lighting" }) });
  await lightingCard.getByRole("button", { name: "Add row" }).click();
  const lightingRow = lightingCard.locator("tbody tr").first();
  const lightingInputs = lightingRow.locator("input");
  await lightingInputs.nth(0).fill("Wards"); // name
  await lightingInputs.nth(1).fill("500"); // areaM2
  await lightingCard.getByRole("button", { name: "Save" }).click();
  await expect(lightingCard.getByText(/Failed to save/)).toHaveCount(0);

  await page.goto(`${buildingUrl}/results`);
  await page.getByRole("button", { name: "Re-run audit" }).click();

  await expect(currentEnergyCard).not.toContainText("0 kWh/m²/yr", { timeout: 10_000 });
});
