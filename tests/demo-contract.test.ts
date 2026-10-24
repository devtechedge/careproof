import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { parseChecksSnapshot } from "@/lib/report";
import { CHECK_META } from "@/lib/checks";

// P0.1 contract: every seeded report item carries the full 11-row check shape
// with statuses consistent with the documented semantics.

beforeAll(async () => {
  // The e2e/vitest global setup pushes schema; the demo seed may or may not
  // have run against this database. Run it deterministically here against the
  // TEST database (the seeder refuses production names on its own).
  const { execSync } = await import("node:child_process");
  execSync("npx tsx scripts/seed-demo.ts", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST ?? "" },
  });
});

describe("demo seed honors the check-row contract", () => {
  it("every demo report item has exactly 11 unique check keys", async () => {
    const items = await prisma.reportItem.findMany({
      where: { siteLabel: { startsWith: "Demo:" } },
    });
    expect(items.length).toBeGreaterThanOrEqual(6);
    for (const item of items) {
      const checks = parseChecksSnapshot(item.checksJson);
      const keys = checks.map((c) => c.checkKey);
      expect(keys, item.siteLabel).toHaveLength(11);
      expect(new Set(keys).size, item.siteLabel).toBe(11);
      for (const key of keys) {
        expect(CHECK_META[key], item.siteLabel).toBeDefined();
      }
    }
  });

  it("the unreachable demo site marks dependent checks as explicit skipped rows", async () => {
    const item = await prisma.reportItem.findFirst({
      where: { siteLabel: "Demo: Fitness Studio (Shopify)" },
    });
    expect(item).not.toBeNull();
    const checks = parseChecksSnapshot(item?.checksJson ?? "[]");
    const byKey = Object.fromEntries(checks.map((c) => [c.checkKey, c]));
    expect(byKey.uptime.status).toBe("fail");
    for (const key of ["ttfb", "weight", "headers", "robots", "sitemap", "favicon", "links"]) {
      expect(byKey[key]?.status, key).toBe("info");
      expect(byKey[key]?.value, key).toBe("Not assessed");
    }
  });

  it("the demo report uses the deterministic public id", async () => {
    const report = await prisma.report.findFirst({
      where: { publicId: "demo00000000000000000000000" },
      include: { items: true },
    });
    expect(report).not.toBeNull();
    expect(report?.items.length).toBe(6);
  });

  it("overall status never reads as pass without at least one verified pass", async () => {
    const items = await prisma.reportItem.findMany({
      where: { siteLabel: { startsWith: "Demo:" } },
    });
    for (const item of items) {
      const checks = parseChecksSnapshot(item.checksJson);
      const passCount = checks.filter((c) => c.status === "pass").length;
      if (passCount === 0) {
        expect(item.overall, item.siteLabel).toBe("info");
      } else {
        expect(["pass", "warn", "fail"], item.siteLabel).toContain(item.overall);
      }
    }
  });
});
