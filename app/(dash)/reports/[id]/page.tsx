import { notFound } from "next/navigation";
import { publishReportForm, saveNoteForm } from "@/app/actions";
import { CopyButton } from "@/components/forms";
import { ReportItems, type ReportBranding } from "@/components/report-view";
import { currentAccount } from "@/lib/auth";
import { getReportForOwner } from "@/lib/services";
import { parseChecksSnapshot, periodLabel, worstOverall } from "@/lib/report";

export const metadata = { title: "Report - CareProof" };
export const dynamic = "force-dynamic";

export default async function ReportDetailPage({
  params,
}: PageProps<"/reports/[id]">) {
  const account = (await currentAccount())!;
  const { id } = await params;
  const report = await getReportForOwner(account.id, id);
  if (!report) notFound();

  const branding = JSON.parse(report.brandingJson) as ReportBranding;
  const items = report.items.map((item) => ({
    id: item.id,
    siteLabel: item.siteLabel,
    siteUrl: item.siteUrl,
    overall: item.overall as "pass" | "warn" | "fail",
    checks: parseChecksSnapshot(item.checksJson),
  }));
  const overall = worstOverall(items);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const shareUrl = `${siteUrl}/r/${report.publicId}`;

  const overallTone =
    overall === "pass"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : overall === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-red-200 bg-red-50 text-red-800";

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {periodLabel(report.period)} report
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {items.length} sites - generated{" "}
            {new Date(report.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={shareUrl} label="Copy share link" />
          <a
            href={`/r/${report.publicId}`}
            target="_blank"
            className="no-print rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Open report
          </a>
          {report.status !== "published" ? (
            <form action={publishReportForm}>
              <input type="hidden" name="reportId" value={report.id} />
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Publish
              </button>
            </form>
          ) : (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              Published
            </span>
          )}
        </div>
      </div>

      <div className={`no-print rounded-xl border px-4 py-3 text-sm font-medium ${overallTone}`}>
        Portfolio status this month:{" "}
        {overall === "pass" ? "all checks healthy" : overall === "warn" ? "attention needed" : "issues found"}.
        {items.filter((i) => i.overall === "fail").length > 0
          ? ` ${items.filter((i) => i.overall === "fail").length} site(s) with failing checks.`
          : ""}
      </div>

      <form action={saveNoteForm} className="no-print rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Note to clients</h2>
        <p className="mt-1 text-xs text-slate-500">
          Appears at the top of the report. Plain text, max 600 characters.
        </p>
        <input type="hidden" name="reportId" value={report.id} />
        <textarea
          name="note"
          rows={3}
          defaultValue={report.agencyNote}
          placeholder="This month we updated plugins on all WordPress sites and renewed the SSL certificate for Bakery Co."
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
        />
        <button
          type="submit"
          className="mt-2 rounded-md border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Save note
        </button>
      </form>

      <ReportItems items={items} branding={branding} note={report.agencyNote} period={periodLabel(report.period)} />
    </div>
  );
}
