import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test.describe("Clock In/Out", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("can clock in an employee", async ({ page }) => {
    // Select an employee from the dropdown
    await page.click('text=Select employee...');
    await page.click('text=Anna');

    // Click clock in button
    await page.click('button:has-text("In")');

    // Should see success toast
    await expect(page.locator("text=Clocked in successfully")).toBeVisible();

    // Employee should appear in queue
    await expect(page.locator('text=Anna').first()).toBeVisible();
  });

  test("clocked-in employee appears in queue", async ({ page }) => {
    // Clock in first employee
    await page.click('text=Select employee...');
    await page.click('text=Anna');
    await page.click('button:has-text("In")');

    // Wait for update
    await page.waitForTimeout(500);

    // Should show NEXT badge
    await expect(page.locator("text=NEXT")).toBeVisible();
  });

  test("can clock out an employee", async ({ page }) => {
    // First clock in
    await page.click('text=Select employee...');
    await page.click('text=Anna');
    await page.click('button:has-text("In")');

    // Wait for clock in to complete
    await page.waitForTimeout(500);

    // Find the clock out button for this employee
    await page.click('button:has-text("Out")');

    // Should see success toast
    await expect(page.locator("text=Clocked out successfully")).toBeVisible();
  });
});
