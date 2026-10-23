import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  addSite,
  authenticate,
  createAccount,
  generateReport,
  getReportByPublicId,
  getReportForOwner,
  listReports,
  publishReport,
  removeSite,
  updateBranding,
} from "@/lib/services";
import { rateLimit } from "@/lib/rateLimit";

async function seedRunWithResults(siteId: string, accountId: string, status: string) {
  const run = await prisma.checkRun.create({
    data: { siteId, accountId, trigger: "seed", status: "ok", finishedAt: new Date() },
  });
  await prisma.checkResult.createMany({
    data: [
      { runId: run.id, checkKey: "uptime", status, value: "HTTP 200", detail: "" },
      { runId: run.id, checkKey: "ssl", status: "pass", value: "Valid, 90 days left", detail: "" },
      { runId: run.id, checkKey: "ttfb", status: "pass", value: "250 ms", detail: "" },
    ],
  });
}

let accountA: string;
let accountB: string;

beforeAll(async () => {
  // idempotent across runs against a persistent test database
  await prisma.account.deleteMany({
    where: { email: { in: ["a@test.example", "b@test.example"] } },
  });
  const a = await createAccount({
    email: "a@test.example",
    password: "password1234",
    name: "Studio A",
  });
  const b = await createAccount({
    email: "b@test.example",
    password: "password1234",
    name: "Studio B",
  });
  if (!a.ok || !b.ok) throw new Error("account setup failed");
  accountA = a.data.accountId;
  accountB = b.data.accountId;
});

beforeEach(async () => {
  await prisma.report.deleteMany({});
  await prisma.checkResult.deleteMany({});
  await prisma.checkRun.deleteMany({});
  await prisma.site.deleteMany({});
  await prisma.rateLimit.deleteMany({});
});

describe("accounts", () => {
  it("hashes passwords and authenticates", async () => {
    const ok = await authenticate("a@test.example", "password1234");
    expect(ok.ok).toBe(true);
    const bad = await authenticate("a@test.example", "wrong-password-9");
    expect(bad.ok).toBe(false);
  });

  it("rejects duplicate email and weak passwords", async () => {
    const dup = await createAccount({ email: "a@test.example", password: "password1234", name: "X" });
    expect(dup.ok).toBe(false);
    const weak = await createAccount({ email: "c@test.example", password: "short", name: "X" });
    expect(weak.ok).toBe(false);
  });
});

describe("sites and plan limits", () => {
  it("adds and normalizes sites", async () => {
    const s = await addSite(accountA, "Client", "example.com");
    expect(s.ok).toBe(true);
    if (s.ok) {
      const site = await prisma.site.findUnique({ where: { id: s.data.siteId } });
      expect(site?.url).toBe("https://example.com/");
    }
  });

  it("rejects private and invalid URLs", async () => {
    expect(!(await addSite(accountA, "Bad", "http://localhost:3000")).ok).toBe(true);
    expect(!(await addSite(accountA, "Bad", "not a url")).ok).toBe(true);
  });

  it("enforces the starter plan site limit", async () => {
    for (let i = 0; i < 15; i++) {
      const r = await addSite(accountA, `S${i}`, `https://limit${i}.example`);
      expect(r.ok).toBe(true);
    }
    const over = await addSite(accountA, "Overflow", "https://overflow.example");
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.error).toContain("15 sites");
  });
});

describe("tenant isolation", () => {
  it("account B cannot act on account A's site or report", async () => {
    const s = await addSite(accountA, "A site", "https://tenant-a.example");
    if (!s.ok) throw new Error("setup failed");
    expect((await removeSite(accountB, s.data.siteId)).ok).toBe(false);

    await seedRunWithResults(s.data.siteId, accountA, "pass");
    const rep = await generateReport(accountA);
    expect(rep.ok).toBe(true);
    if (!rep.ok) return;
    const reportRow = await prisma.report.findUnique({ where: { id: rep.data.reportId } });
    expect(reportRow).not.toBeNull();

    expect((await publishReport(accountB, rep.data.reportId)).ok).toBe(false);
    expect(await getReportForOwner(accountB, rep.data.reportId)).toBeNull();
    const listed = await listReports(accountB);
    expect(listed.length).toBe(0);
  });

  it("b report list stays empty while a has reports", async () => {
    const s = await addSite(accountA, "A site", "https://tenant2-a.example");
    if (!s.ok) throw new Error("setup failed");
    await seedRunWithResults(s.data.siteId, accountA, "warn");
    await generateReport(accountA);
    expect((await listReports(accountB)).length).toBe(0);
    expect((await listReports(accountA)).length).toBe(1);
  });
});

describe("reports", () => {
  it("generates a report from latest runs without network", async () => {
    const s = await addSite(accountA, "Reported", "https://report-test.example");
    if (!s.ok) throw new Error("setup failed");
    await seedRunWithResults(s.data.siteId, accountA, "warn");
    const rep = await generateReport(accountA, { agencyNote: "Monthly note here" });
    expect(rep.ok).toBe(true);
    if (!rep.ok) return;
    // drafts are private: the share link works only after publishing
    expect(await getReportByPublicId(rep.data.publicId)).toBeNull();
    expect((await publishReport(accountA, rep.data.reportId)).ok).toBe(true);
    const publicView = await getReportByPublicId(rep.data.publicId);
    expect(publicView).not.toBeNull();
    expect(publicView?.items.length).toBe(1);
    expect(publicView?.items[0].overall).toBe("warn");
    expect(publicView?.agencyNote).toBe("Monthly note here");
    const branding = JSON.parse(publicView?.brandingJson ?? "{}");
    expect(branding.name).toBe("Studio A");
  });

  it("refuses a report with no sites", async () => {
    const rep = await generateReport(accountA);
    expect(rep.ok).toBe(false);
  });

  it("publish flow marks the report", async () => {
    const s = await addSite(accountA, "Pub", "https://publish-test.example");
    if (!s.ok) throw new Error("setup failed");
    await seedRunWithResults(s.data.siteId, accountA, "pass");
    const rep = await generateReport(accountA);
    if (!rep.ok) throw new Error("generate failed");
    expect((await publishReport(accountA, rep.data.reportId)).ok).toBe(true);
    const published = await prisma.report.findUnique({ where: { id: rep.data.reportId } });
    expect(published?.status).toBe("published");
  });
});

describe("branding", () => {
  it("validates accent color and logo URL", async () => {
    expect((await updateBranding(accountA, { accentColor: "red" })).ok).toBe(false);
    expect((await updateBranding(accountA, { accentColor: "#00aa33" })).ok).toBe(true);
    expect((await updateBranding(accountA, { logoUrl: "https://x.example/logo.txt" })).ok).toBe(false);
    expect((await updateBranding(accountA, { logoUrl: "https://x.example/logo.png" })).ok).toBe(true);
    expect((await updateBranding(accountA, { contactEmail: "nope" })).ok).toBe(false);
  });
});

describe("rateLimit", () => {
  it("allows up to the limit then blocks", async () => {
    for (let i = 0; i < 3; i++) {
      const r = await rateLimit("t", "act", 3, 60_000);
      expect(r.allowed).toBe(true);
    }
    const blocked = await rateLimit("t", "act", 3, 60_000);
    expect(blocked.allowed).toBe(false);
  });
});
