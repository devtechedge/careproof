import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Terms of Service - CareProof" };

export default function TermsPage() {
  return (
    <div className="relative mx-auto max-w-2xl px-6 py-12 text-sm leading-6 text-[var(--ink)]">
      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <h1 className="text-2xl font-bold text-[var(--ink)]">Terms of Service</h1>
      <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
        TEMPLATE - review with a professional before launch. Not legal advice.
      </p>
      <div className="mt-6 space-y-4">
        <p>
          CareProof provides website check reports for sites you are authorized to monitor. By
          using the service you confirm you have permission to run automated checks against the
          URLs you add.
        </p>
        <p>
          The service performs read-only public HTTP/TLS/registry checks with hard timeouts. It
          does not store site credentials and does not modify monitored sites.
        </p>
        <p>
          Plan limits (sites and reports per month) are enforced in the product. Prices are in
          USD. During the pilot phase, plan changes and cancellations are handled by email.
        </p>
        <p>
          The service is provided &quot;as is&quot;. Check results reflect the moment a check ran
          and are not a guarantee of site availability or security. You are responsible for how
          you use and communicate report contents to your clients.
        </p>
        <p>
          Do not use CareProof to probe sites you do not manage, to burden any server, or for any
          unlawful purpose. We may suspend accounts that do.
        </p>
      </div>
    </div>
  );
}
