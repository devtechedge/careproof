# PM memo - what evidence gates the next feature

2026-10-24, branch qa-pass-1. All P0/P1 items from the QA/PM/VC/EM brief are done and verified. Per the brief's own instruction (item 12), feature work stops here. This memo records what evidence must exist before each deferred item is built.

## Standing rule

No customers, no outreach sent, $0 MRR. Willingness to pay is an unvalidated hypothesis. The 15 outreach drafts wait for a human send; that is the highest-leverage action available and it is not mine to take.

## Gates per deferred feature

| Deferred item | Build only when | Evidence needed |
|---|---|---|
| Scheduled recurring checks | >= 3 pilot agencies say manual runs are why they churn or hesitate | Quotes in VALIDATION_LOG with dates |
| Automated email delivery | >= 2 pilots ask for it, or share-link open behavior shows clients never open links | Ask in discovery calls (interview script Q3/Q4) |
| Native PDF generation | A pilot says print-to-PDF fails their workflow (branding limits, multi-page handling) | Concrete failure report, not preference |
| Report diffing vs last month | >= 3 pilots completed a second month (retention signal first, feature second) | Two months of real usage in VALIDATION_LOG |
| API access | An agency asks with a workflow that the UI cannot serve | Named integration target |
| Client portal | Retained pilots with >= 10 sites ask where clients self-serve | Request frequency across >= 2 agencies |

## Leading indicators to watch weekly (from the new funnel)

1. page_view -> signup_completed conversion (landing copy and pricing clarity now honest; if signup rate is near zero with real traffic, the offer or the traffic source is wrong, not the product).
2. signup_completed -> report_generated (if signups never generate a report, onboarding is broken regardless of traffic).
3. demo_logins vs signups (demo interest without account creation means the value proposition lands but the signup step repels; investigate copy then).
4. waitlist signups (pure interest signal, weakest evidence class).

Numbers land in docs/VALIDATION_LOG.md weekly. A compliment is not a sale; a waitlist email is not a commitment; a pilot is not MRR until it renews.

## What I would do next if I were the founder

Send the 15 emails. Everything else in the product is now ahead of the evidence.
