# Decisions

Append-only log. Each entry: date, decision, why, what would change it.

## 2026-10-24

1. CHOSEN IDEA: care-plan reporting for mixed-stack agencies (score 36/40), over approval workflows (29) and Shopify store health (26). Why: only idea with documented recurring pain, proven spend at adjacent price points, an empty differentiation slot (any-stack + report-first + white-label flat), near-zero cost to serve, and solo build speed. Change trigger: 7-day validation failure thresholds in VALIDATION_LOG.md.

2. NAME: "CareProof" working name. Rationale: report is proof of care. Trademark/domain search NOT yet done (flagged in NEXT_ACTIONS); non-blocking for MVP.

3. STACK: Next.js (App Router) + TypeScript + Tailwind + Prisma + SQLite for local MVP. Why SQLite: zero-setup local dev and tests with no external service signup (no purchases/external actions without approval); schema kept portable (string enums, no SQLite-specific column types) so the Postgres/Neon switch at deploy is a provider flip plus migration. Change trigger: deploy approval, then provider flips to postgresql.

4. AUTH: email + password, scrypt, DB-backed sessions, HttpOnly cookies. Mirrors proven house pattern (HandoffKit), no third-party auth dependency.

5. CHECKS ARE DETERMINISTIC ONLY: uptime/latency, TLS cert expiry, HTTPS redirect, security headers, TTFB + page weight, robots.txt, sitemap.xml, favicon, capped homepage link check, RDAP domain expiry (best-effort). No AI, no paid third-party data APIs. Every check has a hard timeout and result is stored pass/fail/warn + raw metadata.

6. REPORT = server-rendered branded HTML with print stylesheet (browser print-to-PDF) + unlisted share link (random publicId, noindex, nofollow). A generated-binary PDF is a later enhancement, not MVP. Why: the client-ready artifact is achieved today with print CSS; pdfkit/Playwright adds weight without changing the promise.

7. NO EMAIL SENDING in MVP. Share link is copied by the agency. Scheduled sends come after validation.

8. BILLING: none live. Plan limits enforced locally from a plans table. Payment route recommendation (Lemon Squeezy primary, PayPal for India payouts; Stripe India assumed invite-only) comes from the HandoffKit domain investigation of 2026-10-23 and must be re-verified before launch. Live checkout needs Dev approval.

9. DEMO DATA: seeded demo account (demo@careproof.app style login documented in README) with 6 clearly-labelled demo sites, pre-run checks, and a generated report. Every demo entity carries isDemo or demo-prefixed identifiers; demo data is visually badged in the UI.

10. TENANCY: single-tenant-per-account at MVP (account = agency). Row-level scoping: every query filters by accountId. Share links are the only public surface and expose exactly one report.

11. NOT DEPLOYED, NOT SENT, NOT POSTED. All external actions (deploy, outreach sends, community posts, payments) wait for Dev's explicit approval per standing rules.

12. NEXT.JS CONFIG: cacheComponents disabled (classic caching model) because every DB-backed page is force-dynamic; scaffold default (new cache model) conflicts with route-level dynamic exports. Prisma 7 pinned 7.10.1 (v8 is RC with peer conflicts); better-sqlite3 adapter loads fine on Windows ARM64 (verified 2026-10-24).

13. URL GUARD SCOPE: block localhost/private IPv4/IPv6-literals/.local/.internal/.onion but NOT .example/.test TLDs. Reserved TLDs pose no SSRF risk and blocking them breaks labelled demo data; unresolvable hosts just fail checks honestly.

## 2026-10-24 (deploy session)

14. PUBLIC REPO per Dev's instruction: github.com/devtechedge/careproof, full granular build history (18 stage commits reconstructed pre-push since nothing had been published yet). No license file: source is visible to show progress, no reuse rights granted.

15. DATABASE: dedicated `careproof` + `careproof_test` databases created on the existing Neon Postgres host (us-east-1) via the glm project's pulled connection string; no Neon API key exists on this machine. Isolation = separate databases, not a separate Neon project. Move to a dedicated Neon project before paid launch (same note pattern as HandoffKit).

16. RUNTIME: pooled DATABASE_URL for the app, unpooled for `prisma db push` (DDL is blocked through the pooler). Vercel env targets production only for DATABASE_URL; previews intentionally fail DB access.

17. DEPLOYED (Dev approved): https://careproof-tau.vercel.app (+ careproof-devtechedge1.vercel.app), Vercel project `careproof` team `devtechedge1`, git-linked to main (auto-deploy on push). Production demo workspace seeded.

18. BUILD FIXES discovered by real deploys: `postinstall: prisma generate` (generated client is gitignored, Vercel build needs it) and `process.loadEnvFile()` inside lib/db.ts (import hoisting runs db.ts before scripts can load .env).

## 2026-10-24 (security-hardening session, branch only)

19. OUTBOUND SECURITY: single net-guard module (undici agent with guarded connect-time DNS lookup = pinning; per-hop redirect validation; ports 80/443 only; ipaddr.js range battery incl. cloud metadata, CGNAT, IPv4-mapped IPv6). All checks (homepage, links, robots/sitemap, favicon, RDAP, TLS) route through it. Test-only hooks exist for loopback-origin tests and never bypass literal checks.

20. DEMO READ-ONLY: enforced in the service layer (every mutation), not just UI. Shared demo password can no longer be changed; visitors cannot alter the demo.

21. REPORT FRESHNESS CONTRACT: reports disclose per-site observation timestamps; generation refreshes sites older than 24h bounded by 4 rechecks / 25s; a 7-day staleness banner warns when data is old; drafts regenerate atomically per period (no duplicates); published reports are immutable and revocable (unpublish kills the share link; getReportByPublicId returns published only).

22. HTTPS-REDIRECT SEMANTICS: refused port-80 is "info - not verified", never pass. Only an observed 3xx to https passes.

23. BOUNDED BURSTS: run-all processes 5 sites per invocation (never-checked first, then oldest), staying inside serverless limits.

24. PASSWORD CHANGE rotates sessions (all other sessions deleted).

25. SEED INTERLOCK: seeder refuses a database named "careproof" without ALLOW_PROD_SEED=1.

26. POSITIONING CORRECTION from verified competitor research: white-label reports are NOT rare among WP incumbents (MainWP $29 includes them; WP Umbrella base includes them). Landing copy corrected to lead with mixed-stack technical audit + flat pricing + white-label-included vs the verified upcharges (UptimeRobot $35/mo tier, Databox +$80/mo). Name-collision risk recorded (careproof.ai NDIS, careproof.net healthcare, careproof.com parked/for-sale, possible 2019 USPTO fabric mark UNVERIFIED); rename decision + professional trademark search gated before paid launch.
