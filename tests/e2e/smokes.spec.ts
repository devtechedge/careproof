import { expect, test } from "@playwright/test";

test("landing shows the product and a sample report link", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/CareProof/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("proof", { ignoreCase: true });
  await expect(page.getByRole("link", { name: "See a sample report" })).toBeVisible();
});

test("theme toggle switches the page to dark and back", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.click('button[aria-label="Switch to dark mode"]');
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(darkBg).not.toBe("rgb(233, 237, 243)");
  await page.click('button[aria-label="Switch to light mode"]');
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("demo login lands on a read-only dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "demo@careproof.test");
  await page.fill('input[name="password"]', "demo-password-1");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("shared demo workspace", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Add site" })).toHaveCount(0);
});

test("sample report renders observations with timestamps", async ({ page }) => {
  await page.goto("/");
  await page.click('a[href^="/r/"]');
  await expect(page.getByText(/Observed .*(UTC)/).first()).toBeVisible();
  await expect(page.getByText("point-in-time", { ignoreCase: true })).toBeVisible();
});

test("signup creates a working account", async ({ page }) => {
  const email = `smoke-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.fill('input[name="name"]', "Smoke Test Studio");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password1234");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "Your sites" })).toBeVisible();
});
