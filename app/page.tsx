import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function sampleReportLink(): Promise<string | null> {
  const demo = await prisma.report.findFirst({
    where: { status: "published" },
    orderBy: { createdAt: "desc" },
    select: { publicId: true },
  });
  return demo ? `/r/${demo.publicId}` : null;
}

const CHECKS = [
  ["Site is up", "HTTP status and response time from the homepage."],
  ["SSL certificate", "Validity, issuer and days to expiry."],
  ["HTTPS redirect", "Visitors on http:// are sent to https://."],
  ["Security headers", "HSTS, CSP and the other standard protections."],
  ["Response speed", "Time to first byte, flagged against sane thresholds."],
  ["Homepage links", "A sample of links checked for 404s."],
  ["robots.txt and sitemap", "Both reachable, sitemap declared."],
  ["Domain expiry", "Registration expiry via the public RDAP registry."],
];

export default async function LandingPage() {
  const sample = await sampleReportLink();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            CareProof
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <a href="#pricing" className="text-slate-600 hover:text-slate-900">
              Pricing
            </a>
            {sample ? (
              <a href={sample} className="text-slate-600 hover:text-slate-900">
                Sample report
              </a>
            ) : null}
            <Link
              href="/login"
              className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
            >
              Start free
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <p className="mb-4 inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            For web agencies and freelancers on care retainers
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Your clients ask what the retainer pays for. Send them proof.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            CareProof checks every site you manage and turns the results into a branded
            monthly report in minutes. Any stack: WordPress, Webflow, Shopify, custom.
            No plugin to install, nothing to self-host.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700"
            >
              Create your first report
            </Link>
            {sample ? (
              <a
                href={sample}
                className="rounded-md border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50"
              >
                See a sample report
              </a>
            ) : null}
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Deterministic checks only. No AI, no third-party data, your branding on every page.
          </p>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-3">
            {[
              [
                "1. Add sites",
                "Paste the URLs you already look after. No plugin, no credentials, nothing installed on the client site.",
              ],
              [
                "2. Run checks",
                "One click runs the full set: uptime, SSL, expiry, redirects, headers, speed, links, sitemap.",
              ],
              [
                "3. Send the report",
                "A branded, client-ready monthly report with your logo, your colour, and a note in your voice. Share link or print to PDF.",
              ],
            ].map(([title, body]) => (
              <div key={title}>
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold tracking-tight">What the report proves</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Every check is a plain, defensible fact a client can read. Warnings say what to
            fix, passes say what you kept healthy.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {CHECKS.map(([label, body]) => (
              <div
                key={label}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
                <p className="mt-1 text-sm text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-2xl font-bold tracking-tight">Flat pricing, not per site</h2>
            <p className="mt-2 text-slate-600">
              Incumbents charge per site or lock white-label behind enterprise tiers.
              Every CareProof plan includes your branding on the reports.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {[
                {
                  name: "Starter",
                  price: "$19",
                  per: "/month",
                  for: "Freelancers up to 15 client sites.",
                  features: ["15 sites", "Branded monthly reports", "Share links", "Print to PDF"],
                  cta: "Start with Starter",
                },
                {
                  name: "Studio",
                  price: "$49",
                  per: "/month",
                  for: "Small agencies up to 50 sites.",
                  features: ["50 sites", "Everything in Starter", "30 reports/month", "Priority checks"],
                  cta: "Choose Studio",
                  highlight: true,
                },
                {
                  name: "Agency",
                  price: "$99",
                  per: "/month",
                  for: "Agencies up to 150 sites.",
                  features: ["150 sites", "Everything in Studio", "90 reports/month", "API access (coming)"],
                  cta: "Choose Agency",
                },
              ].map((tier) => (
                <div
                  key={tier.name}
                  className={`rounded-xl border p-6 ${
                    tier.highlight
                      ? "border-blue-600 ring-2 ring-blue-100"
                      : "border-slate-200"
                  }`}
                >
                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{tier.for}</p>
                  <p className="mt-4 text-3xl font-bold">
                    {tier.price}
                    <span className="text-base font-normal text-slate-500">{tier.per}</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    {tier.features.map((f) => (
                      <li key={f}>- {f}</li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-6 block rounded-md px-4 py-2 text-center text-sm font-semibold ${
                      tier.highlight
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {tier.cta}
                  </Link>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-slate-500">
              Prices in USD. Annual is 10x the monthly price (two months free). Plan limits
              shown are enforced in the product today; checkout goes live after the pilot.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold tracking-tight">Why agencies switch</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="font-semibold">Mixed stacks, one report</h3>
              <p className="mt-2 text-sm text-slate-600">
                ManageWP and MainWP only cover WordPress. CareProof checks any public URL,
                so the Webflow and Shopify clients sit in the same monthly report as the
                WordPress ones.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="font-semibold">Your brand, every tier</h3>
              <p className="mt-2 text-sm text-slate-600">
                Watermarks and sender addresses belong to free tiers elsewhere. On CareProof
                the report carries your name, colour and logo from day one.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="font-semibold">Nothing to self-host</h3>
              <p className="mt-2 text-sm text-slate-600">
                MainWP means running your own server. CareProof is a login away, and the
                checks run on our side with hard timeouts and no site credentials.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="font-semibold">Flat, predictable cost</h3>
              <p className="mt-2 text-sm text-slate-600">
                Per-site pricing punishes growth. Pick a plan by portfolio size and stop
                doing arithmetic before every client report.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <p>CareProof - proof of care for website retainers.</p>
          <div className="flex gap-4">
            <Link href="/legal/terms" className="hover:text-slate-800">
              Terms
            </Link>
            <Link href="/legal/privacy" className="hover:text-slate-800">
              Privacy
            </Link>
            <Link href="/legal/refunds" className="hover:text-slate-800">
              Refunds
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
