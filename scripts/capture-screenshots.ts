/**
 * Captures product screenshots from the LIVE production alias for the README.
 * Uses the public demo account (read-only) for authenticated views.
 * Usage: npx tsx scripts/capture-screenshots.ts [baseUrl]
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "https://careproof-tau.vercel.app";
const outDir = "docs/screenshots";

async function main() {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. landing (light default)
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${outDir}/01-landing.png` });
  console.log("captured 01-landing.png");

  // 2. landing in dark mode (shows the theme toggle)
  await page.click('button[aria-label*="dark" i]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/02-landing-dark.png` });
  console.log("captured 02-landing-dark.png");
  await page.click('button[aria-label*="light" i]');

  // 3. sample report (public share link)
  await page.goto(base + "/", { waitUntil: "networkidle" });
  const sampleHref = await page.getAttribute('a[href^="/r/"]', "href");
  if (sampleHref) {
    await page.goto(base + sampleHref, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${outDir}/03-sample-report.png`, fullPage: true });
    console.log("captured 03-sample-report.png");
  }

  // 4. demo dashboard (authenticated)
  await page.goto(base + "/login", { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "demo@careproof.test");
  await page.fill('input[name="password"]', "demo-password-1");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/04-dashboard.png` });
  console.log("captured 04-dashboard.png");

  // 5. reports page
  await page.goto(base + "/reports", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/05-reports.png` });
  console.log("captured 05-reports.png");

  await browser.close();
}

main().catch((e) => {
  console.error("capture failed:", e.message);
  process.exit(1);
});
