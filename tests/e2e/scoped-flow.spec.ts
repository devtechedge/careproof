import { expect, test } from "@playwright/test";
import { getAccountIdByEmail, getAccountSites, seedCheckRun } from "./db";

// P0.2 + P1.11: signup input retention and the full scoped report lifecycle.

test("signup validation error preserves entered values", async ({ page }) => {
  await page.goto("/signup");
  const email = `retain-${Date.now()}@example.com`;
  await page.fill('input[name="name"]', "Retention Studio");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "short");
  await page.click('button[type="submit"]');
  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(page.locator('input[name="name"]')).toHaveValue("Retention Studio");
  await expect(page.locator('input[name="email"]')).toHaveValue(email);
});

test("scoped report: generate, review, publish, share, unpublish, 404", async ({ page }) => {
  const email = `scoped-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.fill('input[name="name"]', "Scoped Studio");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password1234");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");

  // add two sites (URL validation only; no network at add time); wait for each
  // server action to land before starting the next
  await page.fill('input[name="label"]', "Client One");
  await page.fill('input[name="url"]', "https://one-scoped.example");
  await page.click('button:has-text("Add site")');
  await expect(page.getByText("Client One").first()).toBeVisible({ timeout: 20000 });
  await page.fill('input[name="label"]', "Client Two");
  await page.fill('input[name="url"]', "https://two-scoped.example");
  await page.click('button:has-text("Add site")');
  await expect(page.getByText("Client Two").first()).toBeVisible({ timeout: 20000 });

  // seed check results directly (raw pg, test DB) so generation needs no network
  const accountId = await getAccountIdByEmail(email);
  expect(accountId).toBeTruthy();
  const sites = await getAccountSites(accountId!);
  expect(sites).toHaveLength(2);
  for (const site of sites) {
    await seedCheckRun(accountId!, site.id);
  }

  // generate a client report scoped to the first site only
  await page.check('input[name="siteIds"][value="' + sites[0].id + '"]');
  await page.fill('input[name="scopeLabel"]', "Client One");
  await page.click('button:has-text("Generate client report")');
  await page.waitForURL("**/reports/**");
  await expect(page.getByText("Client report - Client One")).toBeVisible();
  await expect(page.getByText("Client Two")).toHaveCount(0);

  // publish and verify the share link shows only the scoped site
  await page.click('button:has-text("Publish")');
  await expect(page.getByRole("button", { name: "Unpublish" })).toBeVisible({ timeout: 20000 });
  const sharePath = await page.evaluate(() => {
    const m = document.documentElement.innerHTML.match(/\/r\/[a-f0-9]+/);
    return m ? m[0] : null;
  });
  expect(sharePath).toBeTruthy();
  const pub = await page.request.get(sharePath!);
  expect(pub.status()).toBe(200);
  const pubText = await pub.text();
  expect(pubText).toContain("Client One");
  expect(pubText).not.toContain("Client Two");

  // unpublish revokes immediately; wait for the action to land
  await page.click('button:has-text("Unpublish")');
  await expect(page.getByRole("button", { name: "Publish" })).toBeVisible({ timeout: 20000 });
  const revoked = await page.request.get(sharePath!);
  expect(revoked.status()).toBe(404);

  // report list shows the client scope label
  await page.goto("/reports");
  await expect(page.getByText("Client One").first()).toBeVisible();
});
