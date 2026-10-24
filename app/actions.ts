"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSession, currentAccount, destroySession } from "@/lib/auth";
import { LIMITS, rateLimit } from "@/lib/rateLimit";
import { isEmail } from "@/lib/validation";
import { logEvent } from "@/lib/events";
import { prisma } from "@/lib/db";
import {
  addSite,
  authenticate,
  changePassword,
  createAccount,
  generateReport,
  publishReport,
  removeSite,
  runChecksBatch,
  runChecksForSite,
  unpublishReport,
  updateBranding,
  updateReportNote,
} from "@/lib/services";

async function requireAccountId(): Promise<string> {
  const account = await currentAccount();
  if (!account) redirect("/login");
  return account.id;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  // x-vercel-forwarded-for is set by Vercel and cannot be spoofed by the
  // client (Vercel request-headers docs, checked 2026-10-24); plain
  // x-forwarded-for can be, so it is only a fallback off-Vercel.
  return (
    h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

function back(path: string, params: Record<string, string>): never {
  const url = new URLSearchParams(params);
  redirect(`${path}?${url.toString()}`);
}

// ---- auth (used with useActionState) ----

export type AuthState = { error?: string; email?: string; name?: string };

export async function authSignUp(_prev: AuthState | undefined, formData: FormData): Promise<AuthState> {
  const ip = await clientIp();
  const rl = await rateLimit(`signup:${ip}`, "signup", LIMITS.signupPerIpPerDay, 86_400_000);
  if (!rl.allowed) return { error: "Too many signups from this network. Try again tomorrow." };

  const email = String(formData.get("email") ?? "");
  const name = String(formData.get("name") ?? "");
  const result = await createAccount({
    email,
    password: String(formData.get("password") ?? ""),
    name,
    intendedPlan: String(formData.get("plan") ?? ""),
  });
  if (!result.ok) return { error: result.error, email, name };
  await createSession(result.data.accountId);
  redirect("/dashboard");
}

export async function authLogIn(_prev: AuthState | undefined, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const rl = await rateLimit(
    `login:${email.trim().toLowerCase()}`,
    "login",
    LIMITS.loginPerEmailPerHour,
    3_600_000
  );
  if (!rl.allowed) return { error: "Too many attempts. Try again in an hour." };
  const result = await authenticate(email, String(formData.get("password") ?? ""));
  if (!result.ok) return { error: result.error, email };
  await createSession(result.data.accountId);
  redirect("/dashboard");
}

export async function joinWaitlist(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const ip = await clientIp();
  const rl = await rateLimit(`waitlist:${ip}`, "waitlist", 5, 3_600_000);
  if (!rl.allowed) return { error: "Too many attempts. Try again later." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isEmail(email)) return { error: "Enter a valid email address." };
  try {
    await prisma.waitlistSignup.upsert({
      where: { email },
      update: {},
      create: { email },
    });
    logEvent("waitlist_signup");
    return { ok: true };
  } catch {
    return { error: "Could not save that right now. Please try again." };
  }
}

export async function authLogOut(): Promise<void> {
  await destroySession();
  redirect("/");
}

// ---- sites ----

export async function addSiteForm(formData: FormData): Promise<void> {
  const accountId = await requireAccountId();
  const rl = await rateLimit(`sites:${accountId}`, "addSite", 40, 3_600_000);
  if (!rl.allowed) back("/dashboard", { err: "Too many changes. Wait a few minutes." });
  const result = await addSite(
    accountId,
    String(formData.get("label") ?? ""),
    String(formData.get("url") ?? "")
  );
  if (!result.ok) back("/dashboard", { err: result.error });
  revalidatePath("/dashboard");
  back("/dashboard", { msg: "Site added. Run checks to see its first results." });
}

export async function removeSiteForm(formData: FormData): Promise<void> {
  const accountId = await requireAccountId();
  const result = await removeSite(accountId, String(formData.get("siteId") ?? ""));
  if (!result.ok) back("/dashboard", { err: result.error });
  revalidatePath("/dashboard");
  back("/dashboard", { msg: "Site removed." });
}

export async function runChecksForm(formData: FormData): Promise<void> {
  const accountId = await requireAccountId();
  const rl = await rateLimit(
    `runcheks:${accountId}`,
    "runChecks",
    LIMITS.runChecksPerAccountPerHour,
    3_600_000
  );
  if (!rl.allowed) back("/dashboard", { err: "Check limit reached for this hour." });
  const siteId = String(formData.get("siteId") ?? "");
  const result = await runChecksForSite(accountId, siteId, "manual");
  if (!result.ok) back("/dashboard", { err: result.error });
  revalidatePath("/dashboard");
  back("/dashboard", { msg: "Checks complete." });
}

export async function runAllChecksForm(): Promise<void> {
  const accountId = await requireAccountId();
  const rl = await rateLimit(
    `runcheks:${accountId}`,
    "runChecks",
    LIMITS.runChecksPerAccountPerHour,
    3_600_000
  );
  if (!rl.allowed) back("/dashboard", { err: "Check limit reached for this hour." });
  const result = await runChecksBatch(accountId, 5);
  if (!result.ok) back("/dashboard", { err: result.error });
  revalidatePath("/dashboard");
  const { checked, remaining } = result.data;
  back(
    "/dashboard",
    remaining > 0
      ? { msg: `Checked ${checked} sites (${remaining} remaining - run again to continue).` }
      : { msg: `Checks complete for ${checked} sites.` }
  );
}

// ---- reports ----

export async function generateReportForm(formData: FormData): Promise<void> {
  const accountId = await requireAccountId();
  const rl = await rateLimit(
    `report:${accountId}`,
    "report",
    LIMITS.reportPerAccountPerHour,
    3_600_000
  );
  if (!rl.allowed) back("/dashboard", { err: "Report limit reached for this hour." });
  const siteIds = formData
    .getAll("siteIds")
    .map((v) => String(v))
    .filter(Boolean);
  if (siteIds.length === 0) {
    back("/dashboard", { err: "Select at least one site to include in the client report." });
  }
  const result = await generateReport(accountId, {
    siteIds,
    scopeLabel: String(formData.get("scopeLabel") ?? ""),
    agencyNote: String(formData.get("note") ?? ""),
  });
  if (!result.ok) back("/dashboard", { err: result.error });
  revalidatePath("/reports");
  redirect(`/reports/${result.data.reportId}`);
}

export async function generatePortfolioForm(formData: FormData): Promise<void> {
  const accountId = await requireAccountId();
  const rl = await rateLimit(
    `report:${accountId}`,
    "report",
    LIMITS.reportPerAccountPerHour,
    3_600_000
  );
  if (!rl.allowed) back("/dashboard", { err: "Report limit reached for this hour." });
  const result = await generateReport(accountId, {
    siteIds: null,
    agencyNote: String(formData.get("note") ?? ""),
  });
  if (!result.ok) back("/dashboard", { err: result.error });
  revalidatePath("/reports");
  redirect(`/reports/${result.data.reportId}`);
}

export async function publishReportForm(formData: FormData): Promise<void> {
  const accountId = await requireAccountId();
  const result = await publishReport(accountId, String(formData.get("reportId") ?? ""));
  if (!result.ok) back("/dashboard", { err: result.error });
  revalidatePath(`/reports/${String(formData.get("reportId") ?? "")}`);
  back(`/reports/${String(formData.get("reportId") ?? "")}`, { msg: "Report published." });
}

export async function unpublishReportForm(formData: FormData): Promise<void> {
  const accountId = await requireAccountId();
  const reportId = String(formData.get("reportId") ?? "");
  const result = await unpublishReport(accountId, reportId);
  if (!result.ok) back("/dashboard", { err: result.error });
  revalidatePath(`/reports/${reportId}`);
  revalidatePath(`/r/${String(formData.get("publicId") ?? "")}`);
  back(`/reports/${reportId}`, { msg: "Report unpublished - its share link no longer works." });
}

export async function saveNoteForm(formData: FormData): Promise<void> {
  const accountId = await requireAccountId();
  const reportId = String(formData.get("reportId") ?? "");
  const result = await updateReportNote(accountId, reportId, String(formData.get("note") ?? ""));
  if (!result.ok) back("/dashboard", { err: result.error });
  revalidatePath(`/reports/${reportId}`);
  back(`/reports/${reportId}`, { msg: "Note saved." });
}

// ---- settings ----

export async function saveBrandingForm(formData: FormData): Promise<void> {
  const accountId = await requireAccountId();
  const logoUrl = String(formData.get("logoUrl") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const result = await updateBranding(accountId, {
    name: String(formData.get("name") ?? ""),
    accentColor: String(formData.get("accentColor") ?? ""),
    logoUrl: logoUrl === "" ? null : logoUrl,
    contactEmail: contactEmail === "" ? null : contactEmail,
  });
  if (!result.ok) back("/settings", { err: result.error });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  back("/settings", { msg: "Branding saved." });
}

export async function changePasswordForm(formData: FormData): Promise<void> {
  const accountId = await requireAccountId();
  const account = await currentAccount();
  const result = await changePassword(
    accountId,
    String(formData.get("currentPassword") ?? ""),
    String(formData.get("newPassword") ?? ""),
    account?.sessionId
  );
  if (!result.ok) back("/settings", { err: result.error });
  back("/settings", { msg: "Password changed." });
}
