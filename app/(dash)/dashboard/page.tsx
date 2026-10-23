import { addSiteForm, generateReportForm, removeSiteForm, runAllChecksForm, runChecksForm } from "@/app/actions";
import { currentAccount } from "@/lib/auth";
import { planFor } from "@/lib/plans";
import { listSites } from "@/lib/services";

export const metadata = { title: "Sites - CareProof" };
export const dynamic = "force-dynamic";

function StatusPill({ status }: { status: "pass" | "warn" | "fail" | "info" }) {
  const map = {
    pass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    fail: "bg-red-50 text-red-700 border-red-200",
    info: "bg-slate-50 text-slate-600 border-slate-200",
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
          <p className="mt-1 text-sm text-slate-600">
            {sites.length} of {plan.siteLimit} sites on the {plan.name} plan.
          </p>
        </div>
        {sites.length > 0 ? (
          <form action={runAllChecksForm}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Run checks on all sites
            </button>
          </form>
        ) : null}
      </div>

      {msg ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {err}
        </p>
      ) : null}

      <form
        action={addSiteForm}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-[1fr_1fr_auto]"
      >
        <div>
          <label htmlFor="label" className="mb-1 block text-sm font-medium text-slate-700">
            Client or site label
          </label>
          <input
            id="label"
            name="label"
            required
            placeholder="Bakery Co"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
          />
        </div>
        <div>
          <label htmlFor="url" className="mb-1 block text-sm font-medium text-slate-700">
            Site URL
          </label>
          <input
            id="url"
            name="url"
            required
            placeholder="https://bakeryco.com"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Add site
          </button>
        </div>
      </form>

      {sites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No sites yet. Add the first client site above, then run checks.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last checks</th>
                <th className="px-4 py-3">Results</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sites.map((site) => (
                <tr key={site.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{site.label}</p>
                    <p className="text-xs text-slate-500">{site.url}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={site.lastStatus} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {site.lastRunAt
                      ? new Date(site.lastRunAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Never"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {site.summary ? (
                      <span>
                        {site.summary.pass} pass, {site.summary.warn} warn, {site.summary.fail} fail
                      </span>
                    ) : (
                      <span className="text-slate-400">Run checks first</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <form action={runChecksForm}>
                        <input type="hidden" name="siteId" value={site.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">This month&apos;s report</h2>
        <p className="mt-1 text-sm text-slate-600">
          Generates a branded report from the latest check results (runs fresh checks for any
          site that has none). Optionally add a note your clients will read at the top.
        </p>
        <form action={generateReportForm} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            name="note"
            placeholder="Note to clients, e.g. what you improved this month (optional)"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
          />
          <button
            type="submit"
            disabled={sites.length === 0}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Generate report
          </button>
        </form>
      </section>
    </div>
  );
}
