import { addSiteForm, generatePortfolioForm, generateReportForm, removeSiteForm, runAllChecksForm, runChecksForm } from "@/app/actions";
import { SubmitButton } from "@/components/forms";
import { currentAccount } from "@/lib/auth";
import { planFor } from "@/lib/plans";
import { listSites } from "@/lib/services";

export const metadata = { title: "Sites - CareProof" };
export const dynamic = "force-dynamic";

function StatusPill({ status }: { status: "pass" | "warn" | "fail" | "info" }) {
  const map = {
    pass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    warn: "bg-amber-500/10 text-amber-700 dark:text-amber-400 dark:text-amber-300 border-amber-500/30",
    fail: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
    info: "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]",
  } as const;
  const label = { pass: "Healthy", warn: "Attention", fail: "Issue", info: "Not checked" };
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${map[status]}`}>
      {label[status]}
    </span>
  );
}

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const account = (await currentAccount())!;
  const plan = planFor(account.plan);
  const sites = await listSites(account.id);
  const sp = await searchParams;
  const msg = typeof sp.msg === "string" ? sp.msg : null;
  const err = typeof sp.err === "string" ? sp.err : null;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your sites</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {sites.length} of {plan.siteLimit} sites on the {plan.name} plan.
          </p>
        </div>
        {sites.length > 0 && !account.isDemo ? (
          <form action={runAllChecksForm}>
            <button
              type="submit"
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)]"
            >
              Run checks (5 at a time)
            </button>
          </form>
        ) : null}
      </div>

      {msg ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      ) : null}
      {account.isDemo ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400 dark:text-amber-300">
          You are in the shared demo workspace: everything is read-only so every visitor sees the
          same product. Create your own account to add sites and generate reports.
        </p>
      ) : null}
      {err ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-300">
          {err}
        </p>
      ) : null}

      {account.isDemo ? null : (
      <form
        action={addSiteForm}
        className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:grid-cols-[1fr_1fr_auto]"
      >
        <div>
          <label htmlFor="label" className="mb-1 block text-sm font-medium text-[var(--ink)]">
            Client or site label
          </label>
          <input
            id="label"
            name="label"
            required
            placeholder="Bakery Co"
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-blue-600"
          />
        </div>
        <div>
          <label htmlFor="url" className="mb-1 block text-sm font-medium text-[var(--ink)]">
            Site URL
          </label>
          <input
            id="url"
            name="url"
            required
            placeholder="https://bakeryco.com"
            className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-blue-600"
          />
        </div>
        <div className="flex items-end">
          <SubmitButton pendingLabel="Adding...">Add site</SubmitButton>
        </div>
      </form>
      )}

      {sites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">
          <p className="font-medium text-[var(--ink)]">How this works</p>
          <p className="mx-auto mt-2 max-w-xl leading-6">
            Add a client site URL above. A check run fetches only public pages (no credentials,
            nothing installed) and records reachability, certificate, redirect, header, link and
            domain facts at that moment. Generate a client report and we snapshot those results
            with timestamps; send the share link to your client.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Client sites with their latest check status</caption>
            <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th scope="col" className="px-4 py-3">Site</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Last checks</th>
                <th scope="col" className="px-4 py-3">Results</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {sites.map((site) => (
                <tr key={site.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--ink)]">{site.label}</p>
                    <p className="text-xs text-[var(--muted)]">{site.url}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={site.lastStatus} />
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {site.lastRunAt
                      ? new Date(site.lastRunAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Never"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--muted)]">
                    {site.summary ? (
                      <span>
                        {site.summary.pass} pass, {site.summary.warn} warn, {site.summary.fail} fail, {site.summary.info} not assessed
                      </span>
                    ) : (
                      <span className="text-[var(--faint)]">Run checks first</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {account.isDemo ? (
                      <span className="text-xs text-[var(--faint)]">Read-only</span>
                    ) : (
                    <div className="flex justify-end gap-2">
                      <form action={runChecksForm}>
                        <input type="hidden" name="siteId" value={site.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)]"
                        >
                          Run checks
                        </button>
                      </form>
                      <form action={removeSiteForm}>
                        <input type="hidden" name="siteId" value={site.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold">This month&apos;s reports</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          A client report includes only the sites you select below, so one client never sees
          another client&apos;s domains or findings. Report contents are saved at generation
          time and never change after you publish.
        </p>
        {account.isDemo ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Report generation is disabled in the demo. The pre-generated sample report is on the Reports page.
          </p>
        ) : (
        <form action={generateReportForm} className="mt-4 space-y-3">
          <fieldset>
            <legend className="text-sm font-medium text-[var(--ink)]">
              Sites to include in this client report
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sites.map((site) => (
                <label key={site.id} className="flex items-start gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm">
                  <input type="checkbox" name="siteIds" value={site.id} className="mt-0.5" />
                  <span>
                    <span className="font-medium text-[var(--ink)]">{site.label}</span>
                    <span className="block break-all text-xs text-[var(--faint)]">{site.url}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="scopeLabel"
              placeholder="Client name for this report (optional)"
              className="rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-blue-600"
            />
            <input
              name="note"
              placeholder="Note to clients, e.g. what you improved this month (optional)"
              className="rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-blue-600"
            />
          </div>
          <SubmitButton pendingLabel="Generating...">Generate client report</SubmitButton>
        </form>
        )}
        {sites.length > 0 && !account.isDemo ? (
          <details className="mt-4 rounded-md border border-[var(--border)] px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-[var(--ink)]">
              Internal portfolio report (all {sites.length} sites)
            </summary>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Includes every site on your account in one document. Useful internally; do not
              send it to a single client, because it lists all of your other clients.
            </p>
            <form action={generatePortfolioForm} className="mt-2">
              <SubmitButton
                pendingLabel="Generating..."
                className="rounded-md border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface-2)]"
              >
                Generate internal portfolio report
              </SubmitButton>
            </form>
          </details>
        ) : null}
      </section>
    </div>
  );
}
