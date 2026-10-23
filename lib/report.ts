import type { CheckOutcome, CheckStatus } from "./checks";

export function currentPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return period;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export interface CheckSummary {
  pass: number;
  warn: number;
  fail: number;
  info: number;
}

export function summarizeChecks(checks: Array<{ status: CheckStatus }>): CheckSummary {
  const s = { pass: 0, warn: 0, fail: 0, info: 0 };
  for (const c of checks) s[c.status] += 1;
  return s;
}

export type OverallStatus = "pass" | "warn" | "fail";

export function overallFor(
  checks: Array<{ status: CheckStatus }>
): OverallStatus {
  const s = summarizeChecks(checks);
  if (s.fail > 0) return "fail";
  if (s.warn > 0) return "warn";
  return "pass";
}

export function worstOverall(items: Array<{ overall: OverallStatus }>): OverallStatus {
  if (items.some((i) => i.overall === "fail")) return "fail";
  if (items.some((i) => i.overall === "warn")) return "warn";
  return "pass";
}

export function snapshotChecks(checks: CheckOutcome[]): string {
  return JSON.stringify(
    checks.map(({ checkKey, status, value, detail }) => ({
      checkKey,
      status,
      value,
      detail,
    }))
  );
}

export function parseChecksSnapshot(json: string): CheckOutcome[] {
  try {
    const parsed = JSON.parse(json) as CheckOutcome[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
