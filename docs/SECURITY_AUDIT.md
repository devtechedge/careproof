# Security Audit

Audited: 2026-10-24, session 3, branch `security-hardening` (created from main a851b6a). Method: full read of every server-side code path (auth, server actions, services, checks engine, report generation, demo seed, rate limits, schema) against the live threat model of an authenticated multi-tenant SaaS that fetches user-supplied URLs. Baseline before changes: lint clean, `tsc --noEmit` clean, 35/35 tests passing against the `careproof_test` database (verified 2026-10-24, this session, not copied from earlier notes).

Severity scale: HIGH = exploitable by a regular authenticated user or crafted input with meaningful impact. MEDIUM = integrity/accuracy or resource risk. LOW = hardening gap with limited exposure. INFO = documented limitation, no fix scheduled this session.

## A-1 HIGH - SSRF: hostname guard only, no DNS/redirect/connection-level validation

Evidence (pre-fix code):
- `lib/validation.ts` `normalizeSiteUrl` blocks only obvious hostnames: localhost, `.local/.internal/.onion`, IPv6 literals, and IPv4 literals matching a private-range regex. A hostname that resolves (via DNS) to a private/internal IP passes validation.
- `lib/checks.ts` `fetchWithTimeout` used Node's global fetch with `redirect: "follow"`: every hop of every redirect is followed without re-validating the destination. A public page can 302 to `http://169.254.169.254/` or `http://localhost:PORT/` and the server follows it.
- Discovered URLs fetched without any validation: homepage links (`extractLinks` results fetched directly), the sitemap URL parsed out of robots.txt, `/favicon.ico`, and the RDAP redirect chain (`rdap.org` redirects to the registry server, followed unvalidated).
- `getTlsExpiry` connects with `tls.connect({ host: hostname })`: DNS is resolved again at connection time, so a hostname that validated publicly can connect privately (classic DNS-rebinding TOCTOU).
- Impact: blind SSRF (status/timing oracle) plus content harvesting: the `links` check parses the final page's HTML and lists its URLs in check details, so an internal page reached via redirect leaks internal hostnames/paths into a report the attacker can read. Cloud metadata and internal service endpoints are reachable from serverless egress.
- Affected files: `lib/validation.ts`, `lib/checks.ts` (all network paths), indirectly every check.

Remediation (implemented this session): centralized `lib/net-guard.ts` - URL canonicalization + protocol/credential/port allowlist; DNS resolution through a guarded lookup that rejects if ANY resolved address is prohibited (loopback, private, CGNAT, link-local incl. cloud metadata, ULA, multicast, reserved, IPv4-mapped IPv6, etc. via ipaddr.js); the guarded lookup is the lookup used BY the actual outbound connection (undici Agent `connect.lookup`), so the validated address is the address connected to (pinning, no re-resolution gap); all redirects handled manually with per-hop validation and a 5-hop cap; TLS checks connect to the validated IP with correct `servername`; hard connect/body/total timeouts, byte caps, and bounded concurrency; RDAP, links, sitemap, favicon all routed through the guard. Fail closed with customer-facing errors. Verification: `tests/net-guard.test.ts` (IP battery incl. metadata + IPv4-mapped + alternative notations, URL rejections, pinned-lookup rebinding simulation, local-server integration proving prohibited connections never arrive, redirect-to-blocked, body cap, timeout).

Status: FIXED on branch, verified by tests. See SECURITY_TEST_RESULTS.md.

## A-2 HIGH - Shared demo account is fully mutable

Evidence: `lib/services.ts` had no `isDemo` handling; `scripts/seed-demo.ts` documents a shared login published on `/login`. Any visitor could delete demo sites, alter branding, run floods of checks, change the shared password (locking out everyone), and generate/publish unlimited reports.
Remediation: server-side read-only policy for demo accounts enforced in the service layer (every mutating service rejects demo accounts); UI hides/disables mutation controls and shows a read-only banner; add tests (demo mutation rejected, non-demo workflows unaffected). Password change also rejected for demo.
Status: FIXED on branch, tested.

