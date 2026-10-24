import { notFound } from "next/navigation";
import { publishReportForm, saveNoteForm, unpublishReportForm } from "@/app/actions";
import { CopyButton, SubmitButton } from "@/components/forms";
import { ReportItems, type ReportBranding } from "@/components/report-view";
import { currentAccount } from "@/lib/auth";
import { getReportForOwner } from "@/lib/services";
import { countStaleItems, parseChecksSnapshot, periodLabel, worstOverall } from "@/lib/report";

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
    overall: item.overall as "pass" | "warn" | "fail" | "info",
    checks: parseChecksSnapshot(item.checksJson),
    observedAt: item.observedAt,
    fresh: item.fresh,
  }));
  const staleCount = countStaleItems(report.items.map((i) => i.observedAt));
  const overall = worstOverall(items);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const shareUrl = `${siteUrl}/r/${report.publicId}`;

  const overallTone =
    overall === "pass"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : overall === "warn"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
        : overall === "info"
          ? "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]"
          : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";


  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {periodLabel(report.period)} report
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {report.scopeType === "portfolio"
              ? `Internal portfolio report - all ${items.length} site${items.length === 1 ? "" : "s"} (do not send to a single client)`
              : `Client report - ${report.scopeLabel || items.map((i) => i.siteLabel).join(", ")} (${items.length} site${items.length === 1 ? "" : "s"})`}
            {" - generated "}
            {new Date(report.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={shareUrl} label="Copy share link" />
          <a
            href={`/r/${report.publicId}`}
            target="_blank"
            className="no-print rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)]"
          >
            Open report
          </a>
          {report.status !== "published" ? (
            <form action={publishReportForm}>
              <input type="hidden" name="reportId" value={report.id} />
              <SubmitButton pendingLabel="Publishing...">Publish</SubmitButton>
            </form>
          ) : (
            <>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                Published
              </span>
              {account.isDemo ? null : (
                <form action={unpublishReportForm}>
                  <input type="hidden" name="reportId" value={report.id} />
                  <input type="hidden" name="publicId" value={report.publicId} />
                  <button
                    type="submit"
                    className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)]"
                  >
                    Unpublish
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      <div className={`no-print rounded-xl border px-4 py-3 text-sm font-medium ${overallTone}`}>
        Portfolio status this month:{" "}
        {overall === "pass"
          ? "all assessed checks healthy"
          : overall === "warn"
            ? "attention needed"
            : overall === "info"
              ? "not assessable from current observations"
              : "issues found"}.
        {items.filter((i) => i.overall === "fail").length > 0
          ? ` ${items.filter((i) => i.overall === "fail").length} site(s) with failing checks.`
          : ""}
      </div>

      <form action={saveNoteForm} className="no-print rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-sm font-semibold text-[var(--ink)]">Note to clients</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Appears at the top of the report. Plain text, max 600 characters.
          {report.status === "published" ? " Published reports are immutable; unpublish to edit." : ""}
        </p>
        <input type="hidden" name="reportId" value={report.id} />
        <textarea
          name="note"
          rows={3}
          defaultValue={report.agencyNote}
          disabled={report.status === "published" || account.isDemo}
          placeholder="This month we updated plugins on all WordPress sites and renewed the SSL certificate for Bakery Co."
          className="mt-2 w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-blue-600 disabled:bg-[var(--surface-2)] disabled:text-[var(--faint)]"
        />
        <button
          type="submit"
          disabled={report.status === "published" || account.isDemo}
          className="mt-2 rounded-md border border-[var(--border)] px-4 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)] disabled:opacity-50"
        >
          Save note
        </button>
      </form>

      <ReportItems
        items={items}
        branding={branding}
        note={report.agencyNote}
        period={periodLabel(report.period)}
        staleCount={staleCount}
        scopeType={report.scopeType}
      />
    </div>
  );
}
