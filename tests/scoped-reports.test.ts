import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  addSite,
  createAccount,
  generateReport,
  getReportByPublicId,
  publishReport,
} from "@/lib/services";
import { overallFor, summarizeChecks } from "@/lib/report";

let accountA: string;
let accountB: string;

async function seedRun(siteId: string, accountId: string, status: string) {
  const run = await prisma.checkRun.create({
    data: { siteId, accountId, trigger: "seed", status: "ok", finishedAt: new Date() },
  });
  await prisma.checkResult.createMany({
    data: [
      { runId: run.id, checkKey: "uptime", status, value: "HTTP 200", detail: "" },
      { runId: run.id, checkKey: "ssl", status: "pass", value: "Valid, 90 days left", detail: "" },
    ],
  });
}

beforeAll(async () => {
  await prisma.account.deleteMany({
    where: { email: { in: ["scope-a@test.example", "scope-b@test.example", "scope-plan@test.example", "scope-plan-evil@test.example"] } },
  });
  const a = await createAccount({ email: "scope-a@test.example", password: "password1234", name: "Scope A" });
  const b = await createAccount({ email: "scope-b@test.example", password: "password1234", name: "Scope B" });
  if (!a.ok || !b.ok) throw new Error("setup failed");
  accountA = a.data.accountId;
  accountB = b.data.accountId;
});

beforeEach(async () => {
  await prisma.report.deleteMany({});
  await prisma.checkResult.deleteMany({});
  await prisma.checkRun.deleteMany({});
  await prisma.site.deleteMany({});
});

describe("scoped client reports (P0)", () => {
  it("includes only the selected sites", async () => {
    const s1 = await addSite(accountA, "Client One", "https://one-scope.example");
    const s2 = await addSite(accountA, "Client Two", "https://two-scope.example");
    if (!s1.ok || !s2.ok) throw new Error("setup");
    await seedRun(s1.data.siteId, accountA, "pass");
    await seedRun(s2.data.siteId, accountA, "pass");
    const rep = await generateReport(accountA, { siteIds: [s1.data.siteId], scopeLabel: "Client One" });
    expect(rep.ok).toBe(true);
    if (!rep.ok) return;
    const row = await prisma.report.findUnique({ where: { id: rep.data.reportId }, include: { items: true } });
    expect(row?.scopeType).toBe("client");
    expect(row?.scopeLabel).toBe("Client One");
    expect(row?.items.map((i) => i.siteLabel)).toEqual(["Client One"]);
  });

  it("filters foreign site IDs server-side and fails when nothing owned remains", async () => {
    const mine = await addSite(accountA, "Mine", "https://mine-scope.example");
    const theirs = await addSite(accountB, "Theirs", "https://theirs-scope.example");
    if (!mine.ok || !theirs.ok) throw new Error("setup");
    await seedRun(mine.data.siteId, accountA, "pass");
    await seedRun(theirs.data.siteId, accountB, "pass");
    // foreign-only scope rejected
    const bad = await generateReport(accountA, { siteIds: [theirs.data.siteId] });
    expect(bad.ok).toBe(false);
    // mixed scope keeps only owned sites
    const mixed = await generateReport(accountA, { siteIds: [mine.data.siteId, theirs.data.siteId] });
    expect(mixed.ok).toBe(true);
    if (!mixed.ok) return;
    const row = await prisma.report.findUnique({ where: { id: mixed.data.reportId }, include: { items: true } });
    expect(row?.items.map((i) => i.siteLabel)).toEqual(["Mine"]);
  });

  it("keeps separate drafts per scope and per client", async () => {
    const s1 = await addSite(accountA, "C1", "https://c1-scope.example");
    const s2 = await addSite(accountA, "C2", "https://c2-scope.example");
    if (!s1.ok || !s2.ok) throw new Error("setup");
    await seedRun(s1.data.siteId, accountA, "pass");
    await seedRun(s2.data.siteId, accountA, "pass");
    const r1 = await generateReport(accountA, { siteIds: [s1.data.siteId] });
    const r2 = await generateReport(accountA, { siteIds: [s2.data.siteId] });
    if (!r1.ok || !r2.ok) throw new Error("gen failed");
    expect(r1.data.reportId).not.toBe(r2.data.reportId);
    const count = await prisma.report.count({ where: { accountId: accountA } });
    expect(count).toBe(2);
    // regenerating the same scope reuses its draft, not the other client's
    const r1b = await generateReport(accountA, { siteIds: [s1.data.siteId] });
    expect(r1b.ok).toBe(true);
    if (r1b.ok) expect(r1b.data.reportId).toBe(r1.data.reportId);
    expect(await prisma.report.count({ where: { accountId: accountA } })).toBe(2);
  });

  it("published snapshots survive site deletion and renaming", async () => {
    const s1 = await addSite(accountA, "Original Name", "https://rename-scope.example");
    if (!s1.ok) throw new Error("setup");
    await seedRun(s1.data.siteId, accountA, "pass");
    const rep = await generateReport(accountA, { siteIds: [s1.data.siteId] });
    if (!rep.ok) throw new Error("gen failed");
    await publishReport(accountA, rep.data.reportId);
    await prisma.site.delete({ where: { id: s1.data.siteId } });
    const publicView = await getReportByPublicId(rep.data.publicId);
    expect(publicView).not.toBeNull();
    expect(publicView?.items[0].siteLabel).toBe("Original Name");
    expect(publicView?.items[0].siteUrl).toBe("https://rename-scope.example/");
  });

  it("portfolio scope is labelled separately from client scope", async () => {
    const s1 = await addSite(accountA, "P1", "https://p1-scope.example");
    if (!s1.ok) throw new Error("setup");
    await seedRun(s1.data.siteId, accountA, "pass");
    const rep = await generateReport(accountA, {});
    expect(rep.ok).toBe(true);
    if (!rep.ok) return;
    const row = await prisma.report.findUnique({ where: { id: rep.data.reportId } });
    expect(row?.scopeType).toBe("portfolio");
    expect(row?.scopeKey).toBe("all");
  });
});

