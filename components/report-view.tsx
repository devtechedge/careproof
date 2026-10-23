import { CHECK_META, type CheckStatus } from "@/lib/checks";

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
  overall: "pass" | "warn" | "fail";
  checks: ReportCheck[];
}

const STATUS_STYLE: Record<CheckStatus, string> = {
  pass: "bg-emerald-50 text-emerald-700",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
  info: "bg-slate-100 text-slate-600",
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
}: {
  items: ReportItemView[];
  branding: ReportBranding;
  note: string;
  period: string;
}) {
  const accent = branding.accentColor;
  return (
    <div className="print-page rounded-xl border border-slate-200 bg-white p-8">
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
            <p className="text-xs text-slate-500">Website care report</p>
          </div>
        </div>
        <p className="text-sm font-semibold" style={{ color: accent }}>
          {period}
        </p>
      </div>

      {note ? (
        <p className="mt-6 rounded-lg bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{note}</p>
      ) : null}

      {branding.isDemo ? (
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-amber-600">
          Demo workspace - sample data, not live checks
        </p>
      ) : null}

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
                  <h3 className="font-semibold text-slate-900">{item.siteLabel}</h3>
                  <p className="text-xs text-slate-500">{item.siteUrl}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLE[item.overall]}`}>
                    {item.overall === "pass" ? "All healthy" : item.overall === "warn" ? "Attention needed" : "Issues found"}
                  </span>
                  <span className="text-slate-500">
                    {counts.pass} pass / {counts.warn} attention / {counts.fail} issues
                  </span>
                </div>
              </div>
              <table className="mt-3 w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {item.checks.map((check) => (
                    <tr key={check.checkKey}>
                      <td className="py-2 pr-2 align-top font-medium text-slate-800">
                        <CheckLabel checkKey={check.checkKey} />
                      </td>
                      <td className="py-2 pr-2 align-top text-slate-700">{check.value}</td>
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

      <footer className="mt-8 border-t border-slate-100 pt-4 text-xs text-slate-400">
        <p>
          Prepared by {branding.name}
          {branding.contactEmail ? ` - ${branding.contactEmail}` : ""}. Checks ran against the
          public site with hard timeouts; results reflect the moment of the check run.
        </p>
      </footer>
    </div>
  );
}
