# CareProof - Project Brief

Updated: 2026-10-24.

## One line

Branded monthly website care reports for web agencies, any stack, no plugin. Agencies prove retainer work to clients in minutes instead of a day of screenshotting.

## Why this exists

Agencies charge $50-300/site/month care retainers and must justify them monthly. Incumbent reporting is WordPress-only (ManageWP $1/site with watermarked free tier, MainWP self-hosted) or uptime-only (Pulsetic, no report). Mixed-stack agencies (WordPress + Webflow + Shopify + custom) compile reports manually. Evidence and pricing in docs/IDEA_SCORECARD.md (researched 2026-10-24).

## Separation from HandoffKit

CareProof is an independent product. HandoffKit (n8n workflow handover packs, private repo devtechedge/handoffkit at Documents/GitHub/handoffkit, live at handoffkit-seven.vercel.app) is never modified, extended, referenced in code, or deployed from this repo. Different buyer (web agencies vs n8n automation agencies), different job (retainer proof vs project handover), different codebase. Shared conventions only where they are generic house style (scrypt auth pattern, docs structure).

## ICP

Solo freelancers and 2-15 person web agencies, English-speaking markets, 10-80 client sites on monthly care retainers, mixed stacks.

## Core promise

Add a site URL. We run deterministic checks (uptime, SSL, domain expiry, HTTPS redirect, security headers, performance, robots/sitemap, broken links). Generate a branded, client-ready monthly report with a share link. No plugin, no AI, works on any stack.

## Pricing (targets, not forecasts)

- Starter $19/mo: 15 sites, branded reports, share links.
- Studio $49/mo: 50 sites, client portal, scheduled monthly regeneration.
- Agency $99/mo: 150 sites, team seats, API.
- Annual = 10x monthly.

$2k MRR path: 25 Studio + 15 Starter + 8 Agency = $2,302 MRR.

## Non-goals (MVP)

- No WordPress plugin, no updates/backups execution (we are the proof layer over their existing maintenance stack).
- No email sending (report is a share link + PDF-ready print view; agency sends it).
- No AI anywhere in the product.
- No live billing until payment eligibility is verified and Dev approves.
- No deploy without Dev's approval.

## Status

Deployed (careproof-tau.vercel.app) since 2026-10-24 morning; security-hardening branch (2026-10-24, session 3) adds the outbound network guard, read-only demo, report freshness contract, session rotation and copy corrections - 107 tests green, NOT merged (approval-gated). Validation assets complete (kit: INTERVIEW_SCRIPT.md + KIT.md + prospects list); zero outreach sent. See docs/SECURITY_AUDIT.md, docs/SECURITY_TEST_RESULTS.md, docs/COMPETITIVE_POSITIONING.md, docs/VALIDATION_LOG.md, docs/NEXT_ACTIONS.md.
