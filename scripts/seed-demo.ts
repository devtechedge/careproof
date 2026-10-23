/**
 * Seeds the demo workspace: demo@careproof.test / demo-password-1
 * Six labelled demo sites with deterministic synthetic check results (NOT live
 * checks) and one published demo report. Safe to re-run: it wipes and recreates
 * only the demo account.
 */
import { randomBytes } from "node:crypto";
import { prisma } from "../lib/db";
import { hashPassword } from "../lib/password";
import { snapshotChecks } from "../lib/report";
import type { CheckOutcome } from "../lib/checks";

function outcomes(siteKey: string): CheckOutcome[] {
  const base: Record<string, Partial<CheckOutcome>[]> = {
    healthy: [
      { checkKey: "uptime", status: "pass", value: "HTTP 200", detail: "Responded in 240 ms." },
      { checkKey: "ttfb", status: "pass", value: "240 ms to first byte" },
      { checkKey: "weight", status: "pass", value: "68 KB of HTML" },
      { checkKey: "ssl", status: "pass", value: "Valid, 210 days left", detail: "Issuer: Let's Encrypt." },
      { checkKey: "httpsRedirect", status: "pass", value: "Redirects to HTTPS" },
      { checkKey: "headers", status: "pass", value: "5/5 standard headers" },
      { checkKey: "robots", status: "pass", value: "Found" },
      { checkKey: "sitemap", status: "pass", value: "Found" },
      { checkKey: "favicon", status: "pass", value: "Configured" },
      { checkKey: "links", status: "pass", value: "25 links OK" },
      { checkKey: "domain", status: "pass", value: "640 days until expiry", detail: "Registrar: MarkMonitor Inc." },
    ],
    sslExpiring: [
      { checkKey: "uptime", status: "pass", value: "HTTP 200", detail: "Responded in 310 ms." },
      { checkKey: "ttfb", status: "pass", value: "310 ms to first byte" },
      { checkKey: "weight", status: "pass", value: "92 KB of HTML" },
      { checkKey: "ssl", status: "warn", value: "Valid, 19 days left", detail: "Issuer: Let's Encrypt. Renew soon." },
      { checkKey: "httpsRedirect", status: "pass", value: "Redirects to HTTPS" },
      { checkKey: "headers", status: "warn", value: "3/5 standard headers", detail: "Missing: Content-Security-Policy, Referrer-Policy." },
      { checkKey: "robots", status: "pass", value: "Found" },
      { checkKey: "sitemap", status: "pass", value: "Found" },
      { checkKey: "favicon", status: "pass", value: "Configured" },
      { checkKey: "links", status: "pass", value: "18 links OK" },
      { checkKey: "domain", status: "pass", value: "380 days until expiry", detail: "Registrar: GoDaddy." },
    ],
    slow: [
      { checkKey: "uptime", status: "pass", value: "HTTP 200", detail: "Responded in 1450 ms." },
      { checkKey: "ttfb", status: "warn", value: "1450 ms to first byte", detail: "Total download 3800 ms." },
      { checkKey: "weight", status: "warn", value: "610 KB of HTML" },
      { checkKey: "ssl", status: "pass", value: "Valid, 90 days left", detail: "Issuer: DigiCert Inc." },
      { checkKey: "httpsRedirect", status: "pass", value: "Redirects to HTTPS" },
      { checkKey: "headers", status: "warn", value: "2/5 standard headers", detail: "Missing: HSTS, CSP, X-Content-Type-Options." },
      { checkKey: "robots", status: "pass", value: "Found" },
      { checkKey: "sitemap", status: "pass", value: "Found" },
      { checkKey: "favicon", status: "pass", value: "Configured" },
      { checkKey: "links", status: "pass", value: "22 links OK" },
      { checkKey: "domain", status: "pass", value: "730 days until expiry", detail: "Registrar: NameCheap." },
    ],
    broken: [
      { checkKey: "uptime", status: "pass", value: "HTTP 200", detail: "Responded in 420 ms." },
      { checkKey: "ttfb", status: "pass", value: "420 ms to first byte" },
      { checkKey: "weight", status: "pass", value: "120 KB of HTML" },
      { checkKey: "ssl", status: "pass", value: "Valid, 155 days left", detail: "Issuer: Let's Encrypt." },
      { checkKey: "httpsRedirect", status: "fail", value: "HTTP status 200", detail: "Visitors on http:// are not redirected to https://." },
      { checkKey: "headers", status: "warn", value: "2/5 standard headers", detail: "Missing: HSTS, CSP, Referrer-Policy." },
      { checkKey: "robots", status: "pass", value: "Found" },
      { checkKey: "sitemap", status: "warn", value: "Not reachable", detail: "Expected at https://demo-law.example/sitemap.xml." },
      { checkKey: "favicon", status: "pass", value: "Configured" },
      { checkKey: "links", status: "fail", value: "6 of 24 broken", detail: "Broken: https://demo-law.example/team, https://demo-law.example/pricing" },
      { checkKey: "domain", status: "warn", value: "34 days until expiry", detail: "Registrar: Tucows." },
    ],
    down: [
      { checkKey: "uptime", status: "fail", value: "No response", detail: "The site did not respond within the timeout." },
      { checkKey: "ssl", status: "info", value: "Could not read certificate" },
      { checkKey: "domain", status: "pass", value: "290 days until expiry", detail: "Registrar: Key-Systems." },
    ],
    domainExpiring: [
      { checkKey: "uptime", status: "pass", value: "HTTP 200", detail: "Responded in 380 ms." },
      { checkKey: "ttfb", status: "pass", value: "380 ms to first byte" },
      { checkKey: "weight", status: "pass", value: "74 KB of HTML" },
      { checkKey: "ssl", status: "pass", value: "Valid, 120 days left", detail: "Issuer: Sectigo." },
      { checkKey: "httpsRedirect", status: "pass", value: "Redirects to HTTPS" },
      { checkKey: "headers", status: "pass", value: "4/5 standard headers", detail: "Missing: Referrer-Policy." },
      { checkKey: "robots", status: "pass", value: "Found" },
      { checkKey: "sitemap", status: "pass", value: "Found" },
      { checkKey: "favicon", status: "warn", value: "Not found" },
      { checkKey: "links", status: "pass", value: "14 links OK" },
      { checkKey: "domain", status: "fail", value: "9 days until expiry", detail: "Registrar: OVH. Renew immediately." },
    ],
  };
  return (base[siteKey] ?? []).map((o) => ({
    checkKey: o.checkKey!,
    status: o.status!,
    value: o.value!,
    detail: o.detail ?? "",
  }));
}

