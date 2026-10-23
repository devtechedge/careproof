# Engineering / QA handoff - trust pass

Date: 2026-10-24. Branch: `p0-trust-pass` (off main fca43ec). NOT deployed; awaiting review. Production (careproof-tau.vercel.app) still runs main and is untouched, including its database.

## Executive summary

Two P0 defects fixed and regression-tested: reports are now explicitly scoped per client (an agency can no longer hand one client a document listing every other client), and result semantics can no longer present missing or skipped checks as success. The pricing journey no longer silently discards the chosen tier, marketing copy was reconciled with real capabilities, and the app gained standard security headers, robots/sitemap routes, and a proper 404. 121 tests green (was 107), including new hostile-input integration suites. The known-knowledge docs (SECURITY_AUDIT, SECURITY_TEST_RESULTS) were reconciled with the actual deployed state after drift was found.

## P0-1 Report scoping (client-data disclosure)

Before: generateReport took every account site; one published link exposed every client's domains, findings and notes to whoever held it.

Fixed: generateReport now takes an explicit scope. Client reports include exactly the selected sites, validated server-side against account ownership (foreign IDs filtered; empty remainder rejected). All-sites reports are a separately labelled internal-portfolio type, with a warning not to send them to a single client. Reports persist scopeType/scopeKey/scopeLabel. Drafts are reused per (account, period, scope): one client's draft never overwrites another's. Published reports remain immutable snapshots that survive site renaming and deletion. Unpublish revokes the link immediately (verified by test). Review page shows scope and included sites before publishing; dashboard defaults to zero selected sites.

Tests: tests/scoped-reports.test.ts (selection, foreign-ID filtering, per-scope drafts, snapshot survives rename/delete, portfolio labelling, quota unchanged).

## P0-2 Report accuracy and semantics

Fixed: documented status semantics (docs/CHECK_SEMANTICS.md). Unreachable homepage now emits explicit "Not assessed" info rows for all dependent checks (all 11 rows always present). overallFor business rules: fail > warn > pass-requires-a-pass > info; empty or all-info sets are "Not assessable", never green. Summaries include info counts and reconcile with displayed rows. The demo narrative contradiction (claimed fixes for links still broken, a "recovered" site shown as down) is corrected in the seed, which now states the actual seeded state.

Also fixed en route (found by my own new tests): the injected test guard did not reach the robots/sitemap/favicon/links/RDAP fetch paths, and favicon could throw an uncaught guard error; both closed.

Tests: tests/checks-integration.test.ts (loopback fixture server through the guard), semantics suites in scoped-reports.test.ts and checks.test.ts (old unsafe assertions updated with justification).

## P1 pricing journey

Plan choice now flows from pricing CTA (/signup?plan=studio) to a validated hidden field; createAccount stores intendedPlan (studio/agency only; unknown IDs ignored) while entitlements stay Starter during the free pilot - shown plainly at signup and in Settings. Pricing cards disclose quotas (incl. Starter's 8 reports/month), "Priority checks" removed (unimplemented), annual-billing claim reworded as planned-not-purchasable, and every CTA area states signup is free and starts nothing on your card. Tests cover valid/invalid intended plans.

## P1 marketing reconciliation

Landing now says point-in-time checks (not continuous uptime), response speed = TTFB at check time (not performance testing), print-to-PDF via browser, no automated email (agency shares the link), RDAP acknowledged as public registry data (no trackers remains true), "free during pilot" next to CTAs. Competitor figures retained are the ones verified against primary sources on 2026-10-24 (docs/COMPETITIVE_POSITIONING.md).

## P1 security and reliability

- Client IP for rate limits now prefers x-vercel-forwarded-for (Vercel-set, unspoofable; Vercel request-headers docs, checked 2026-10-24) over forgeable x-forwarded-for.
- App-level security headers added (nosniff, referrer-policy, frame-options, permissions-policy, HSTS) without breaking server actions.
- Rate limits fail closed (DB errors abort the action); demo read-only, SSRF guard, session rotation, share-link revocation all re-verified by the expanded suite (121 tests).
- docs/SECURITY_AUDIT.md and SECURITY_TEST_RESULTS.md reconciled: they still described the work as "branch, not merged" - now corrected to the merged+deployed reality with current test counts.

## P2 launch readiness

robots.ts (marketing/legal allowed; /r/, dashboard, API disallowed), sitemap.ts (public pages only; share links excluded), Open Graph + twitter metadata, custom 404 that explains unpublished links, health endpoint no longer reports database detail, copy-link gives visible success feedback, unpublish button labelled with its consequence. Legal pages remain clearly-marked templates; the pre-paid-launch review list is unchanged (professional legal review, trademark check, payment-provider signup).

## Verification actually run (this session, this branch)

- npm run lint: clean. npm run typecheck (typegen + tsc): clean.
- npx vitest run: 121/121 passing against careproof_test (~149s).
- next build with test-database env: compiled successfully.
- npx playwright test: 5/5 smokes (landing, theme toggle, demo read-only dashboard, sample report timestamps, signup).
- Not run / blocked: visual mobile-width screenshot review and multi-page print-preview inspection were NOT performed this session (tool time); recommend a 10-minute manual pass before merge. No production deployment, per instruction.

## Files changed (material)

prisma/schema.prisma (+scopeType/scopeKey/scopeLabel on Report, +intendedPlan on Account - additive; prod migration on deploy: DATABASE_URL_UNPOOLED prod db push), lib/services.ts (scoped generation, intended plan), lib/checks.ts (guard threading, skipped rows), lib/report.ts (overall rules), lib/auth.ts (intended plan label), lib/net-guard.ts (unchanged semantics; injection already present), app/actions.ts (scoped forms, plan param, IP fix), dashboard/signup/settings/reports/report-view pages, app/robots.ts + sitemap.ts + not-found.tsx (new), next.config.ts (headers), scripts/seed-demo.ts (consistent narrative, scope), tests/* (+3 files, updated assertions), docs/* (this file, CHECK_SEMANTICS, reconciled security docs).

## Remaining risks and deferred work

- Per-site check runs still fetch sequentially per site; portfolio-wide concurrency is bounded but a 100-site batch is still 20 clicks of "Run all (5)". Acceptable for pilot; revisit only with demand.
- Email verification/password reset remain unimplemented and undocumented as features (checklist item before paid launch).
- Local .env points local dev at the production database (documented README hazard; unchanged this session).
- Signup enumeration tradeoff retained (rate-limited).
- The mobile/print visual QA pass noted above.

## Backlog grouping

Before pilot (this branch): nothing known outstanding - merge + deploy approval is the gate (db push first).
Before paid launch: professional legal review, trademark/name decision, payment-provider signup + webhooks, email verification + reset, dedicated Neon project, move local dev off the prod DB.
Only after demand validation: scheduled recurring checks, automated email delivery, native PDF, API access, report diffing.

## Deployment readiness

Ready for review. Merge order on approval: prisma db push (additive columns) against production, then merge to main for auto-deploy, then reseed demo (ALLOW_PROD_SEED=1) so the public sample carries the corrected narrative and scope labels.
