# Check semantics

Documented 2026-10-24, branch p0-trust-pass. Enforced in lib/report.ts (overallFor, summarizeChecks) and lib/checks.ts; tested in tests/checks.test.ts, tests/scoped-reports.test.ts and tests/checks-integration.test.ts.

## Result statuses

- pass: the check ran and the observation met the documented threshold.
- warn: the check ran and the observation needs attention (degraded, or nearing a limit).
- fail: a verified problem, or the site itself was unreachable.
- info: the check could not produce evidence. Includes: skipped because the homepage was unreachable, evidence source unavailable (registry did not answer, certificate unreadable), or not applicable (no links found).

An info row is never displayed as success. A result set with zero passes is overall `info` ("Not assessable"), never pass. Overall precedence: fail > warn > (pass if at least one pass, else info).

## Skipped dependencies

When the homepage cannot be fetched, all page-dependent checks (response speed, page weight, security headers, robots.txt, sitemap, favicon, homepage links) emit an explicit info row "Not assessed - Skipped: the homepage could not be fetched". All eleven rows are always present per site, so a missing row can never look like a green result. Independent checks (TLS certificate, HTTPS redirect, domain expiry) still attempt to run.

## Thresholds

- TLS expiry: fail under 7 days, warn under 30.
- Domain expiry (RDAP): fail under 14 days, warn under 45; unavailable registry = info.
- Response speed (TTFB): pass under 800 ms, warn under 2000 ms.
- Page weight (HTML): pass to 300 KB, warn to 800 KB.
- Security headers: score of 5 standard headers; 4-5 pass, 2-3 warn, 0-1 fail. This is a limited observation of response headers, not a security assessment.
- Sampled homepage links: pass with 0 broken of up to 25 sampled; warn 1-3 broken; fail 4+.
- HTTPS redirect: pass only on an observed 3xx to an https:// destination; refused port 80 is info "not verified"; anything else fails.

## Summary reconciliation

Displayed totals always include info counts ("X pass, Y warn, Z fail, N not assessed") and sum to the number of displayed rows. Portfolio status uses the same precedence rule.

## Known limits (also shown in report footers)

Checks are point-in-time public observations. They do not measure continuous availability, verify backups or CMS updates, or assess remediation work; the agency note is the agency's own claim.
