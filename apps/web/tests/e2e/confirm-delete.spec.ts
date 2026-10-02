import { type Page, expect, test } from "@playwright/test";

/** U7: deleting a server object asks first; Cancel keeps it, focus starts on the safe button. */
async function registerAndCreateBuilding(page: Page) {
  const email = `e2e-delete-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/register");
  await page.locator("#password").waitFor();
  await page.locator("input[type='email']").fill(email);
  await page.locator("#name, [autocomplete='name']").first().fill("Delete Tester");
  await page.locator("#password").fill("password1234");
  await page.locator("#confirm-password").fill("password1234");
  await page.locator("button[type='submit']").click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/buildings/new");
  await page.locator("[id$='-name']").fill("Delete Test Building");
  await page.locator("[id$='-location']").fill("Tashkent");
  await page.locator("[id$='-climateRegion']").click();
  await page.getByRole("option", { name: "Tashkent" }).click();
  await page.locator("button[type='submit']").click();
  await expect(page).toHaveURL(/\/buildings\/[0-9a-f-]+$/);
}

test("deleting a measure asks first: Cancel keeps it, Delete removes it", async ({ page }) => {
  await registerAndCreateBuilding(page);
  await page.getByRole("tab", { name: "Measures" }).click();

  await page.locator("#measure-name").fill("Wall insulation");
  await page.locator("#measure-investment").fill("12 500,5");
  await page
    .getByRole("button", { name: /^Add measure$|^Add$/ })
    .first()
    .click();
  const row = page.getByRole("row").filter({ hasText: "Wall insulation" });
  await expect(row).toBeVisible();

  await page.getByRole("button", { name: "Delete Wall insulation" }).click();
  const dialog = page.getByRole("dialog").filter({ hasText: "will be deleted" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row).toBeVisible();

  await page.getByRole("button", { name: "Delete Wall insulation" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(row).toHaveCount(0);
});

test("deleting a building: focus starts on Cancel, Cancel keeps it, confirming deletes it and leaves without a warning", async ({
  page,
}) => {
  await registerAndCreateBuilding(page);
  const buildingUrl = page.url();

  await page.getByRole("button", { name: "Delete", exact: true }).first().click();
  const dialog = page.getByRole("dialog").filter({ hasText: "permanently deletes the building" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(buildingUrl);

  await page.getByRole("button", { name: "Delete", exact: true }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete building" }).click();
  await expect(page).toHaveURL(/\/buildings$/);
});
