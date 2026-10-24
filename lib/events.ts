import { prisma } from "./db";

export const EVENT_NAMES = [
  "page_view",
  "signup_completed",
  "demo_login",
  "report_generated",
  "waitlist_signup",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

/**
 * Fire-and-forget funnel event. Never throws into the caller: analytics must
 * not be able to break a user flow.
 */
export function logEvent(name: EventName, accountId?: string): void {
  prisma.event
    .create({ data: { name, accountId: accountId ?? null } })
    .catch(() => undefined);
}
