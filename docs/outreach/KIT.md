# Outreach kit v2 (2026-10-24)

Everything here is PREPARED, NEVER SENT without Dev's approval of exact text + recipients. The original cold templates, interview script and pilot offer live in INTERVIEW_SCRIPT.md; this file adds the follow-up, the demo script, the objection sheet, and the tracking log format. Prospects land in docs/prospects/PROSPECT_LIST.md.

## Follow-up template (send 4-6 days after no reply)

Subject: re: the monthly report for [Client A] and the rest

Hi [Name] - brief follow-up on my note about CareProof (branded monthly care reports, any stack). Two things agencies tell us after seeing the sample: (1) the security-header and domain-expiry checks are things their current tool never showed a client, and (2) one link beats an attachment chain. Sample report (90 seconds, no signup): [sample link]. If it is not for you, one line back saying so is genuinely welcome and I will close the loop.

## Demo script (call, ~5 minutes, uses the live sample report)

1. (30s) "You said you manage [N] sites across [stacks]. Walk me through what you send clients today." Listen; do not pitch.
2. (60s) Screen-share the sample report: "Every line is a fact a client can check: uptime and response time, certificate days remaining, redirect verification, header score, sampled broken links, domain expiry from the registry itself."
3. (60s) Point at the observation timestamps: "Each site shows exactly when its checks ran - nothing here pretends a week-old check is current."
4. (60s) Show the dashboard: add-site form, run checks (5 at a time), generate report, publish, share link. "Your logo, your colour, from the cheapest plan."
5. (60s) The honest gaps, said out loud: "We do not update plugins or run backups - we are the proof layer over whatever maintenance stack you use. Print-to-PDF, not an emailed PDF yet. No 1-minute alerting; this is the monthly document, not a pager."
6. (30s) Pilot offer (see INTERVIEW_SCRIPT.md) + "who else should I talk to?"

## Objection tracking sheet (fill per conversation, feeds EXPERIMENTS.md)

| Date | Agency | Objection | Category (price / trust / incumbent lock-in / feature gap / timing / not-the-decision-maker) | Our answer given | Outcome |
|---|---|---|---|---|---|

Known likely objections + prepared honest answers:
- "ManageWP already sends my reports." -> "For WordPress-only portfolios that works. What do you do for the Webflow/Shopify/custom sites? CareProof covers those in the same document."
- "Per-site cost is fine, I bill clients per site anyway." -> "Then the flat price is pure margin at 30+ sites; and you get the header/TLS/domain-expiry checks ManageWP does not show."
- "Who else uses it?" -> "Early adopter phase; that is why the pilot is half price with a double-month refund if it saves you nothing."
- "Can it email my clients automatically?" -> "Not yet. Today: share link plus print-to-PDF. Automated sending is on the roadmap gated on pilot demand."

## Tracking log (append per prospect; source of truth for VALIDATION_LOG weekly rollups)

| # | Agency | Sent | Opened/Replied | Call date | Qualified? (10+ sites, monthly manual reporting) | Pilot commitment | Paid | Notes |
|---|---|---|---|---|---|---|---|---|

Evidence classes (strict): compliment = 0; waitlist intake = weak; qualified conversation = medium; signed/prepaid pilot = strong; payment = strongest. "Verbal interest" is never counted as a commitment.
