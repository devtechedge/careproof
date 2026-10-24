# Agent instructions for this repository

CareProof: branded, client-scoped website care reports for web agencies.
Live: https://careproof-tau.vercel.app (Vercel, auto-deploy from main).

## Before any change

1. Read in order: README.md, docs/PROJECT_BRIEF.md, docs/DECISIONS.md, docs/ENGINEERING_HANDOFF.md, docs/CHECK_SEMANTICS.md, docs/SECURITY_AUDIT.md, SECURITY.md.
2. Read the Next 16 docs in node_modules/next/dist/docs/ - this is newer than most training data: params/searchParams are Promises, PageProps/LayoutProps are generated globals (run `npx next typegen` first), cacheComponents conflicts with route-level dynamic exports.

## Hard rules

- Work on a feature branch. main auto-deploys to production; nothing merges without the owner's approval.
- Production database is named `careproof`: never run prisma db push, seeds, or destructive queries against it. Tests and schema work use DATABASE_URL_TEST / DATABASE_URL_TEST_UNPOOLED only. scripts/seed-demo.ts refuses the production name unless ALLOW_PROD_SEED=1.
- Preserve: lib/net-guard.ts (SSRF), tenant scoping in lib/services.ts, read-only demo policy, scoped immutable reports, share-link revocation, rate limits.
- Every fix ships with a regression test. Verify before claiming done: npm run lint, npm run typecheck, npx vitest run, npm run build, npx playwright test.
- No em dashes in public-facing text (README, UI copy, commit subjects). Commit subjects describe the product change.
- Do not add AI features, analytics scripts, or dependencies without written justification.

## Deploy runbook (owner-approved deploys only)

1. DATABASE_URL set to the production UNPOOLED URL: npx prisma db push (schema first, code second).
2. Merge to main and push; Vercel auto-deploys; wait for READY.
3. If the demo seed changed: ALLOW_PROD_SEED=1 npm run db:seed against production.
4. Re-probe: /api/health, /dashboard redirect, robots/sitemap, sample report.
