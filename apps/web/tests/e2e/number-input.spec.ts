import { type Page, expect, test } from "@playwright/test";

/**
 * U1 (forms-and-numbers.md): what an uz/ru/en user types into a number field is read in the APP's language
 * and never silently becomes a different number or 0. Drives the real new-building form and reads the saved
 * value back from the API.
 */
const API_URL = `http://localhost:${process.env.E2E_API_PORT ?? 3001}`;

async function register(page: Page, language: "uz" | "ru" | "en") {
  await page.addInitScript((lang) => localStorage.setItem("yres-language", lang), language);
  const email = `e2e-number-${language}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/register");
  await page.locator("#name, [autocomplete='name']").first().fill("Number Tester");
  await page.locator("input[type='email']").fill(email);
  await page.locator("#password").fill("password1234");
  await page.locator("#confirm-password").fill("password1234");
  await page.locator("button[type='submit']").click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function openNewBuildingForm(page: Page) {
  await page.goto("/buildings/new");
  await page.locator("[id$='-name']").fill("Number Test Building");
  await page.locator("[id$='-location']").fill("Tashkent");
  await page.locator("[id$='-climateRegion']").click();
  await page.getByRole("option", { name: "Tashkent" }).click();
}

async function createWithFloorArea(page: Page, raw: string): Promise<number | null> {
  await openNewBuildingForm(page);
  await page.locator("[id$='-floorArea']").fill(raw);
  await page.locator("button[type='submit']").click();
  await expect(page).toHaveURL(/\/buildings\/[0-9a-f-]+$/);
  const id = page.url().split("/").pop();
  const response = await page.request.get(`${API_URL}/api/buildings/${id}`);
  const body = (await response.json()) as { building: { netCooledFloorAreaM2: number | null } };
  return body.building.netCooledFloorAreaM2;
}

test.describe("number input in the new-building form", () => {
  test("12,5 and 12.5 both mean 12.5 in uz", async ({ page }) => {
    await register(page, "uz");
    expect(await createWithFloorArea(page, "12,5")).toBe(12.5);
    expect(await createWithFloorArea(page, "12.5")).toBe(12.5);
  });

  test("1 234,5 means 1234.5 in ru", async ({ page }) => {
    await register(page, "ru");
    expect(await createWithFloorArea(page, "1 234,5")).toBe(1234.5);
  });

  test("1,234 is one thousand two hundred thirty-four in en", async ({ page }) => {
    await register(page, "en");
    expect(await createWithFloorArea(page, "1,234")).toBe(1234);
  });

  test("1,234 is 1.234 in uz", async ({ page }) => {
    await register(page, "uz");
    expect(await createWithFloorArea(page, "1,234")).toBe(1.234);
  });

  test("12abc is refused with a visible message and nothing is saved", async ({ page }) => {
    await register(page, "en");
    await openNewBuildingForm(page);
    const field = page.locator("[id$='-floorArea']");
    await field.fill("12abc");
    await field.blur();
    await expect(page.getByRole("alert").filter({ hasText: "Enter a number" })).toBeVisible();
    await expect(field).toHaveAttribute("aria-invalid", "true");

    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/\/buildings\/new$/);
    await expect(page.getByText("Net cooled floor area").first()).toBeVisible();
  });
});
