import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test.describe("Service Assignment", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);

    // Clock in an employee first
    await page.click('text=Select employee...');
    await page.click('text=Anna');
    await page.click('button:has-text("In")');
    await page.waitForTimeout(500);
  });

  test("quick assign selects next available employee", async ({ page }) => {
    // Select a service
    await page.click('text=Select a service...');
    await page.click('text=Pedicure');

    // Click assign button
    await page.click('button:has-text("Assign Next")');

    // Should see success toast with employee name
    await expect(page.locator("text=Assigned Pedicure to Anna")).toBeVisible();
  });

  test("assigned turn appears in grid", async ({ page }) => {
    // Assign a service
    await page.click('text=Select a service...');
    await page.click('text=Pedicure');
    await page.click('button:has-text("Assign Next")');

    // Wait for update
    await page.waitForTimeout(500);

    // Turn grid should show the turn
    await expect(page.locator("text=Turn History")).toBeVisible();

    // Should show in-progress indicator (clock icon or amber color)
    await expect(page.locator('[class*="amber"]').first()).toBeVisible();
  });

  test("employee marked as busy after assignment", async ({ page }) => {
    // Assign a service
    await page.click('text=Select a service...');
    await page.click('text=Pedicure');
    await page.click('button:has-text("Assign Next")');

    // Wait for update
    await page.waitForTimeout(500);

    // Employee should show Busy badge
    await expect(page.locator("text=Busy")).toBeVisible();
  });

  test("half-turn shows correct indicator", async ({ page }) => {
    // Select a half-turn service (Manicure - $25)
    await page.click('text=Select a service...');
    await page.click('text=Manicure');
    await page.click('button:has-text("Assign Next")');

    // Wait for update
    await page.waitForTimeout(500);

    // Should show Half badge
    await expect(page.locator("text=Half")).toBeVisible();
  });
});
