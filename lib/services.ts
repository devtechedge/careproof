import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import { runSiteChecks, type CheckOutcome } from "./checks";
import { planFor } from "./plans";
import { cleanText, isEmail, normalizeSiteUrl } from "./validation";
import { hashPassword, verifyPassword } from "./password";
import { currentPeriod, overallFor, snapshotChecks, summarizeChecks } from "./report";
import { logEvent } from "./events";

export type ServiceResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string };

function fail(error: string) {
  return { ok: false as const, error };
}

const DEMO_READONLY_ERROR =
  "The demo workspace is read-only so every visitor sees the same product. Create your own free account to try everything.";

/** Returns an error result when the account is the shared read-only demo. */
async function rejectDemo(accountId: string): Promise<{ ok: false; error: string } | null> {
  const acct = await prisma.account.findUnique({
    where: { id: accountId },
    select: { isDemo: true },
  });
  if (!acct) return fail("Account not found.");
  if (acct.isDemo) return fail(DEMO_READONLY_ERROR);
  return null;
}

export async function createAccount(input: {
  email: string;
  password: string;
  name: string;
  intendedPlan?: string;
}): Promise<ServiceResult<{ accountId: string }>> {
  const email = input.email.trim().toLowerCase();
  const name = cleanText(input.name, 80);
  if (!isEmail(email)) return fail("Enter a valid email address.");
  if (name.length < 2) return fail("Enter your agency or freelancer name.");
  if (input.password.length < 10 || !/[a-zA-Z]/.test(input.password) || !/\d/.test(input.password)) {
    return fail("Password must be at least 10 characters and include letters and numbers.");
  }
  // Unknown plan identifiers are ignored: the pilot grants Starter
  // entitlements to everyone, and a query parameter can never create a paid one.
  const intended =
    input.intendedPlan && ["starter", "studio", "agency"].includes(input.intendedPlan)
      ? input.intendedPlan
      : null;
  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) return fail("An account with this email already exists.");
  const account = await prisma.account.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(input.password),
      plan: "starter",
      intendedPlan: intended && intended !== "starter" ? intended : null,
    },
  });
  logEvent("signup_completed", account.id);
  return { ok: true, data: { accountId: account.id } };
}

export async function authenticate(
  email: string,
  password: string
): Promise<ServiceResult<{ accountId: string }>> {
  const account = await prisma.account.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!account) return fail("Email or password is incorrect.");
  if (!(await verifyPassword(password, account.passwordHash))) {
    return fail("Email or password is incorrect.");
  }
  if (account.isDemo) logEvent("demo_login", account.id);
  return { ok: true, data: { accountId: account.id } };
}

export async function addSite(
  accountId: string,
  label: string,
  url: string
): Promise<ServiceResult<{ siteId: string }>> {
  const demo = await rejectDemo(accountId);
  if (demo) return demo;
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return fail("Account not found.");
  const plan = planFor(account.plan);
  const count = await prisma.site.count({ where: { accountId } });
  if (count >= plan.siteLimit) {
    return fail(
      `Your ${plan.name} plan covers ${plan.siteLimit} sites. Upgrade to add more.`
    );
  }
  const normalized = normalizeSiteUrl(url);
  if (!normalized.ok) return fail(normalized.error);
  const cleanLabel = cleanText(label, 60);
  if (cleanLabel.length < 1) return fail("Give this site a label, for example the client name.");
  const site = await prisma.site.create({
    data: { accountId, label: cleanLabel, url: normalized.url },
  });
  return { ok: true, data: { siteId: site.id } };
}

export async function removeSite(accountId: string, siteId: string): Promise<ServiceResult> {
  const demo = await rejectDemo(accountId);
  if (demo) return demo;
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site || site.accountId !== accountId) return fail("Site not found.");
  await prisma.site.delete({ where: { id: siteId } });
  return { ok: true };
}

export async function listSites(accountId: string) {
  const sites = await prisma.site.findMany({
    where: { accountId },
    orderBy: { createdAt: "asc" },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 1,
        include: { results: true },
      },
    },
  });
  return sites.map((s) => {
    const latest = s.runs[0] ?? null;
    const outcomes = (latest?.results ?? []).map((r) => ({
      checkKey: r.checkKey,
      status: r.status as CheckOutcome["status"],
      value: r.value,
      detail: r.detail,
    }));
    return {
      id: s.id,
      label: s.label,
      url: s.url,
      lastRunAt: latest?.startedAt ?? null,
      lastStatus: latest ? overallFor(outcomes) : ("info" as const),
      summary: latest ? summarizeChecks(outcomes) : null,
    };
  });
}

