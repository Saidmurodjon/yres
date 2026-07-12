import { expect, test } from "@playwright/test";

/**
 * Verifies Phase 10 end-to-end through the real UI: a building owner invites
 * a second, already-registered user as a viewer. The viewer then sees the
 * building read-only (no edit controls, a view-only banner) but can still
 * navigate to it and see its data.
 */
test("owner invites a viewer, who sees the building read-only", async ({ browser }) => {
  const unique = Date.now();
  const ownerEmail = `e2e-share-owner-${unique}@example.com`;
  const viewerEmail = `e2e-share-viewer-${unique}@example.com`;

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();

  // Register the viewer first so they exist as a real account to invite.
  const viewerContext = await browser.newContext();
  const viewerPage = await viewerContext.newPage();
  await viewerPage.goto("/register");
  await viewerPage.getByLabel("Full name").fill("E2E Share Viewer");
  await viewerPage.getByLabel("Email").fill(viewerEmail);
  await viewerPage.getByLabel("Password").fill("password1234");
  await viewerPage.getByRole("button", { name: "Create account" }).click();
  await expect(viewerPage).toHaveURL(/\/dashboard$/);

  // Owner registers and creates a building.
  await ownerPage.goto("/register");
  await ownerPage.getByLabel("Full name").fill("E2E Share Owner");
  await ownerPage.getByLabel("Email").fill(ownerEmail);
  await ownerPage.getByLabel("Password").fill("password1234");
  await ownerPage.getByRole("button", { name: "Create account" }).click();
  await expect(ownerPage).toHaveURL(/\/dashboard$/);

  await ownerPage.getByRole("link", { name: "New Building" }).first().click();
  await ownerPage.getByLabel("Name *").fill("E2E Shared Building");
  await ownerPage.getByLabel("Location *").fill("Tashkent");
  await ownerPage.getByLabel("Climate region *").click();
  await ownerPage.getByRole("option", { name: "Tashkent" }).click();
  await ownerPage.getByLabel("Net cooled floor area (m²)").fill("450");
  await ownerPage.getByRole("button", { name: "Create building" }).click();
  await expect(ownerPage).toHaveURL(/\/buildings\/[0-9a-f-]+$/);
  const buildingUrl = ownerPage.url();

  // Owner invites the viewer via the Sharing tab. The Radix Select trigger
  // isn't tied to its <Label> by htmlFor, so target it by role/attribute
  // instead of getByLabel (same pattern as golden-path.spec.ts).
  await ownerPage.getByRole("tab", { name: "Sharing" }).click();
  await ownerPage.getByLabel("Email").fill(viewerEmail);
  await ownerPage.locator('button[role="combobox"]').click();
  await ownerPage.getByRole("option", { name: /Viewer/ }).click();
  await ownerPage.getByRole("button", { name: "Invite" }).click();
  await expect(ownerPage.getByRole("row").filter({ hasText: viewerEmail })).toBeVisible();

  // Viewer navigates directly to the shared building and sees it read-only.
  await viewerPage.goto(buildingUrl);
  await expect(viewerPage.getByText("E2E Shared Building")).toBeVisible();
  await expect(viewerPage.getByText("Viewer access")).toBeVisible();
  await expect(
    viewerPage.getByText("You have view-only access to this building — changes are disabled."),
  ).toBeVisible();

  // No Edit/Delete buttons on Overview for a viewer.
  await expect(viewerPage.getByRole("button", { name: "Edit" })).toHaveCount(0);
  await expect(viewerPage.getByRole("button", { name: "Delete" })).toHaveCount(0);

  // Envelope tab has no "Edit envelope" / "Add envelope data" button.
  await viewerPage.getByRole("tab", { name: "Envelope" }).click();
  await expect(viewerPage.getByRole("button", { name: "Edit envelope" })).toHaveCount(0);
  await expect(viewerPage.getByRole("button", { name: "Add envelope data" })).toHaveCount(0);

  // Consumption tab has no "Add a bill" form.
  await viewerPage.getByRole("tab", { name: "Consumption" }).click();
  await expect(viewerPage.getByText("Add a bill")).toHaveCount(0);

  // Sharing tab, for a non-owner, has no invite form and no role editor.
  await viewerPage.getByRole("tab", { name: "Sharing" }).click();
  await expect(viewerPage.getByText("Invite someone")).toHaveCount(0);
  await expect(viewerPage.getByRole("row").filter({ hasText: viewerEmail })).toBeVisible();

  await ownerContext.close();
  await viewerContext.close();
});