## A-3 MEDIUM - Report freshness: stale observations presented as current

Evidence: `generateReport` used each site's latest CheckRun regardless of age; `ReportItem` stored no observation timestamp; the client-facing report implied current health.
Remediation: `ReportItem.observedAt` added (schema change, pushed to `careproof_test` only); generation refreshes sites with no run or runs older than 24h (bounded: max 4 rechecks, 25s deadline, sequential) and records per-item observation time; per-site "Observed <date>" + age shown; portfolio staleness banner when any observation is older than 7 days; footer strengthened: checks are point-in-time public observations, not verification of backups/updates/remediation. Draft reports for the same period are regenerated transactionally (no duplicates, no half-created reports); published reports remain immutable snapshots.
Status: FIXED on branch, tested (freshness policy unit tests + draft-reuse transaction test).

## A-4 MEDIUM - HTTPS-redirect check overstates conclusions

Evidence: port-80 connection refusal was reported as `pass` with value "No HTTP endpoint / site is HTTPS-only" - an unreachable HTTP endpoint does not prove a redirect exists.
Remediation: refused/errored HTTP endpoint now reports `info` "HTTP endpoint unreachable - redirect not verified". Pass requires an observed 3xx to an https:// destination.
Status: FIXED on branch, tested.

## A-5 MEDIUM - Resource exhaustion: unbounded portfolio check bursts

Evidence: `runAllChecksForm` looped every site in one request (150-site agency = ~1500 outbound requests in a single serverless invocation; Vercel Hobby 60s ceiling would kill it mid-run with no partial feedback); per-account CheckRun storage unbounded.
Remediation: run-all now processes at most 5 sites per invocation, oldest-observation first, and reports how many remain (progressive "Run again" batches); rate limit unchanged (60 check-runs/hour/account). Documented as a bounded-batch policy until scheduled checks exist.
Status: FIXED on branch, tested (batch cap).

## A-6 MEDIUM - Password change leaves other sessions alive

Evidence: `changePassword` updated the hash only; existing session rows (other browsers/devices, or a stolen token) stayed valid for up to 30 days.
Remediation: password change now deletes every session except the current one. Test added.
Status: FIXED on branch, tested.

## A-7 LOW - Share links cannot be revoked

Evidence: publishing is one-way; an agency that shares a link can never invalidate it.
Remediation: reports can be unpublished (back to draft; `/r/<id>` returns 404). Demo-blocked like all mutations.
Status: FIXED on branch.

## A-8 LOW - Signup account enumeration

Evidence: signup returns "An account with this email already exists." Allows probing registered emails; mitigated by the 5/IP/day signup rate limit and by login returning a generic error. Hiding the message breaks legitimate signup UX; retained as a documented tradeoff (common practice).
Status: ACCEPTED, documented.

## A-9 LOW - Logo URL handling

Evidence: branding logo is validated (https/http + image extension) and rendered as a client-side `<img>`; the server never fetches it (no SSRF path). React escaping prevents markup injection. Mixed-content note: http logos are blocked by browsers on https pages; acceptable.
Status: ACCEPTED, documented.

## A-10 INFO - Not implemented, documented elsewhere

Email verification and password reset (needs email infrastructure + approval), native PDF, scheduled checks, email sending. No in-product text claims these exist. CSRF for server actions is provided by the Next.js framework (origin checking on action POSTs). Legal pages are templates flagged not-legal-advice.

## Database safety during this audit

All schema changes pushed only to the `careproof_test` database. The production `careproof` database was not touched (no `db push`, no seed, no mutations) - the fixes ship on the branch and reach production only with deploy approval, at which point `DATABASE_URL_UNPOOLED=... npx prisma db push` is the documented step.
