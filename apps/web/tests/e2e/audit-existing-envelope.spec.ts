import { type Page, expect, test } from "@playwright/test";

/** U4: the audit wizard must not replace an existing envelope by default. */
const API = "http://localhost:3001";

async function registerAndCreateBuilding(page: Page) {
  const email = `e2e-audit-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/register");
  await page.locator("#password").waitFor();
  await page.locator("input[type='email']").fill(email);
  await page.locator("#name, [autocomplete='name']").first().fill("Audit Tester");
  await page.locator("#password").fill("password1234");
  await page.locator("#confirm-password").fill("password1234");
  await page.locator("button[type='submit']").click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/buildings/new");
  await page.locator("[id$='-name']").fill("Audit Building");
  await page.locator("[id$='-location']").fill("Tashkent");
  await page.locator("[id$='-climateRegion']").click();
  await page.getByRole("option", { name: "Tashkent" }).click();
  await page.locator("button[type='submit']").click();
  await expect(page).toHaveURL(/\/buildings\/([0-9a-f-]+)$/);
  return page.url().split("/").pop() as string;
}

async function envelopeIds(page: Page, id: string): Promise<string[]> {
  const res = await page.request.get(`${API}/api/buildings/${id}/envelope`);
  const data = await res.json();
  return data.envelopeElements.map((e: { id: string }) => e.id).sort();
}

const consumptionHeading = (page: Page) =>
  page.getByRole("heading", { name: "Historical utility bills (optional)" });

test("existing envelope: wizard starts at consumption, is never replaced without confirmation", async ({
  page,
}) => {
  const id = await registerAndCreateBuilding(page);

  // (d) no envelope yet -> the quick form straight away.
  await page.goto(`/buildings/${id}/audit`);
  await expect(page.getByRole("heading", { name: "Building footprint" })).toBeVisible();
  const materialTriggers = page.locator('button[role="combobox"]');
  for (let i = 0; i < 3; i++) {
    await materialTriggers.nth(i).click();
    await page.getByRole("option").first().click();
  }
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(consumptionHeading(page)).toBeVisible();
  const before = await envelopeIds(page, id);
  expect(before.length).toBeGreaterThan(0);

  // (a) with an envelope the wizard opens at the consumption step.
  await page.goto(`/buildings/${id}/audit`);
  await expect(consumptionHeading(page)).toBeVisible();

  // (b) step 1 is a summary; continuing leaves the envelope untouched.
  await page.getByRole("button", { name: "1", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Envelope already entered" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Building footprint" })).toHaveCount(0);
  await page.getByRole("button", { name: /Continue with the existing envelope/ }).click();
  await expect(consumptionHeading(page)).toBeVisible();
  expect(await envelopeIds(page, id)).toEqual(before);

  // (c) replace -> form -> save asks first; Cancel keeps the envelope.
  await page.getByRole("button", { name: "1", exact: true }).click();
  await page.getByRole("button", { name: /Replace with quick envelope/ }).click();
  await expect(page.getByRole("heading", { name: "Building footprint" })).toBeVisible();
  await page.getByRole("button", { name: "Save and continue" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/cannot be undone/)).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  expect(await envelopeIds(page, id)).toEqual(before);

  // The form has a way back to the summary.
  await page.getByRole("button", { name: "Back to the existing envelope" }).click();
  await expect(page.getByRole("heading", { name: "Envelope already entered" })).toBeVisible();

  // Confirming really replaces it.
  await page.getByRole("button", { name: /Replace with quick envelope/ }).click();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Replace", exact: true }).click();
  await expect(consumptionHeading(page)).toBeVisible();
  expect(await envelopeIds(page, id)).not.toEqual(before);
});

test("a failed envelope load locks the quick form and offers Retry", async ({ page }) => {
  const id = await registerAndCreateBuilding(page);
  await page.route(`**/api/buildings/${id}/envelope`, (route) =>
    route.request().method() === "GET" ? route.abort() : route.continue(),
  );
  await page.goto(`/buildings/${id}/audit`);
  // TanStack Query retries a failing GET with backoff before it reports the error.
  await expect(page.getByRole("heading", { name: "Couldn't load the envelope" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("button", { name: "Save and continue" })).toHaveCount(0);
  await page.unroute(`**/api/buildings/${id}/envelope`);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("heading", { name: "Building footprint" })).toBeVisible();
});

test("375 px: the existing-envelope card buttons fit without horizontal scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const id = await registerAndCreateBuilding(page);
  await page.goto(`/buildings/${id}/audit`);
  const materialTriggers = page.locator('button[role="combobox"]');
  for (let i = 0; i < 3; i++) {
    await materialTriggers.nth(i).click();
    await page.getByRole("option").first().click();
  }
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(consumptionHeading(page)).toBeVisible();
  await page.getByRole("button", { name: "1", exact: true }).click();
  const proceed = page.getByRole("button", { name: /Continue with the existing envelope/ });
  const replace = page.getByRole("button", { name: /Replace with quick envelope/ });
  await expect(proceed).toBeVisible();
  for (const b of [proceed, replace]) {
    const box = await b.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= 375).toBe(true);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
