export const metadata = { title: "Privacy Policy - CareProof" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 text-sm leading-6 text-slate-700">
      <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
      <p className="mt-2 text-xs text-amber-700">
        TEMPLATE - review with a professional before launch. Not legal advice.
      </p>
      <div className="mt-6 space-y-4">
        <p>
          CareProof stores: your account email, hashed password (scrypt), agency name and
          branding, the site labels and URLs you add, check results, generated reports, and
          rate-limit counters. No payment data is stored; billing is handled by the payment
          provider when checkout goes live.
        </p>
        <p>
          Checks run from our servers against the public URLs you add. We store the results
          (status, timings, header scores, sampled link outcomes), not page content.
        </p>
        <p>
          Report share links use an unlisted random identifier and are marked noindex. Anyone
          with the link can view that one report. Do not publish links to reports containing
          information you consider sensitive.
        </p>
        <p>
          We do not sell data and run no third-party analytics or advertising trackers in the
          app. Data deletion requests: email the address on your reports and we will delete the
          account and its data.
        </p>
      </div>
    </div>
  );
}