export async function runChecksForSite(
  accountId: string,
  siteId: string,
  trigger: "manual" | "report" = "manual"
): Promise<ServiceResult<{ runId: string; outcomes: CheckOutcome[] }>> {
  const demo = await rejectDemo(accountId);
  if (demo) return demo;
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site || site.accountId !== accountId) return fail("Site not found.");
  const run = await prisma.checkRun.create({
    data: { siteId, accountId, trigger, status: "ok" },
  });
  let outcomes: CheckOutcome[];
  try {
    outcomes = await runSiteChecks(site.url);
  } catch {
    outcomes = [
      { checkKey: "uptime", status: "fail", value: "Check error", detail: "The check run failed unexpectedly." },
    ];
  }
  await prisma.checkResult.createMany({
    data: outcomes.map((o) => ({
      runId: run.id,
      checkKey: o.checkKey,
      status: o.status,
      value: o.value,
      detail: o.detail,
    })),
  });
  await prisma.checkRun.update({
    where: { id: run.id },
    data: { finishedAt: new Date(), status: "ok" },
  });
  return { ok: true, data: { runId: run.id, outcomes } };
}

/**
 * Runs checks for at most `limit` sites, prioritizing never-checked sites and
 * then the oldest observations. Serverless invocations must stay bounded, so
 * large portfolios complete across several clicks ("Run again to continue").
 */
export async function runChecksBatch(
  accountId: string,
  limit = 5
): Promise<ServiceResult<{ checked: number; remaining: number }>> {
  const demo = await rejectDemo(accountId);
  if (demo) return demo;
  const sites = await prisma.site.findMany({
    where: { accountId },
    select: {
      id: true,
      runs: { orderBy: { startedAt: "desc" }, take: 1, select: { startedAt: true } },
    },
  });
  const ordered = sites
    .map((s) => ({ id: s.id, last: s.runs[0]?.startedAt ?? null }))
    .sort((a, b) => {
      if (a.last === null && b.last === null) return 0;
      if (a.last === null) return -1;
      if (b.last === null) return 1;
      return a.last.getTime() - b.last.getTime();
    });
  const batch = ordered.slice(0, limit);
  for (const site of batch) {
    await runChecksForSite(accountId, site.id, "manual");
  }
  return { ok: true, data: { checked: batch.length, remaining: ordered.length - batch.length } };
}

export interface LatestRun {
  startedAt: Date;
  outcomes: CheckOutcome[];
}

export async function latestRunForSite(siteId: string): Promise<LatestRun | null> {
  const run = await prisma.checkRun.findFirst({
    where: { siteId },
    orderBy: { startedAt: "desc" },
    include: { results: true },
  });
  if (!run) return null;
  return {
    startedAt: run.startedAt,
    outcomes: run.results.map((r) => ({
      checkKey: r.checkKey,
      status: r.status as CheckOutcome["status"],
      value: r.value,
      detail: r.detail,
    })),
  };
}

export const FRESHNESS = {
  freshAfterMs: 24 * 60 * 60 * 1000,
  recheckLimit: 4,
  generationDeadlineMs: 25_000,
  staleBannerAfterMs: 7 * 24 * 60 * 60 * 1000,
} as const;

/** Pure policy helper: should this site's observations be refreshed during report generation? */
export function shouldRecheck(
  now: number,
  lastStartedAt: number | null,
  recheckedCount: number,
  generationStartedAt: number,
  limits: typeof FRESHNESS = FRESHNESS
): boolean {
  if (recheckedCount >= limits.recheckLimit) return false;
  if (now - generationStartedAt >= limits.generationDeadlineMs) return false;
  if (lastStartedAt === null) return true;
  return now - lastStartedAt > limits.freshAfterMs;
}

export interface GenerateReportInput {
  period?: string;
  agencyNote?: string;
  /** Explicit site selection for a client report. Omit/null for an internal all-sites portfolio report. */
  siteIds?: string[] | null;
  /** Display name for the scope (client name) shown in review and on the report. */
  scopeLabel?: string;
}

