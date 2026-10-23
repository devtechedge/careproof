import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Refunds and Cancellation - CareProof" };

export default function RefundsPage() {
  return (
    <div className="relative mx-auto max-w-2xl px-6 py-12 text-sm leading-6 text-[var(--ink)]">
      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <h1 className="text-2xl font-bold text-[var(--ink)]">Refunds and Cancellation</h1>
      <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
        TEMPLATE - review with a professional before launch. Not legal advice.
      </p>
      <div className="mt-6 space-y-4">
        <p>
          Cancel any time; cancellation stops future renewals and keeps access until the end of
          the paid period. Monthly plans can be refunded in full within 14 days of a charge if
          fewer than three reports were generated in that period.
        </p>
        <p>
          Annual plans can be refunded pro rata within 30 days. After that, annual plans are
          refundable only if the service was materially unavailable.
        </p>
        <p>
          During the pilot phase all refunds and cancellations are handled by email to the
          contact address on your reports, typically within 5 business days.
        </p>
      </div>
    </div>
  );
}
