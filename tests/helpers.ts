import { Page } from "@playwright/test";

// Test credentials - these should match your seed data
export const TEST_ADMIN = {
  email: "admin@salon.com",
  password: "changeme123",
};

export async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', TEST_ADMIN.email);
  await page.fill('input[type="password"]', TEST_ADMIN.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/");
}

export async function logout(page: Page) {
  // Click user dropdown and logout
  await page.click('button:has-text("Sign Out")');
  await page.waitForURL("/login");
}
