import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test.describe("Complete Turn", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);

    // Clock in an employee
    await page.click('text=Select employee...');
    await page.click('text=Anna');
    await page.click('button:has-text("In")');
    await page.waitForTimeout(500);

    // Assign a service
    await page.click('text=Select a service...');
    await page.click('text=Pedicure');
    await page.click('button:has-text("Assign Next")');
    await page.waitForTimeout(500);
  });

  test("can complete a turn", async ({ page }) => {
    // Click Done button in the queue list
    await page.click('button:has-text("Done")');

    // Should see success toast
    await expect(page.locator("text=Turn completed")).toBeVisible();
  });

  test("completed turn shows checkmark in grid", async ({ page }) => {
    // Complete the turn
    await page.click('button:has-text("Done")');

    // Wait for update
    await page.waitForTimeout(500);

    // Grid should show green completed indicator
    await expect(page.locator('[class*="green-100"]').first()).toBeVisible();
  });

  test("employee available again after completion", async ({ page }) => {
    // Complete the turn
    await page.click('button:has-text("Done")');

    // Wait for update
    await page.waitForTimeout(500);

    // Employee should no longer show Busy badge
    await expect(page.locator("text=Busy")).not.toBeVisible();

    // Should show Available or NEXT
    const hasNextOrAvailable =
      await page.locator("text=NEXT").isVisible() ||
      await page.locator("text=Available").isVisible();
    expect(hasNextOrAvailable).toBeTruthy();
  });
});