describe("intended plan at signup (P1)", () => {
  it("stores a valid intended plan but grants only starter entitlements", async () => {
    const email = "scope-plan@test.example";
    const r = await createAccount({ email, password: "password1234", name: "Planner", intendedPlan: "studio" });
    expect(r.ok).toBe(true);
    const acct = await prisma.account.findUnique({ where: { email } });
    expect(acct?.plan).toBe("starter");
    expect(acct?.intendedPlan).toBe("studio");
  });
  it("ignores unknown plan identifiers", async () => {
    const email = "scope-plan-evil@test.example";
    const r = await createAccount({ email, password: "password1234", name: "Evil", intendedPlan: "agency-forever-free" });
    expect(r.ok).toBe(true);
    const acct = await prisma.account.findUnique({ where: { email } });
    expect(acct?.plan).toBe("starter");
    expect(acct?.intendedPlan).toBeNull();
  });
});

describe("result semantics and summary reconciliation (P0)", () => {
  it("info-only result sets are overall info, never pass", () => {
    const info = [{ status: "info" as const }, { status: "info" as const }];
    expect(overallFor(info)).toBe("info");
    const empty = [] as Array<{ status: "info" }>;
    expect(overallFor(empty)).toBe("info");
  });
  it("fail beats warn beats pass; mixed pass+info is pass", () => {
    expect(overallFor([{ status: "pass" }, { status: "fail" }])).toBe("fail");
    expect(overallFor([{ status: "pass" }, { status: "warn" }])).toBe("warn");
    expect(overallFor([{ status: "pass" }, { status: "info" }])).toBe("pass");
  });
  it("summary counts include info and reconcile with displayed statuses", () => {
    const checks = [
      { status: "pass" as const },
      { status: "warn" as const },
      { status: "info" as const },
      { status: "info" as const },
    ];
    const s = summarizeChecks(checks);
    expect(s.pass + s.warn + s.fail + s.info).toBe(checks.length);
    expect(s).toEqual({ pass: 1, warn: 1, fail: 0, info: 2 });
  });
});
