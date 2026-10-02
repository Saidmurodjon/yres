import { type Page, expect, test } from "@playwright/test";

/** U5/U6: consumption edits are saved together and an emptied carrier is really cleared on the server. */
async function registerAndCreateBuilding(page: Page) {
  const email = `e2e-cons-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/register");
  await page.locator("#password").waitFor();
  await page.locator("input[type='email']").fill(email);
  await page.locator("#name, [autocomplete='name']").first().fill("Consumption Tester");
  await page.locator("#password").fill("password1234");
  await page.locator("#confirm-password").fill("password1234");
  await page.locator("button[type='submit']").click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/buildings/new");
  await page.locator("[id$='-name']").fill("Consumption Building");
  await page.locator("[id$='-location']").fill("Tashkent");
  await page.locator("[id$='-climateRegion']").click();
  await page.getByRole("option", { name: "Tashkent" }).click();
  await page.locator("button[type='submit']").click();
  await expect(page).toHaveURL(/\/buildings\/[0-9a-f-]+$/);
}

const cell = (page: Page, carrier: string, month: string) =>
  page.getByLabel(`${carrier} — ${month} consumption`);

test("saves two years in one click; clearing a carrier removes it from the server; an unreadable cell blocks the save", async ({
  page,
}) => {
  await registerAndCreateBuilding(page);
  await page.getByRole("tab", { name: "Consumption" }).click();
  // The grids are built from the server data once it has loaded; typing before that is overwritten.
  await page.waitForLoadState("networkidle");
  const saveButton = page.getByRole("button", { name: /^Save changes/ });
  await expect(saveButton).toBeDisabled(); // clean: nothing to save

  const year = new Date().getFullYear();
  await cell(page, "Gas", "January").fill("12,5");
  await expect(saveButton).toBeEnabled();
  await page.getByRole("tab", { name: new RegExp(`${year - 1}`) }).click();
  await cell(page, "Gas", "February").fill("7");
  await expect(page.getByRole("img", { name: "Unsaved changes" })).toHaveCount(2);

  // An unreadable cell stops everything and names it.
  await cell(page, "Gas", "March").fill("12abc");
  await saveButton.click();
  await expect(page.getByText(/not saved|nothing was saved/i)).toBeVisible();
  await cell(page, "Gas", "March").fill("");

  await saveButton.click();
  await expect(page.getByText("All changes saved.")).toBeVisible();
  await expect(saveButton).toBeDisabled();

  await page.reload();
  await page.getByRole("tab", { name: "Consumption" }).click();
  await expect(cell(page, "Gas", "January")).toHaveValue("12.5");
  await page.getByRole("tab", { name: new RegExp(`${year - 1}`) }).click();
  await expect(cell(page, "Gas", "February")).toHaveValue("7");

  // Clear the carrier completely -> save -> gone after reload.
  await cell(page, "Gas", "February").fill("");
  await saveButton.click();
  await expect(page.getByText("All changes saved.")).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Consumption" }).click();
  await page.getByRole("tab", { name: new RegExp(`${year - 1}`) }).click();
  await expect(cell(page, "Gas", "February")).toHaveValue("");
  await page
    .getByRole("tab", { name: new RegExp(`${year}`) })
    .first()
    .click();
  await expect(cell(page, "Gas", "January")).toHaveValue("12.5");
});