const DEMO_SITES: Array<{ label: string; url: string; key: string }> = [
  { label: "Demo: Bakery Co (WordPress)", url: "https://demo-bakery.example", key: "healthy" },
  { label: "Demo: Northside Dental (Webflow)", url: "https://demo-dental.example", key: "sslExpiring" },
  { label: "Demo: Lakeview Realty (custom)", url: "https://demo-realty.example", key: "slow" },
  { label: "Demo: Legal Partners LLP (WordPress)", url: "https://demo-law.example", key: "broken" },
  { label: "Demo: Fitness Studio (Shopify)", url: "https://demo-fitness.example", key: "down" },
  { label: "Demo: City Electricians (static)", url: "https://demo-electric.example", key: "domainExpiring" },
];

async function main() {
  // Safety interlock: the seeder deletes and recreates the demo account.
  // It must never run against the production database by accident.
  const url = process.env.DATABASE_URL ?? "";
  const dbName = (url.match(/\/([^\/?]+)(\?|$)/) ?? [])[1] ?? "";
  const isProd = dbName === "careproof";
  if (isProd && process.env.ALLOW_PROD_SEED !== "1") {
    console.error(
      `Refusing to seed: DATABASE_URL points at "${dbName}", which looks like production. Set ALLOW_PROD_SEED=1 to override deliberately.`
    );
    process.exit(1);
  }

  const email = "demo@careproof.test";
  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) {
    await prisma.account.delete({ where: { id: existing.id } });
  }
  const account = await prisma.account.create({
    data: {
      email,
      name: "Northside Web Studio (Demo)",
      passwordHash: await hashPassword("demo-password-1"),
      accentColor: "#0f766e",
      plan: "demo",
      isDemo: true,
    },
  });

  const overallOf = (list: CheckOutcome[]) =>
    list.some((c) => c.status === "fail") ? "fail" : list.some((c) => c.status === "warn") ? "warn" : "pass";

  const items: Array<{ siteLabel: string; siteUrl: string; overall: string; checksJson: string; observedAt: Date; fresh: boolean }> = [];
  for (const demo of DEMO_SITES) {
    const site = await prisma.site.create({
      data: { accountId: account.id, label: demo.label, url: demo.url },
    });
    const list = outcomes(demo.key);
    const run = await prisma.checkRun.create({
      data: { siteId: site.id, accountId: account.id, trigger: "seed", status: "ok", finishedAt: new Date() },
    });
    await prisma.checkResult.createMany({
      data: list.map((o) => ({ runId: run.id, ...o })),
    });
    items.push({
      siteLabel: demo.label,
      siteUrl: demo.url,
      overall: overallOf(list),
      checksJson: snapshotChecks(list),
      observedAt: new Date(),
      fresh: false,
    });
  }

  const period = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;
  await prisma.report.create({
    data: {
      accountId: account.id,
      publicId: randomBytes(14).toString("hex"),
      period,
      agencyNote:
        "Sample note: this month we updated plugins across all WordPress sites, fixed broken links on the Legal Partners site, and the Fitness Studio store recovered after a theme app conflict. Domain renewal for City Electricians is scheduled this week.",
      brandingJson: JSON.stringify({
        name: "Northside Web Studio (Demo)",
        accentColor: "#0f766e",
        logoUrl: null,
        contactEmail: "hello@northsidestudio.example",
        isDemo: true,
      }),
      status: "published",
      items: { create: items },
    },
  });

  console.log("Demo workspace seeded: demo@careproof.test / demo-password-1");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
