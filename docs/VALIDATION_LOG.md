# Validation Log

Evidence classes (strict): compliment (weak, counts 0), waitlist signup with intake answers (weak), qualified conversation (they manage 10+ sites on retainers AND compile reports monthly, medium), pilot commitment signed or paid (strong), payment (strongest). Nothing below is fabricated; every future entry names its source and date.

## 7-day validation plan (starts when Dev approves sending/outreach)

Days below assume start day D0 (to be set on approval).

- D0-D1: landing page live (needs deploy approval) + public sample report link. Prospect list built: 30 agencies from public sources (agency directories, sites selling maintenance plans, thewp.world).
- D1-D3: 15 personalized outreach emails sent (templates in docs/outreach/). Dev approves each batch before sending; sending itself is manual by Dev or approved automation.
- D2-D5: 5 discovery conversations booked (script in docs/outreach/INTERVIEW_SCRIPT.md). Offer: 2-month pilot at 50% off, 15 sites, white-label, cancel anytime.
- D3-D6: 1-2 genuinely useful answers in recurring community threads (r/Wordpress "which maintenance tool" type), only from Dev's accounts with his approval of full text.
- D7: evaluate against thresholds.

## Thresholds (set 2026-10-24)

- CONTINUE if: >= 2 paid pilots OR >= 3 pilot commitments (signed LOI or prepaid) among >= 8 qualified conversations.
- KEEP BUILDING (weaker continue) if: >= 5 qualified conversations and >= 1 pilot commitment, plus >= 10 waitlist signups with completed intake question.
- PIVOT if: after 25 qualified outreach attempts, < 2 qualified conversations AND < 5 waitlist intakes. Pivot target: Idea 2 (approval workflow) first, Idea 5 (Shopify store health) second.
- KILL if two consecutive pivot ideas fail their own CONTINUE thresholds.

## Log entries

### 2026-10-24 (build day, no external contact)
- Fact: research complete, idea chosen, MVP built. No prospects contacted (not authorized yet).
- Fact: landing page, sample report, interview script, outreach templates, pilot offer prepared as local artifacts.
- Hypothesis to test: mixed-stack agencies compiling reports manually will pay $19-49/mo for a branded, any-stack, no-plugin report. Untested.
- Funnel baseline: conversations 0, pilots 0, MRR $0.

### 2026-10-24 (end of session 1, build verified)
- Fact: 35/35 Vitest tests pass; eslint clean; `next build` green (all DB routes dynamic); production server smoke test on :3111 passed: /api/health ok+db up, landing shows seeded sample report link, /dashboard 307 to /login (auth guard), /r/<publicId> renders demo-branded report.
- Fact: nothing external sent, posted, deployed, or paid.
- Next gate: Dev approvals (deploy target, outreach batch, name/trademark check) before validation clock starts.
