# Billing, trust, and the $2k MRR path

Updated: 2026-10-24. Nothing here is live. All payment actions need Dev's approval and an eligibility check first.

## Pricing model (targets, not forecasts)

- Starter $19/mo - 15 sites, 8 reports/mo.
- Studio $49/mo - 50 sites, 30 reports/mo.
- Agency $99/mo - 150 sites, 90 reports/mo.
- Annual = 10x monthly. Pilot offer: first 2 months at 50%.

Plan limits are enforced in code (lib/plans.ts) today; checkout is not wired.

## Bottom-up $2k MRR path

25 Studio ($1,225) + 15 Starter ($285) + 8 Agency ($792) = $2,302 MRR. Milestones: 3 paid pilots (week 2 after outreach start), 10 customers (month 2), 25 (month 3-4), 48 (month 5). Churn assumption to beat: under 4%/mo; the report is monthly-visible, so churn risk is contract-loss driven more than value-loss driven. Every number is a target to validate, not evidence.

MRR accounting discipline: only monthly-normalized subscription revenue counts. Annual plans count as 1/12 per month toward MRR, the cash itself is tracked separately. One-off report packs, pilot one-offs, and setup fees never count toward MRR.

## India-based founder payout route (from the HandoffKit investigation, 2026-10-23; RE-VERIFY before launch)

- Lemon Squeezy as Merchant of Record primary: handles global sales tax/VAT, accepts India founders, payouts via PayPal (and other rails). Fee roughly 5% + 50c, which is the cost of not handling EU VAT oneself.
- Stripe India: assumed invite-only for India-registered solo founders; do not build on it without a verified invitation.
- Paddle: alternative MoR of the same shape; compare payout rails to India and subscription dunning before choosing.
- PayPal direct: works for India payouts but is not a MoR; tax handling stays with the seller.
- Action item before any live charge: create the Lemon Squeezy store, verify India payout details in the dashboard, run test-mode checkout + webhook against the deployed app, only then ask Dev to approve live mode.

## Trust assets in the product already

- Terms, privacy, refunds/cancellation pages (templates, flagged not-legal-advice, linked in the footer).
- noindex share links, hashed session tokens, scrypt passwords, per-tenant scoping, rate limits.
- Report footer discloses: checks are point-in-time, run with hard timeouts, against public pages only.

## Open legal/tax flags (for review, not advice)

- India GST on exported SaaS subscriptions (zero-rated export vs domestic treatment; needs a CA view once revenue is real).
- Lemon Squeezy MoR handles buyer-side VAT/sales tax; confirm India-side income treatment with the CA.
- Trademark/domain availability for "CareProof" unchecked. Do before anything public.
