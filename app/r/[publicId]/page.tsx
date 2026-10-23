import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PrintButton } from "@/components/forms";
import { ReportItems, type ReportBranding } from "@/components/report-view";
import { getReportByPublicId } from "@/lib/services";
import { countStaleItems, parseChecksSnapshot, periodLabel } from "@/lib/report";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Website care report",
  robots: { index: false, follow: false },
};

export default async function PublicReportPage({
  params,
}: PageProps<"/r/[publicId]">) {
  const { publicId } = await params;
  const report = await getReportByPublicId(publicId);
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton label="Download PDF / Print" />
      </div>
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
