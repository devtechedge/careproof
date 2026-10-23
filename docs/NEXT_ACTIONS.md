# Next Actions

Updated: 2026-10-24 (end of session 3, security-hardening branch, NOT merged).

## Blocked on Dev (approval needed)

1. MERGE + DEPLOY the security-hardening branch (10 commits: SSRF guard, demo read-only, freshness, sessions, copy fixes). After merge: `DATABASE_URL_UNPOOLED=<prod> npx prisma db push` adds the observedAt/fresh columns to production, then push main auto-deploys. Production DB is otherwise untouched.
2. Outreach batch: prospect list + templates ready; needs his read + approval + send (his accounts).
3. Name/trademark: professional search for "CareProof" (collision facts in docs/COMPETITIVE_POSITIONING.md); rename decision before paid launch.
4. Payments: verify Lemon Squeezy India eligibility at signup (see BILLING_AND_MRR.md checklist) before any checkout work.
5. Custom domain choice (careproof.com is parked/for-sale per RDAP 2026-10-24).

## Next session (local, no approval needed)

1. Re-check run of the deployed product post-merge (health, sample report, demo read-only live).
2. Report diffing vs previous period ("what changed" section) - top of the feature backlog, gated on pilot demand.
3. Scheduled re-checks (cron-style) only after pilot demand + architecture check.
4. Email sending only if pilots ask for it.

## Standing weekly goals (unchanged; clock starts when outreach is approved)

- Week 1: 15 outreach, 5 qualified conversations, 2 pilot commitments.
- Week 2: 25 outreach total, first 2 paying customers.
- Track every Friday in VALIDATION_LOG.md: conversations, pilots, customers, MRR, churn, acquisition cost (hours), margin.
