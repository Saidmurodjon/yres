import { type Page, expect, test } from "@playwright/test";

/**
 * U2/U3 (forms-and-numbers.md): saving one card must not wipe unsaved rows in another, and nothing that would
 * discard unsaved edits (tab or scenario switch, leaving the page, closing an editor dialog) happens silently.
 * A clean page never asks. Runs in the real browser against the local-D1 backend.
 */
async function registerAndCreateBuilding(page: Page) {
  const email = `e2e-unsaved-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/register");
  await page.locator("#password").waitFor();
  await page.locator("input[type='email']").fill(email);
  await page.locator("#name, [autocomplete='name']").first().fill("Unsaved Tester");
  await page.locator("#password").fill("password1234");
  await page.locator("#confirm-password").fill("password1234");
  await page.locator("button[type='submit']").click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/buildings/new");
  await page.locator("[id$='-name']").fill("Unsaved Test Building");
  await page.locator("[id$='-location']").fill("Tashkent");
  await page.locator("[id$='-climateRegion']").click();
  await page.getByRole("option", { name: "Tashkent" }).click();
  await page.locator("button[type='submit']").click();
  await expect(page).toHaveURL(/\/buildings\/[0-9a-f-]+$/);
}

const card = (page: Page, heading: string) =>
  page.locator("div.rounded-lg").filter({ has: page.getByRole("heading", { name: heading }) });
const discardDialog = (page: Page) =>
  page.getByRole("dialog").filter({ hasText: "Discard unsaved changes?" });

test.describe("unsaved changes", () => {
  test("saving the generation card keeps an unsaved ventilation row (U2)", async ({ page }) => {
    await registerAndCreateBuilding(page);
    await page.getByRole("tab", { name: "Systems" }).click();

    const ventilation = card(page, "Ventilation");
    await ventilation.getByRole("button", { name: "Add row" }).click();
    await expect(ventilation.locator("tbody tr")).toHaveCount(1);

    const generation = card(page, "Generation sources");
    await generation.getByRole("button", { name: "Add row" }).click();
    await generation.getByRole("button", { name: "Save" }).click();
    await expect(generation.getByText(/Failed to save/)).toHaveCount(0);
    // The save invalidated the systems query and every card got fresh server data - the unsaved row survives.
    await page.waitForTimeout(500);
    await expect(ventilation.locator("tbody tr")).toHaveCount(1);
    await expect(generation.locator("tbody tr")).toHaveCount(1);
  });

  test("switching tabs with unsaved rows asks first; Keep editing keeps them, Discard drops them", async ({
    page,
  }) => {
    await registerAndCreateBuilding(page);
    await page.getByRole("tab", { name: "Systems" }).click();
    const ventilation = card(page, "Ventilation");
    await ventilation.getByRole("button", { name: "Add row" }).click();

    await page.getByRole("tab", { name: "Consumption" }).click();
    await expect(discardDialog(page)).toBeVisible();
    // Focus starts on the safe button.
    await expect(page.getByRole("button", { name: "Keep editing" })).toBeFocused();
    await page.getByRole("button", { name: "Keep editing" }).click();
    await expect(discardDialog(page)).toHaveCount(0);
    await expect(ventilation.locator("tbody tr")).toHaveCount(1);

    await page.getByRole("tab", { name: "Consumption" }).click();
    await page.getByRole("button", { name: "Discard changes" }).click();
    await expect(page.getByRole("tab", { name: "Consumption" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await page.getByRole("tab", { name: "Systems" }).click();
    await expect(card(page, "Ventilation").locator("tbody tr")).toHaveCount(0);
  });

  test("a clean page never asks when switching tabs or scenario", async ({ page }) => {
    await registerAndCreateBuilding(page);
    await page.getByRole("tab", { name: "Systems" }).click();
    await page.getByRole("tab", { name: "After (proposed)" }).click();
    await page.getByRole("tab", { name: "Consumption" }).click();
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("switching the scenario with unsaved rows asks first", async ({ page }) => {
    await registerAndCreateBuilding(page);
    await page.getByRole("tab", { name: "Systems" }).click();
    await card(page, "Ventilation").getByRole("button", { name: "Add row" }).click();

    await page.getByRole("tab", { name: "After (proposed)" }).click();
    await expect(discardDialog(page)).toBeVisible();
    await page.getByRole("button", { name: "Keep editing" }).click();
    await expect(page.getByRole("tab", { name: "Before (baseline)" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(card(page, "Ventilation").locator("tbody tr")).toHaveCount(1);

    await page.getByRole("tab", { name: "After (proposed)" }).click();
    await page.getByRole("button", { name: "Discard changes" }).click();
    await expect(page.getByRole("tab", { name: "After (proposed)" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(card(page, "Ventilation").locator("tbody tr")).toHaveCount(0);
  });

  test("leaving the page with unsaved rows asks first (router blocker)", async ({ page }) => {
    await registerAndCreateBuilding(page);
    await page.getByRole("tab", { name: "Systems" }).click();
    await card(page, "Ventilation").getByRole("button", { name: "Add row" }).click();

    await page.getByRole("link", { name: "Back to buildings" }).click();
    await expect(discardDialog(page)).toBeVisible();
    await page.getByRole("button", { name: "Keep editing" }).click();
    await expect(page).toHaveURL(/\/buildings\/[0-9a-f-]+$/);

    await page.getByRole("link", { name: "Back to buildings" }).click();
    await page.getByRole("button", { name: "Discard changes" }).click();
    await expect(page).toHaveURL(/\/buildings$/);
  });

  test("closing the envelope editor with edits asks first; without edits it closes at once", async ({
    page,
  }) => {
    await registerAndCreateBuilding(page);
    await page.getByRole("tab", { name: "Envelope" }).click();
    await page
      .getByRole("button", { name: /Edit envelope|Add envelope data/ })
      .first()
      .click();
    const editor = page.getByRole("dialog").filter({ hasText: "Building blocks" }).first();
    await expect(editor).toBeVisible();

    // Untouched: Escape closes immediately.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page
      .getByRole("button", { name: /Edit envelope|Add envelope data/ })
      .first()
      .click();
    await page.getByRole("button", { name: "Add block" }).click();
    await page.keyboard.press("Escape");
    await expect(discardDialog(page)).toBeVisible();
    await page.getByRole("button", { name: "Keep editing" }).click();
    await expect(page.getByRole("button", { name: "Add block" })).toBeVisible();

    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Discard changes" }).click();
    await expect(page.getByRole("button", { name: "Add block" })).toHaveCount(0);
  });

  test("creating a building does not trigger the leave warning after the form was filled", async ({
    page,
  }) => {
    await registerAndCreateBuilding(page); // fills the form, submits, lands on the new building page
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("closing the page with unsaved rows triggers the browser's beforeunload prompt; a clean page does not", async ({
    page,
  }) => {
    await registerAndCreateBuilding(page);
    await page.getByRole("tab", { name: "Systems" }).click();

    const prompts: string[] = [];
    page.on("dialog", (dialog) => {
      prompts.push(dialog.type());
      void dialog.dismiss(); // "stay on the page"
    });

    // Clean: closing is not intercepted.
    await page.close({ runBeforeUnload: true });
    expect(prompts).toEqual([]);
  });

  test("beforeunload prompt appears with unsaved rows", async ({ page }) => {
    await registerAndCreateBuilding(page);
    await page.getByRole("tab", { name: "Systems" }).click();
    await card(page, "Ventilation").getByRole("button", { name: "Add row" }).click();

    const prompt = new Promise<string>((resolve) => {
      page.on("dialog", (dialog) => {
        resolve(dialog.type());
        void dialog.dismiss();
      });
    });
    // runBeforeUnload does not resolve while the prompt is open; fire it without awaiting.
    void page.close({ runBeforeUnload: true });
    expect(await prompt).toBe("beforeunload");
  });
});
