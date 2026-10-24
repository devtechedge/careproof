import { changePasswordForm, saveBrandingForm } from "@/app/actions";
import { SubmitButton } from "@/components/forms";
import { currentAccount } from "@/lib/auth";
import { planFor } from "@/lib/plans";

export const metadata = { title: "Settings - CareProof" };
export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-blue-600";

export default async function SettingsPage({
  searchParams,
}: PageProps<"/settings">) {
  const account = (await currentAccount())!;
  const plan = planFor(account.plan);
  const sp = await searchParams;
  const msg = typeof sp.msg === "string" ? sp.msg : null;
  const err = typeof sp.err === "string" ? sp.err : null;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {account.email} - {plan.name} plan ({plan.siteLimit} sites, {plan.reportLimitPerMonth} reports/month).
          {account.intendedPlanLabel
            ? `You chose ${account.intendedPlanLabel} at signup. The pilot is free: every account currently runs with Starter limits, and paid plans activate only when billing goes live.`
            : "Plan changes are manual during the pilot; reply to any CareProof email to switch."}
        </p>
      </div>

      {msg ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{msg}</p>
      ) : null}
      {account.isDemo ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400 dark:text-amber-300">
          The demo workspace is read-only: branding and password changes are disabled.
        </p>
      ) : null}
      {err ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-300">{err}</p>
      ) : null}

      {account.isDemo ? null : (
      <form action={saveBrandingForm} className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="font-semibold">Report branding</h2>
        <p className="text-xs text-[var(--muted)]">Appears on every report you generate, including already published ones at render time for drafts.</p>
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-[var(--ink)]">
            Display name
          </label>
          <input id="name" name="name" defaultValue={account.name} required className={inputClass} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="accentColor" className="mb-1 block text-sm font-medium text-[var(--ink)]">
              Accent color
            </label>
            <input
              id="accentColor"
              name="accentColor"
              type="color"
              defaultValue={account.accentColor}
              className="h-10 w-full rounded-md border border-[var(--border)]"
            />
          </div>
          <div>
            <label htmlFor="contactEmail" className="mb-1 block text-sm font-medium text-[var(--ink)]">
              Contact email on reports (optional)
            </label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={account.contactEmail ?? ""}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="logoUrl" className="mb-1 block text-sm font-medium text-[var(--ink)]">
            Logo URL (optional, png/jpg/svg/webp)
          </label>
          <input
            id="logoUrl"
            name="logoUrl"
            defaultValue={account.logoUrl ?? ""}
            placeholder="https://yourstudio.com/logo.png"
            className={inputClass}
          />
        </div>
        <SubmitButton pendingLabel="Saving...">Save branding</SubmitButton>
      </form>
      )}

      {account.isDemo ? null : (
      <form action={changePasswordForm} className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="font-semibold">Change password</h2>
        <div>
          <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium text-[var(--ink)]">
            Current password
          </label>
          <input id="currentPassword" name="currentPassword" type="password" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-[var(--ink)]">
            New password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            placeholder="10+ characters, letters and numbers"
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)]"
        >
          Change password
        </button>
      </form>
      )}
    </div>
  );
}
