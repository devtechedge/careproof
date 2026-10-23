import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  FRESHNESS,
  addSite,
  changePassword,
  generateReport,
  getReportByPublicId,
  publishReport,
  removeSite,
  runChecksForSite,
  shouldRecheck,
  unpublishReport,
  updateBranding,
  updateReportNote,
} from "@/lib/services";

let accountA: string;
let accountDemo: string;

async function seedRunWithResults(siteId: string, accountId: string, status: string, startedAt = new Date()) {
  const run = await prisma.checkRun.create({
    data: { siteId, accountId, trigger: "seed", status: "ok", finishedAt: new Date(), startedAt },
  });
  await prisma.checkResult.createMany({
    data: [
      { runId: run.id, checkKey: "uptime", status, value: "HTTP 200", detail: "" },
      { runId: run.id, checkKey: "ssl", status: "pass", value: "Valid, 90 days left", detail: "" },
      { runId: run.id, checkKey: "ttfb", status: "pass", value: "250 ms", detail: "" },
    ],
  });
}

beforeAll(async () => {
  await prisma.account.deleteMany({
    where: { email: { in: ["sec-a@test.example", "sec-demo@test.example"] } },
  });
  const a = await prisma.account.create({
    data: { email: "sec-a@test.example", passwordHash: "x:y", name: "Studio A", plan: "starter" },
  });
  const demo = await prisma.account.create({
    data: {
      email: "sec-demo@test.example",
      passwordHash: "x:y",
      name: "Demo Studio",
      plan: "demo",
      isDemo: true,
    },
  });
  accountA = a.id;
  accountDemo = demo.id;
});

beforeEach(async () => {
  await prisma.report.deleteMany({});
  await prisma.checkResult.deleteMany({});
  await prisma.checkRun.deleteMany({});
  await prisma.site.deleteMany({});
  await prisma.rateLimit.deleteMany({});
});

describe("demo workspace is read-only (service layer)", () => {
  it("blocks every mutating service for the demo account", async () => {
    const site = await prisma.site.create({
      data: { accountId: accountDemo, label: "Demo Site", url: "https://demo.example" },
    });
    const results = await Promise.all([
      addSite(accountDemo, "New", "https://new.example"),
      removeSite(accountDemo, site.id),
      runChecksForSite(accountDemo, site.id, "manual"),
      updateBranding(accountDemo, { accentColor: "#112233" }),
      changePassword(accountDemo, "password1234", "newpassword1234"),
      generateReport(accountDemo),
      publishReport(accountDemo, "nonexistent"),
      unpublishReport(accountDemo, "nonexistent"),
      updateReportNote(accountDemo, "nonexistent", "note"),
    ]);
    for (const r of results) {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain("read-only");
    }
  });

  it("non-demo accounts keep full workflows", async () => {
    const s = await addSite(accountA, "Real", "https://real-check.example");
    expect(s.ok).toBe(true);
    const b = await updateBranding(accountA, { accentColor: "#112233" });
    expect(b.ok).toBe(true);
  });
});

describe("report freshness policy", () => {
  it("shouldRecheck: never-checked sites first, stale after 24h, bounded by limit and deadline", () => {
    const now = Date.now();
    const fresh = now - 60 * 60 * 1000;
    const stale = now - 2 * 24 * 60 * 60 * 1000;
    expect(shouldRecheck(now, null, 0, now)).toBe(true);
    expect(shouldRecheck(now, fresh, 0, now)).toBe(false);
    expect(shouldRecheck(now, stale, 0, now)).toBe(true);
    expect(shouldRecheck(now, stale, FRESHNESS.recheckLimit, now)).toBe(false);
    expect(
      shouldRecheck(now, stale, 0, now - FRESHNESS.generationDeadlineMs - 1)
    ).toBe(false);
  });

  it("generateReport records observedAt per item and reuses the same-period draft", async () => {
    const s = await addSite(accountA, "Site1", "https://fresh-draft.example");
    if (!s.ok) throw new Error("setup failed");
    await seedRunWithResults(s.data.siteId, accountA, "pass");
    const first = await generateReport(accountA, undefined, "first note");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const row1 = await prisma.report.findUnique({
      where: { id: first.data.reportId },
      include: { items: true },
    });
    expect(row1?.agencyNote).toBe("first note");
    expect(row1?.items.length).toBe(1);
    expect(row1?.items[0].observedAt).not.toBeNull();

    const second = await generateReport(accountA, undefined, "updated note");
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.data.reportId).toBe(first.data.reportId); // draft reused, no duplicate
    const count = await prisma.report.count({ where: { accountId: accountA } });
    expect(count).toBe(1);
    const row2 = await prisma.report.findUnique({
      where: { id: second.data.reportId },
      include: { items: true },
    });
    expect(row2?.agencyNote).toBe("updated note");
    expect(row2?.items.length).toBe(1);
  });
});

describe("published report lifecycle", () => {
  it("published reports are immutable until unpublished; unpublish revokes the share link", async () => {
    const s = await addSite(accountA, "Pub", "https://pub-lifecycle.example");
    if (!s.ok) throw new Error("setup failed");
    await seedRunWithResults(s.data.siteId, accountA, "pass");
    const rep = await generateReport(accountA);
    if (!rep.ok) throw new Error("generate failed");

    // drafts are editable
    const noteWhileDraft = await updateReportNote(accountA, rep.data.reportId, "draft note");
    expect(noteWhileDraft.ok).toBe(true);

    expect((await publishReport(accountA, rep.data.reportId)).ok).toBe(true);
    const publicView = await getReportByPublicId(rep.data.publicId);
    expect(publicView).not.toBeNull();

    // published reports are immutable
    const noteBlocked = await updateReportNote(accountA, rep.data.reportId, "edit after publish");
    expect(noteBlocked.ok).toBe(false);

    expect((await unpublishReport(accountA, rep.data.reportId)).ok).toBe(true);
    const revoked = await getReportByPublicId(rep.data.publicId);
    expect(revoked).toBeNull();

    const noteOk = await updateReportNote(accountA, rep.data.reportId, "edited while draft");
    expect(noteOk.ok).toBe(true);
  });
});

describe("password change invalidates other sessions", () => {
  it("keeps only the current session", async () => {
    const { hashPassword } = await import("@/lib/password");
    const email = "pw-rotation@test.example";
    await prisma.account.deleteMany({ where: { email } });
    const acct = await prisma.account.create({
      data: { email, passwordHash: await hashPassword("password1234"), name: "Pw", plan: "starter" },
    });
    const keep = await prisma.session.create({
      data: { id: "keep-session", accountId: acct.id, expiresAt: new Date(Date.now() + 3_600_000) },
    });
    await prisma.session.create({
      data: { id: "other-session", accountId: acct.id, expiresAt: new Date(Date.now() + 3_600_000) },
    });
    const result = await changePassword(acct.id, "password1234", "newpassword5678", keep.id);
    expect(result.ok).toBe(true);
    const remaining = await prisma.session.findMany({ where: { accountId: acct.id } });
    expect(remaining.map((r) => r.id)).toEqual(["keep-session"]);
    // cleanup for reruns
    await prisma.account.delete({ where: { id: acct.id } });
  });
});
