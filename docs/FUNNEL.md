# Funnel instrumentation

Added 2026-10-24 (branch qa-pass-1). Privacy-honest: no analytics scripts, no cookies for tracking, no third parties. Events are server-side rows in the same database; the waitlist is a plain table.

## What is recorded

`Event` rows (lib/events.ts, fire-and-forget, never blocks a user flow):

| name | where | meaning |
|---|---|---|
| page_view | landing render | visits (includes bots/crawlers; not a unique-visitor metric) |
| signup_completed | createAccount success | real account creations |
| demo_login | authenticate on a demo account | demo workspace usage |
| report_generated | generateReport success | first meaningful product action |
| waitlist_signup | joinWaitlist action | email capture |

`WaitlistSignup` rows: one per email (upsert), source "landing".

## Reading the numbers (SQL, owner-run)

```sql
-- funnel by day, last 14 days
SELECT "createdAt"::date AS day, name, count(*)
FROM "Event" WHERE "createdAt" > now() - interval '14 days'
GROUP BY 1, 2 ORDER BY 1 DESC, 2;

-- landing -> signup conversion (all time)
SELECT
  (SELECT count(*) FROM "Event" WHERE name = 'page_view') AS views,
  (SELECT count(*) FROM "Event" WHERE name = 'signup_completed') AS signups;

-- waitlist size
SELECT count(*) FROM "WaitlistSignup";
```

## Honesty rules

page_view counts renders, not people. Conversion fractions from it are lower bounds on true traffic quality. Events never contain emails, URLs, or report contents; the waitlist table holds only the email the visitor typed.
