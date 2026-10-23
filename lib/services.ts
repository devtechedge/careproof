import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import { runSiteChecks, type CheckOutcome } from "./checks";
import { planFor } from "./plans";
import { cleanText, isEmail, normalizeSiteUrl } from "./validation";
import { hashPassword, verifyPassword } from "./password";
import { currentPeriod, overallFor, snapshotChecks, summarizeChecks } from "./report";

export type ServiceResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string };

function fail(error: string) {
  return { ok: false as const, error };
}

export async function createAccount(input: {
  email: string;
  password: string;
  name: string;
}): Promise<ServiceResult<{ accountId: string }>> {
  const email = input.email.trim().toLowerCase();
  const name = cleanText(input.name, 80);
  if (!isEmail(email)) return fail("Enter a valid email address.");
  if (name.length < 2) return fail("Enter your agency or freelancer name.");
  if (input.password.length < 10 || !/[a-zA-Z]/.test(input.password) || !/\d/.test(input.password)) {
    return fail("Password must be at least 10 characters and include letters and numbers.");
  }
  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) return fail("An account with this email already exists.");
  const account = await prisma.account.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(input.password),
      plan: "starter",
    },
  });
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
  return { ok: true, data: { accountId: account.id } };
}

export async function addSite(
  accountId: string,
  label: string,
  url: string
): Promise<ServiceResult<{ siteId: string }>> {
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

export async function latestOutcomesForSite(siteId: string): Promise<CheckOutcome[]> {
  const run = await prisma.checkRun.findFirst({
    where: { siteId },
    orderBy: { startedAt: "desc" },
    include: { results: true },
  });
  if (!run) return [];
  return run.results.map((r) => ({
    checkKey: r.checkKey,
    status: r.status as CheckOutcome["status"],
    value: r.value,
    detail: r.detail,
  }));
}

export async function generateReport(
  accountId: string,
  period = currentPeriod(),
  agencyNote = ""
): Promise<ServiceResult<{ reportId: string; publicId: string }>> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return fail("Account not found.");
  const plan = planFor(account.plan);
  const monthCount = await prisma.report.count({
    where: { accountId, period },
  });
  if (monthCount >= plan.reportLimitPerMonth) {
    return fail(
      `Your ${plan.name} plan includes ${plan.reportLimitPerMonth} reports per month. Upgrade for more.`
    );
  }
  const sites = await prisma.site.findMany({ where: { accountId }, orderBy: { createdAt: "asc" } });
  if (sites.length === 0) return fail("Add at least one site before generating a report.");

  const items: Array<{
    siteLabel: string;
    siteUrl: string;
    overall: "pass" | "warn" | "fail";
    checksJson: string;
  }> = [];
  for (const site of sites) {
    let outcomes = await latestOutcomesForSite(site.id);
    if (outcomes.length === 0) {
      const run = await runChecksForSite(accountId, site.id, "report");
      if (!run.ok) continue;
      outcomes = run.data.outcomes;
    }
    items.push({
      siteLabel: site.label,
      siteUrl: site.url,
      overall: overallFor(outcomes),
      checksJson: snapshotChecks(outcomes),
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
  const report = await prisma.report.create({
    data: {
      accountId,
      publicId,
      period,
      agencyNote: cleanText(agencyNote, 600),
      brandingJson,
      status: "draft",
      items: { create: items },
    },
  });
  return { ok: true, data: { reportId: report.id, publicId: report.publicId } };
}

export async function publishReport(
  accountId: string,
  reportId: string
): Promise<ServiceResult> {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report || report.accountId !== accountId) return fail("Report not found.");
  await prisma.report.update({ where: { id: reportId }, data: { status: "published" } });
  return { ok: true };
}

export async function updateReportNote(
  accountId: string,
  reportId: string,
  note: string
): Promise<ServiceResult> {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report || report.accountId !== accountId) return fail("Report not found.");
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
  return prisma.report.findUnique({
    where: { publicId },
    include: { items: true },
  });
}

export async function updateBranding(
  accountId: string,
  input: { name?: string; accentColor?: string; logoUrl?: string | null; contactEmail?: string | null }
): Promise<ServiceResult> {
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
  newPassword: string
): Promise<ServiceResult> {
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
  return { ok: true };
}