export async function generateReport(
  accountId: string,
  input: GenerateReportInput = {}
): Promise<ServiceResult<{ reportId: string; publicId: string }>> {
  const demo = await rejectDemo(accountId);
  if (demo) return demo;
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return fail("Account not found.");
  const plan = planFor(account.plan);
  const period = input.period ?? currentPeriod();

  const allSites = await prisma.site.findMany({
    where: { accountId },
    orderBy: { createdAt: "asc" },
  });
  if (allSites.length === 0) return fail("Add at least one site before generating a report.");

  // Scope resolution: an explicit client scope must contain at least one
  // site owned by this account. Foreign site IDs are filtered out server-side,
  // never trusted from the browser.
  const isPortfolio = !input.siteIds;
  let scopedSites = allSites;
  let scopeType = "portfolio";
  let scopeKey = "all";
  let scopeLabel = cleanText(input.scopeLabel ?? "", 80);
  if (!isPortfolio) {
    const owned = new Set(allSites.map((x) => x.id));
    const requested = [...new Set(input.siteIds ?? [])].filter((id) => owned.has(id));
    if (requested.length === 0) {
      return fail("Select at least one site from your account for this report.");
    }
    scopedSites = allSites.filter((x) => requested.includes(x.id));
    scopeType = "client";
    scopeKey = [...requested].sort().join(",");
    if (!scopeLabel) scopeLabel = scopedSites.length === 1 ? scopedSites[0].label : `${scopedSites.length} sites`;
  } else {
    scopeLabel = scopeLabel || "All sites";
  }

  const monthCount = await prisma.report.count({
    where: { accountId, period },
  });
  if (monthCount >= plan.reportLimitPerMonth) {
    return fail(
      `Your ${plan.name} plan includes ${plan.reportLimitPerMonth} reports per month. Upgrade for more.`
    );
  }

  const generationStart = Date.now();
  let rechecked = 0;
  const items: Array<{
    siteLabel: string;
    siteUrl: string;
    overall: "pass" | "warn" | "fail" | "info";
    checksJson: string;
    observedAt: Date;
    fresh: boolean;
  }> = [];

  for (const site of scopedSites) {
    let run = await latestRunForSite(site.id);
    if (shouldRecheck(Date.now(), run ? run.startedAt.getTime() : null, rechecked, generationStart)) {
      const freshRun = await runChecksForSite(accountId, site.id, "report");
      if (freshRun.ok) {
        run = await latestRunForSite(site.id);
        rechecked += 1;
      }
    }
    if (!run || run.outcomes.length === 0) continue;
    items.push({
      siteLabel: site.label,
      siteUrl: site.url,
      overall: overallFor(run.outcomes),
      checksJson: snapshotChecks(run.outcomes),
      observedAt: run.startedAt,
      // observed during this generation window (allowing a small clock skew)
      fresh: run.startedAt.getTime() >= generationStart - 1_000,
    });
  }
  if (items.length === 0) return fail("No checks could be run for these sites.");

  const publicId = randomBytes(14).toString("hex");
  const brandingJson = JSON.stringify({
    name: account.name,
    accentColor: account.accentColor,
    logoUrl: account.logoUrl,
    contactEmail: account.contactEmail,
    isDemo: account.isDemo,
  });
  const note = cleanText(input.agencyNote ?? "", 600);

  // Drafts are reused per (account, period, scope): a draft for one client
  // never overwrites another client's draft. Published reports stay immutable
  // snapshots of exactly the sites saved at generation time.
  const report = await prisma.$transaction(async (tx) => {
    const existingDraft = await tx.report.findFirst({
      where: { accountId, period, status: "draft", scopeKey },
    });
    if (existingDraft) {
      await tx.reportItem.deleteMany({ where: { reportId: existingDraft.id } });
      return tx.report.update({
        where: { id: existingDraft.id },
        data: {
          agencyNote: note,
          brandingJson,
          scopeType,
          scopeKey,
          scopeLabel,
          items: { create: items },
        },
      });
    }
    return tx.report.create({
      data: {
        accountId,
        publicId,
        period,
        scopeType,
        scopeKey,
        scopeLabel,
        agencyNote: note,
        brandingJson,
        status: "draft",
        items: { create: items },
      },
    });
  });
  logEvent("report_generated", accountId);
  return { ok: true, data: { reportId: report.id, publicId: report.publicId } };
}

export async function publishReport(
  accountId: string,
  reportId: string
): Promise<ServiceResult> {
  const demo = await rejectDemo(accountId);
  if (demo) return demo;
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report || report.accountId !== accountId) return fail("Report not found.");
  await prisma.report.update({ where: { id: reportId }, data: { status: "published" } });
  return { ok: true };
}

