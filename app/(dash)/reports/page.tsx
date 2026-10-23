import Link from "next/link";
import { currentAccount } from "@/lib/auth";
import { listReports } from "@/lib/services";
import { periodLabel } from "@/lib/report";

export const metadata = { title: "Reports - CareProof" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const account = (await currentAccount())!;
  const reports = await listReports(account.id);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Every generated report, newest first. Published reports have a shareable client link.
        </p>
      </div>
      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">
          No reports yet. Generate one from the Sites page.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Sites</th>
                <th className="px-4 py-3">Health</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {reports.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <Link href={`/reports/${r.id}`} className="font-semibold text-blue-600 hover:text-blue-700">
                      {periodLabel(r.period)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{r.siteCount}</td>
                  <td className="px-4 py-3 text-xs text-[var(--muted)]">
                    {r.healthCounts.pass} pass / {r.healthCounts.warn} warn / {r.healthCounts.fail} fail
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                        r.status === "published"
                          ? "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]"
                      }`}
                    >
                      {r.status === "published" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {new Date(r.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
