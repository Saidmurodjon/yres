import { expect, test } from "@playwright/test";

/**
 * Verifies the Phase 6 fix end-to-end through the real UI: before the
 * Systems tab existed, a building could never get a generation source
 * configured, so "Current energy use" on the Results page always read 0
 * regardless of envelope/heat-loss data. This creates a building, gives it
 * an envelope (enough for a nonzero heating need), configures a ventilation
 * system and a heating generation source via the new Systems tab, and
 * confirms the KPI comes back nonzero after a re-run.
 */
test("configuring ventilation + generation via the Systems tab produces nonzero purchased energy", async ({
  page,
}) => {
  const unique = Date.now();
  const email = `e2e-systems-${unique}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Full name").fill("E2E Systems User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password1234");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "New Building" }).first().click();
  await page.getByLabel("Name *").fill("E2E Systems Building");
  await page.getByLabel("Location *").fill("Tashkent");
  await page.getByLabel("Climate region *").click();
  await page.getByRole("option", { name: "Tashkent" }).click();
  await page.getByLabel("Net cooled floor area (m²)").fill("450");
  await page.getByRole("button", { name: "Create building" }).click();
  await expect(page).toHaveURL(/\/buildings\/[0-9a-f-]+$/);
  const buildingUrl = page.url();

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

  // The shadcn Card primitive is the only element with the "rounded-lg"
  // class in this tree, so scoping by it (rather than a bare `div` filter,
  // which also matches every non-Card ancestor wrapper up to <body>) gives
  // exactly one match per card.
  const currentEnergyCardBefore = page
    .locator("div.rounded-lg")
    .filter({ has: page.getByText("Current energy use", { exact: true }) });
  await expect(currentEnergyCardBefore).toContainText("0 kWh/m²/yr");

  await page.goto(buildingUrl);
  await page.getByRole("tab", { name: "Systems" }).click();
  await expect(page.getByRole("heading", { name: "Ventilation" })).toBeVisible();

  const ventilationCard = page
    .locator("div.rounded-lg")
    .filter({ has: page.getByRole("heading", { name: "Ventilation" }) });
  await ventilationCard.getByRole("button", { name: "Add row" }).click();
  const ventilationRow = ventilationCard.locator("tbody tr").first();
  await ventilationRow.locator("input").first().fill("0.5");
  await ventilationCard.getByRole("button", { name: "Save" }).click();
  await expect(ventilationCard.getByText(/Failed to save/)).toHaveCount(0);

  const generationCard = page
    .locator("div.rounded-lg")
    .filter({ has: page.getByRole("heading", { name: "Generation sources" }) });
  // The default new row is already a "heating" / "gas_boiler" source with a
  // sensible efficiency — no field edits needed, just add and save it.
  await generationCard.getByRole("button", { name: "Add row" }).click();
  await generationCard.getByRole("button", { name: "Save" }).click();
  await expect(generationCard.getByText(/Failed to save/)).toHaveCount(0);

  await page.goto(`${buildingUrl}/results`);
  await page.getByRole("button", { name: "Re-run audit" }).click();

  const currentEnergyCardAfter = page
    .locator("div.rounded-lg")
    .filter({ has: page.getByText("Current energy use", { exact: true }) });
  await expect(currentEnergyCardAfter).not.toContainText("0 kWh/m²/yr", { timeout: 10_000 });
});