export async function unpublishReport(
  accountId: string,
  reportId: string
): Promise<ServiceResult> {
  const demo = await rejectDemo(accountId);
  if (demo) return demo;
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report || report.accountId !== accountId) return fail("Report not found.");
  await prisma.report.update({ where: { id: reportId }, data: { status: "draft" } });
  return { ok: true };
}

export async function updateReportNote(
  accountId: string,
  reportId: string,
  note: string
): Promise<ServiceResult> {
  const demo = await rejectDemo(accountId);
  if (demo) return demo;
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report || report.accountId !== accountId) return fail("Report not found.");
  if (report.status === "published") {
    return fail("Published reports are immutable. Unpublish first to edit the note.");
  }
  await prisma.report.update({
    where: { id: reportId },
    data: { agencyNote: cleanText(note, 600) },
  });
  return { ok: true };
}

export async function listReports(accountId: string) {
  const reports = await prisma.report.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  return reports.map((r) => ({
    id: r.id,
    publicId: r.publicId,
    period: r.period,
    status: r.status,
    scopeType: r.scopeType,
    scopeLabel: r.scopeLabel,
    createdAt: r.createdAt,
    siteCount: r.items.length,
    healthCounts: r.items.reduce(
      (acc, i) => {
        acc[i.overall as "pass" | "warn" | "fail"] += 1;
        return acc;
      },
      { pass: 0, warn: 0, fail: 0 } as Record<"pass" | "warn" | "fail", number>
    ),
  }));
}

export async function getReportForOwner(accountId: string, reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { items: true },
  });
  if (!report || report.accountId !== accountId) return null;
  return report;
}

export async function getReportByPublicId(publicId: string) {
  // Only published reports are reachable via share links; unpublishing revokes access.
  return prisma.report.findFirst({
    where: { publicId, status: "published" },
    include: { items: true },
  });
}

export async function updateBranding(
  accountId: string,
  input: { name?: string; accentColor?: string; logoUrl?: string | null; contactEmail?: string | null }
): Promise<ServiceResult> {
  const demo = await rejectDemo(accountId);
  if (demo) return demo;
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return fail("Account not found.");
  const data: Record<string, string | null> = {};
  if (input.name !== undefined) {
    const name = cleanText(input.name, 80);
    if (name.length < 2) return fail("Name is too short.");
    data.name = name;
  }
  if (input.accentColor !== undefined) {
    if (!/^#[0-9a-fA-F]{6}$/.test(input.accentColor)) return fail("Accent color must be a hex value like #2563eb.");
    data.accentColor = input.accentColor;
  }
  if (input.logoUrl !== undefined) {
    if (input.logoUrl === null || input.logoUrl.trim() === "") {
      data.logoUrl = null;
    } else {
      const u = normalizeSiteUrl(input.logoUrl);
      if (!u.ok || !/\.(png|jpg|jpeg|svg|webp)(\?|$)/i.test(u.url)) {
        return fail("Logo must be a direct image URL (png, jpg, svg, webp).");
      }
      data.logoUrl = u.url;
    }
  }
  if (input.contactEmail !== undefined) {
    if (input.contactEmail === null || input.contactEmail.trim() === "") {
      data.contactEmail = null;
    } else if (!isEmail(input.contactEmail)) {
      return fail("Contact email is not valid.");
    } else {
      data.contactEmail = input.contactEmail.trim().toLowerCase();
    }
  }
  await prisma.account.update({ where: { id: accountId }, data });
  return { ok: true };
}

export async function changePassword(
  accountId: string,
  currentPassword: string,
  newPassword: string,
  keepSessionId?: string
): Promise<ServiceResult> {
  const demo = await rejectDemo(accountId);
  if (demo) return demo;
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return fail("Account not found.");
  if (!(await verifyPassword(currentPassword, account.passwordHash))) {
    return fail("Current password is incorrect.");
  }
  if (newPassword.length < 10 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return fail("New password must be at least 10 characters and include letters and numbers.");
  }
  await prisma.account.update({
    where: { id: accountId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  // Invalidate every other session (other devices, previously stolen tokens).
  if (keepSessionId) {
    await prisma.session.deleteMany({
      where: { accountId, id: { not: keepSessionId } },
    });
  }
  return { ok: true };
}
