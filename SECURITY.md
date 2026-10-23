# Security

Honest threat model for CareProof, last reviewed 2026-10-24. The deeper audit trail with severity ratings, evidence, and per-finding test coverage lives in `docs/SECURITY_AUDIT.md` and `docs/SECURITY_TEST_RESULTS.md`.

## Authentication and sessions

- Email + password with scrypt (per-user salt, server-side pepper). Passwords must be 10+ characters with letters and digits.
- Sessions are random 256-bit tokens; only the SHA-256 hash is stored. Cookies are HttpOnly, SameSite=Lax, Secure in production, 30-day expiry.
- Changing the password deletes every other session for the account.
- Not implemented: email verification and password reset. Until email infrastructure exists, account recovery is manual. Signup replies "an account with this email already exists", an enumeration tradeoff accepted because signup is rate limited to 5 per IP per day.
- Server actions rely on Next.js built-in origin checking for CSRF.

## Tenant isolation

Every database query is scoped by account id. Cross-account reads, writes, publishes, and un-publishes are covered by tests and return "not found" rather than leaking existence.

## Outbound requests (the interesting part)

The product fetches user-supplied URLs, so all egress goes through one guard:

- Destinations must be http/https on ports 80/443, no embedded credentials, no IP literals in the URL, no localhost/internal/onion names.
- DNS is resolved by a guarded lookup that rejects loopback, private, CGNAT, link-local (including cloud metadata), ULA, multicast, reserved, and IPv4-mapped ranges. That lookup is the connection's own lookup, so the validated address is the connected address (no rebinding window).
- Redirects are followed manually with each hop validated before connection, capped at 5.
- Hard timeouts on every request, a 2 MB body cap, and bounded concurrency.
- TLS certificate checks pin the connection to the validated address with correct SNI.
- IPv6 literal destinations are always rejected; IPv6 via DNS hostname is allowed when it resolves to a public address.

Residual: a testing-only hook can allow loopback addresses for integration tests; it never bypasses URL-literal checks.

## Public demo workspace

The demo account credentials are public and the workspace is enforced read-only at the service layer (every mutation rejected), so visitors cannot damage the sample data or lock others out. This is accepted residual risk, tested.

## Share links

Report links use 112 bits of randomness, are marked noindex/nofollow, only expose published reports, and can be revoked by un-publishing. The link is the access control: agencies should not publish links to reports containing information they consider sensitive.

## Payments

No payment processing exists yet. Plan limits are enforced server-side. When checkout goes live it will be Merchant-of-Record based with signed, idempotent webhooks.

## Reporting a vulnerability

Open a private security advisory on this repository, or contact the email on the demo report footer. Please do not test against the production deployment beyond your own accounts.
