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
        <p className="mt-1 text-sm text-slate-600">
          Every generated report, newest first. Published reports have a shareable client link.
        </p>
      </div>
      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No reports yet. Generate one from the Sites page.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Sites</th>
                <th className="px-4 py-3">Health</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <Link href={`/reports/${r.id}`} className="font-semibold text-blue-600 hover:text-blue-700">
                      {periodLabel(r.period)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.siteCount}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {r.healthCounts.pass} pass / {r.healthCounts.warn} warn / {r.healthCounts.fail} fail
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                        r.status === "published"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {r.status === "published" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
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
