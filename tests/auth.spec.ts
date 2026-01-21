import { test, expect } from "@playwright/test";
import { TEST_ADMIN, loginAsAdmin } from "./helpers";

test.describe("Authentication", () => {
  test("redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("can login with valid credentials", async ({ page }) => {
    await page.goto("/login");

    // Fill in credentials
    await page.fill('input[type="email"]', TEST_ADMIN.email);
    await page.fill('input[type="password"]', TEST_ADMIN.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL("/");

    // Should see the main POS UI
    await expect(page.locator("text=Nail Salon POS")).toBeVisible();
  });

  test("shows error with invalid credentials", async ({ page }) => {
    await page.goto("/login");

    // Fill in wrong credentials
    await page.fill('input[type="email"]', "wrong@email.com");
    await page.fill('input[type="password"]', "wrongpassword");

    // Submit form
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator("text=Invalid login credentials")).toBeVisible();

    // Should stay on login page
    await expect(page).toHaveURL("/login");
  });

  test("can logout", async ({ page }) => {
    // First login
    await loginAsAdmin(page);

    // Click user dropdown
    await page.click('button:has([class*="Avatar"])');

    // Click logout
    await page.click('text=Sign Out');

    // Should redirect to login
    await expect(page).toHaveURL("/login");
  });
});
