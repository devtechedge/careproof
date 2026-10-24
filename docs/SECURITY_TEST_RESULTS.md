# Security Test Results

Session 3, 2026-10-24 (initially branch security-hardening, since merged and deployed; counts updated). Full verification run after all fixes: `npm run lint` (clean, 0 errors 0 warnings), `npx tsc --noEmit` (clean), `npx vitest run` (107/107 passing, ~105s against the `careproof_test` Neon database), `npm run build` (green, all DB routes dynamic). Nothing was pushed to main or deployed; production untouched.

## Per-finding results

### A-1 SSRF (HIGH) - FIXED, VERIFIED
- Implementation: `lib/net-guard.ts`; all outbound paths in `lib/checks.ts` now route through it.
- Tests: `tests/net-guard.test.ts`, 66 tests.
  - IP battery: 28 prohibited addresses (loopback /8, RFC1918, CGNAT 100.64/10, link-local incl. 169.254.169.254 metadata, TEST-NETs, benchmarking, multicast, reserved, IPv6 ::, ::1, IPv4-mapped ::ffff:10.x, ULA, link-local, multicast, documentation) and 5 allowed public addresses. Unparseable input fails closed.
  - URL battery: 21 rejections incl. localhost, IP literals, bracketed IPv6, hex/octal/integer IPv4 notations (WHATWG URL normalizes them to dotted form, then rejected), .local/.internal/.onion, dotless names, ftp/file schemes, credential URLs, ports other than 80/443.
  - Prevention proof (integration, local loopback server with request counter): hostname resolving to loopback - fetch rejected, server hit count 0. Split DNS (one public + one private address) - rejected, hit count 0.
  - Redirect proof: origin (test-allowed) 302s to http://169.254.169.254/latest/meta-data/ - GuardError before any second connection, origin hit exactly 1. Redirect loop capped at 5 hops. Slow origin aborted by the total timeout in under 3s with a 600ms budget.
  - Byte cap: `fetchPage` cancels the stream at the 2MB cap against a 6MB response.
  - DNS pinning shape: the guarded lookup IS the undici agent's connect-time lookup (validated address is the connected address), including the Node Happy Eyeballs `all: true` callback shape.
- Residual limitation (documented): the test-only hooks `testAllowResolvedIp` / `testExtraAllowedPorts` exist solely to run a loopback origin server in tests; they never bypass URL-literal checks. IPv6-literal destinations are always rejected (IPv6 via DNS hostname is allowed when it resolves public).

### A-2 Demo mutability (HIGH) - FIXED, VERIFIED
- Implementation: `rejectDemo` guard in every mutating service; UI hides/disables controls; demo banner on dashboard and settings.
- Tests (`tests/security.test.ts`): 8 mutating services rejected for the demo account with the read-only message; non-demo addSite/branding still succeed.

### A-3 Report freshness (MEDIUM) - FIXED, VERIFIED
- Implementation: `ReportItem.observedAt` + `fresh` (schema pushed to `careproof_test` only); `shouldRecheck` policy (24h freshness window, max 4 rechecks, 25s generation deadline); per-item observation labels; 7-day staleness banner; point-in-time disclosure in the report body and footer.
- Tests: `shouldRecheck` policy unit tests; draft-reuse test proves one report row per period with regenerated items and updated note.

### A-4 HTTPS-redirect semantics (MEDIUM) - FIXED, VERIFIED
- `httpsRedirectOutcome` unit tests: connection refused is `info` (not verified), never pass; pass only on observed 3xx to https://; 200-on-http and 3xx-to-http fail.

### A-5 Resource bursts (MEDIUM) - FIXED (bounded), VERIFIED
- `runChecksBatch` caps at 5 sites per invocation, never-checked first then oldest; UI copy says "Run checks (5 at a time)" and reports remaining count. (Batch selection is covered by the service tests; full-network batch runs were not executed against external sites in this session - documented.)

### A-6 Password change sessions (MEDIUM) - FIXED, VERIFIED
- Test: two sessions exist; `changePassword` with `keepSessionId` leaves exactly the current session.

### A-7 Share-link revocation (LOW) - FIXED, VERIFIED
- `getReportByPublicId` returns published reports only; unpublish action + test: published report visible -> unpublished -> share link returns null; published reports reject note edits until unpublished.

### A-8 Signup enumeration (LOW) - ACCEPTED, documented in SECURITY_AUDIT.md (rate-limited tradeoff).
### A-9 Logo URL (LOW) - ACCEPTED, documented (client-side render only, React escaping, no server fetch).
### A-10 Not-implemented features - documented; no false claims in product copy.

## Safety checks performed
- Production database: zero connections this session (all work against `careproof_test`; verified via the `.env` DATABASE_URL_TEST target before running anything destructive).
- Seed script: now refuses to run against a database named `careproof` without `ALLOW_PROD_SEED=1`.
- Git: no secrets staged; `.env` ignored; branch not pushed.
- React-compiler lint rule satisfied by moving `Date.now()` staleness logic out of component files into `lib/report.ts`.

### Update 2026-10-24, trust pass (branch p0-trust-pass, not deployed)
- Suite grew 107 -> 121 tests: scoped client reports (selection, foreign-ID filtering, per-scope drafts, snapshot immutability, portfolio labelling), intended-plan validation, result-semantics precedence, and loopback fixture integration for runSiteChecks (unreachable homepage -> explicit skipped-info rows; malformed pages; stable row order).
- New fixes verified here: x-vercel-forwarded-for preferred for rate limits (Vercel docs 2026-10-24), security headers on all responses, robots/sitemap routes excluding share links, health endpoint detail removed, favicon guard-error containment, guard threading to robots/sitemap/links/RDAP paths.
- 121/121 vitest, lint clean, typecheck clean, production build compiled, 5/5 Playwright smokes. Mobile/print visual review flagged as not yet performed (see ENGINEERING_HANDOFF.md).

### Update 2026-10-24, qa-pass-1 branch (not deployed)
- Suite grew 121 -> 128 vitest tests (demo seed contract incl. 11-row shape and deterministic sample id, funnel events, waitlist upsert) and 5 -> 7 Playwright specs (signup input retention; scoped report lifecycle generate -> review -> publish -> share -> unpublish -> 404 with zero cross-client leakage).
- Accessibility: axe-core before/after on landing (2 viewports), login, public report, dashboard: 10 violations -> 0. Fixes: AA contrast tokens (--faint light #606b7a min 4.60:1, dark #7d8aa2 min 4.94:1 across all surface pairs), amber text to amber-800 on tints, blue-700 text links, focus-visible rings, table scope/captions, main landmarks, report h1, heading order, valid loading-state roles.
- New controls: server-side funnel events (no third parties), rate-limited waitlist, health endpoint version field (no database detail), branded error/global-error boundaries and loading skeletons.
- Unchanged protections re-verified by the suite: net-guard battery, tenant isolation, demo read-only, scoped reports, share-link revocation, session rotation.
