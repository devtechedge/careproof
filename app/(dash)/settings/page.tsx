import { changePasswordForm, saveBrandingForm } from "@/app/actions";
import { currentAccount } from "@/lib/auth";
import { planFor } from "@/lib/plans";

export const metadata = { title: "Settings - CareProof" };
export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600";

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
        <p className="mt-1 text-sm text-slate-600">
          {account.email} - {plan.name} plan ({plan.siteLimit} sites, {plan.reportLimitPerMonth} reports/month).
          Plan changes are manual during the pilot; reply to any CareProof email to switch.
        </p>
      </div>

      {msg ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{msg}</p>
      ) : null}
      {account.isDemo ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          The demo workspace is read-only: branding and password changes are disabled.
        </p>
      ) : null}
      {err ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{err}</p>
      ) : null}

      {account.isDemo ? null : (
      <form action={saveBrandingForm} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Report branding</h2>
        <p className="text-xs text-slate-500">Appears on every report you generate, including already published ones at render time for drafts.</p>
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
            Display name
          </label>
          <input id="name" name="name" defaultValue={account.name} required className={inputClass} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="accentColor" className="mb-1 block text-sm font-medium text-slate-700">
              Accent color
            </label>
            <input
              id="accentColor"
              name="accentColor"
              type="color"
              defaultValue={account.accentColor}
              className="h-10 w-full rounded-md border border-slate-300"
            />
          </div>
          <div>
            <label htmlFor="contactEmail" className="mb-1 block text-sm font-medium text-slate-700">
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
          <label htmlFor="logoUrl" className="mb-1 block text-sm font-medium text-slate-700">
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
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Save branding
        </button>
      </form>
      )}

      {account.isDemo ? null : (
      <form action={changePasswordForm} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Change password</h2>
        <div>
          <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium text-slate-700">
            Current password
          </label>
          <input id="currentPassword" name="currentPassword" type="password" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-slate-700">
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
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Change password
        </button>
      </form>
      )}
    </div>
  );
}
