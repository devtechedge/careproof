# Billing, trust, and the $2k MRR path

Updated: 2026-10-24 (session 3) with provider facts verified TODAY on official pages. Nothing here is live. All payment actions need Dev's approval and an eligibility check at signup first.

## Pricing model (targets, not forecasts)

- Starter $19/mo - 15 sites, 8 reports/mo.
- Studio $49/mo - 50 sites, 30 reports/mo.
- Agency $99/mo - 150 sites, 90 reports/mo.
- Annual = 10x monthly. Pilot offer: first 2 months at 50%.

Plan limits are enforced in code (lib/plans.ts) today; checkout is not wired.

## Bottom-up $2k MRR path

25 Studio ($1,225) + 15 Starter ($285) + 8 Agency ($792) = $2,302 MRR. Milestones: 3 paid pilots (week 2 after outreach start), 10 customers (month 2), 25 (month 3-4), 48 (month 5). Churn assumption to beat: under 4%/mo. Every number is a target to validate, not evidence. At the verified 5% + 50c MoR fee, $2,302 MRR gross becomes roughly $2,090 after fees (a $19 charge nets ~$17.55, $49 nets ~$46.05, $99 nets ~$93.05); fee-adjusted MRR targets are tracked separately from headline MRR.

MRR accounting discipline: only monthly-normalized subscription revenue counts. Annual plans contribute 1/12 of their value per month; the cash itself is tracked separately. Free accounts, one-off report packs, setup fees, and non-recurring pilot revenue never count toward MRR.

## Provider facts (verified on official pages 2026-10-24)

| Provider | India sellers? | Payout rail to India | MoR? | Fee | Subscriptions | Source (checked 2026-10-24) |
|---|---|---|---|---|---|---|
| Lemon Squeezy | Yes; India listed with asterisk | PayPal; bank payout only via Stripe-pre-approved account | Yes | 5% + 50c | Yes, dunning: 4 retries over 2 weeks + update links | docs.lemonsqueezy.com/help/getting-started/supported-countries |
| Paddle | Yes (not on unsupported list) | Wire or Payoneer, monthly cycle, possible $15 SWIFT fee | Yes | 5% + 50c | Yes (incl. UPI for Indian buyers) | paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle |
| Stripe India | Invite-only (stripe.com/in shows "Request an invite") | n/a | No | n/a | Gated behind invite | stripe.com/in |
| PayPal direct | India business accounts exist (cross-border, FIRA) | n/a | No | UNVERIFIED | "Recurring payments" listed, India terms UNVERIFIED | paypal.com/in/business |
| FastSpring | UNVERIFIED | UNVERIFIED | Yes | Custom, not public | Yes | fastspring.com/pricing |

Key correction to earlier notes: Lemon Squeezy bank payouts to India depend on a Stripe pre-approval ("From May 2024, Stripe only accepts new accounts from India on an invite-only basis" per LS docs); without a Stripe invite, LS payouts run through PayPal. Paddle's payout docs do not name India specifically - confirm at signup.

## Signup verification checklist (run before writing any code)

1. Account approval names India as an accepted seller country.
2. Exact payout method to the Indian bank: rail, minimum threshold, fees (incl. whether the $15 SWIFT fee applies), payout schedule.
3. Subscriptions + dunning enabled for the account type (LS: 4 retries/2 weeks is documented; verify in-account).
4. India KYC documents requested (PAN/GST fields) - none of the providers state GST requirements for Indian SaaS exporters on public pages (open question for the CA, not the provider).
5. Webhook signing secrets flow + test-mode checkout against the deployed app.
Order of preference: Paddle first (direct bank/Payoneer rail), Lemon Squeezy second (realistic PayPal payouts). Decision after both signups' real payout terms are seen.

## Implementation checklist (when approved)

- Server-side entitlement enforcement already exists (lib/plans.ts limits) - keep as the single source of truth.
- Webhooks: verify signature, idempotent handler keyed on provider event id, replay-safe.
- Lifecycle: failed payment -> dunning (provider-side) -> plan downgrade at period end, never mid-period lockout of report history.
- Cancellation: self-serve cancel keeps access to period end (matches refunds page).
- Refunds: provider-console refund flips plan to free at period end; report history stays accessible (data is the agency's).
- Account deletion on request: delete account + sites + runs + reports (privacy page promises this).

## Trust assets in the product

- Terms, privacy, refunds/cancellation templates (not-legal-advice flags; professional review before paid launch).
- noindex share links, revocable by unpublishing (this session), hashed session tokens, scrypt passwords, per-tenant scoping, rate limits, outbound network guard.
- Report footer discloses point-in-time public observations; no claims about backups/updates/remediation.

## Open legal/tax flags (for qualified advisors, not advice)

- India GST treatment of exported SaaS subscriptions under a MoR (zero-rated export vs domestic treatment) - CA question once revenue is real.
- Professional trademark search for "CareProof" before paid launch (collision facts in docs/COMPETITIVE_POSITIONING.md).
