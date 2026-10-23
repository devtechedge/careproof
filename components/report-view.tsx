import { CHECK_META, type CheckStatus } from "@/lib/checks";
import { observedLabel } from "@/lib/report";

export interface ReportCheck {
  checkKey: string;
  status: CheckStatus;
  value: string;
  detail: string;
}

export interface ReportBranding {
  name: string;
  accentColor: string;
  logoUrl: string | null;
  contactEmail: string | null;
  isDemo?: boolean;
}

export interface ReportItemView {
  id: string;
  siteLabel: string;
  siteUrl: string;
  overall: "pass" | "warn" | "fail" | "info";
  checks: ReportCheck[];
  observedAt?: Date | string | null;
  fresh?: boolean;
}

const STATUS_STYLE: Record<CheckStatus, string> = {
  pass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warn: "bg-amber-500/10 text-amber-700 dark:text-amber-400 dark:text-amber-300",
  fail: "bg-red-500/10 text-red-700 dark:text-red-300",
  info: "bg-[var(--surface-2)] text-[var(--muted)]",
};

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: "Pass",
  warn: "Attention",
  fail: "Issue",
  info: "Info",
};

function CheckLabel({ checkKey }: { checkKey: string }) {
  return <>{CHECK_META[checkKey]?.label ?? checkKey}</>;
}

export function ReportItems({
  items,
  branding,
  note,
  period,
  staleCount = 0,
  scopeType = "client",
}: {
  items: ReportItemView[];
  branding: ReportBranding;
  note: string;
  period: string;
  staleCount?: number;
  scopeType?: string;
}) {
  const accent = branding.accentColor;
  return (
    <div className="print-page rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8">
      <div className="flex items-center justify-between border-b pb-6" style={{ borderColor: accent }}>
        <div className="flex items-center gap-3">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt="" className="h-10 w-10 rounded-md object-contain" />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-md text-lg font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              {branding.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-bold leading-tight">{branding.name}</p>
            <p className="text-xs text-[var(--muted)]">
              {scopeType === "portfolio" ? "Website care report - all sites" : "Website care report"}
            </p>
          </div>
        </div>
        <p className="text-sm font-semibold" style={{ color: accent }}>
          {period}
        </p>
      </div>

      {note ? (
        <p className="mt-6 rounded-lg bg-[var(--surface-2)] px-4 py-3 text-sm leading-6 text-[var(--ink)]">{note}</p>
      ) : null}

      {branding.isDemo ? (
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-amber-600">
          Demo workspace - sample data, not live checks
        </p>
      ) : null}

      {staleCount > 0 ? (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs leading-5 text-amber-700 dark:text-amber-400 dark:text-amber-300">
          {staleCount} of {items.length} site observation{staleCount === 1 ? "" : "s"} date back
          more than 7 days. Each site below shows exactly when its checks ran; treat older
          observations as a historical snapshot, not a statement of current health.
        </p>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
        Results below are point-in-time public observations (uptime, certificate, headers, links,
        registry data). They do not verify backups, software updates, or remediation work unless
        the agency documents it in the note above.
      </p>

      <div className="mt-6 space-y-8">
        {items.map((item) => {
          const counts = {
            pass: item.checks.filter((c) => c.status === "pass").length,
            warn: item.checks.filter((c) => c.status === "warn").length,
            fail: item.checks.filter((c) => c.status === "fail").length,
          };
          return (
            <section key={item.id} className="break-inside-avoid">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-[var(--ink)]">{item.siteLabel}</h3>
                  <p className="text-xs text-[var(--muted)]">{item.siteUrl}</p>
                  <p className="text-xs text-[var(--faint)]">
                    {observedLabel(item.observedAt)}
                    {item.fresh ? " - rechecked for this report" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLE[item.overall]}`}>
                    {item.overall === "pass"
                      ? "All assessed checks healthy"
                      : item.overall === "warn"
                        ? "Attention needed"
                        : item.overall === "info"
                          ? "Not assessable"
                          : "Issues found"}
                  </span>
                  <span className="text-[var(--muted)]">
                    {counts.pass} pass / {counts.warn} attention / {counts.fail} issues
                  </span>
                </div>
              </div>
              <table className="mt-3 w-full text-sm">
                <tbody className="divide-y divide-[var(--border)]">
                  {item.checks.map((check) => (
                    <tr key={check.checkKey}>
                      <td className="py-2 pr-2 align-top font-medium text-slate-800">
                        <CheckLabel checkKey={check.checkKey} />
                      </td>
                      <td className="py-2 pr-2 align-top text-[var(--ink)]">{check.value}</td>
                      <td className="py-2 align-top">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-bold ${STATUS_STYLE[check.status]}`}
                        >
                          {STATUS_LABEL[check.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>

      <footer className="mt-8 border-t border-[var(--border)] pt-4 text-xs text-[var(--faint)]">
        <p>
          Prepared by {branding.name}
          {branding.contactEmail ? ` - ${branding.contactEmail}` : ""}. Each check ran against the
          public site at the observation time shown per site, with hard timeouts. Results reflect
          that moment and are not a guarantee of future availability or security. Any backup,
          update, or remediation work is the agency&#39;s own claim, not something these checks
          can verify.
        </p>
      </footer>
    </div>
  );
}
