# CareProof

Branded monthly website care reports for web agencies. Add the client sites you manage, run deterministic checks, generate a client-ready branded report with a share link. Any stack (WordPress, Webflow, Shopify, custom), no plugin, no site credentials, no AI.

Separate project from HandoffKit (n8n handover packs). No shared code.

## Status (2026-10-24)

Live: https://careproof-tau.vercel.app (Vercel, git auto-deploy from main). Repo: github.com/devtechedge/careproof (public, full build history). 35 tests passing, lint clean, production build green, production demo workspace seeded. No outreach sent yet. Docs in `docs/`.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind 4
- Prisma 7 with PostgreSQL on Neon (@prisma/adapter-pg); pooled URL at runtime, unpooled for `db push`
- scrypt password hashing, DB-backed sessions (sha256 of cookie token), HttpOnly cookies
- Vitest for unit + service tests

## Setup

```
npm install
cp .env.example .env        # fill in your Neon Postgres URLs
npx prisma generate
npx prisma db push          # use DATABASE_URL_UNPOOLED for DDL
npm run db:seed             # optional: demo workspace
npm run dev                 # http://localhost:3000
```

Environment: see `.env.example`. `DATABASE_URL` is the pooled Neon string the app uses; `DATABASE_URL_UNPOOLED` is for `prisma db push` (DDL is blocked through the pooler). The test suite runs against a separate `careproof_test` database and needs ~30s per heavy test (remote Postgres round trips). Note: with the local `.env` pointing at the production `careproof` database, local dev shares prod data at pilot scale; branch the database before doing experimental work.

Demo login after seeding: `demo@careproof.test` / `demo-password-1` (demo data is labelled in the UI and in the report).

## What the checks do

Uptime/HTTP status, TTFB, HTML weight, TLS certificate expiry (direct TLS read), HTTP-to-HTTPS redirect, security header score (HSTS/CSP/XCTO/XFO/Referrer-Policy), robots.txt, sitemap, favicon, sampled homepage link check (capped at 25 links), domain expiry via public RDAP. Every check has a hard timeout (6-12s). Fail/warn thresholds are in `lib/checks.ts` with unit tests.

## Commands

- `npm run dev` / `npm run build` / `npm run start`
- `npm test` (Vitest; pushes schema to the `careproof_test` database first)
- `npm run lint`
- `npm run db:push`, `npm run db:seed`

## Security notes and known limitations

- Tenant isolation: every query is scoped by `accountId`; cross-account access returns "not found". Covered by `tests/services.test.ts`.
- SSRF guard: blocks localhost, private/loopback/link-local IPv4, IPv6 literals, `.local`, `.internal`, `.onion`, credential URLs. This is a hostname guard, not a full DNS-resolution guard; a determined DNS-rebinding setup is out of MVP scope. Documented, accepted risk at pilot scale.
- Rate limits (DB sliding window): signup 5/IP/day, login 10/email/hour, checks 60/account/hour, reports 15/account/hour.
- Share links: random 28-hex-char id, `noindex, nofollow` meta; anyone with the link sees exactly that report.
- Report "PDF" is the browser's print-to-PDF on a print-styled page (deliberate MVP choice; binary PDF generation is a post-validation enhancement).
- Email sending is not implemented; the agency copies the share link.
- No email verification / password reset yet (add before paid launch).
- Plan limits enforced locally from `lib/plans.ts`; no live billing.

## Deploy (already live)

Vercel project `careproof` (team devtechedge1), git-linked to main: every push to main auto-deploys. Env: `DATABASE_URL` (Neon pooled, production target only), `SESSION_PEPPER`, `NEXT_PUBLIC_SITE_URL=https://careproof-tau.vercel.app`. Schema changes: `DATABASE_URL_UNPOOLED=... npx prisma db push` locally. The generated Prisma client is gitignored and rebuilt by `postinstall`.

## Legal

`/legal/terms`, `/legal/privacy`, `/legal/refunds` are templates marked not-legal-advice; review before any paid launch.
