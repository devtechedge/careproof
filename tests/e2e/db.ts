import { Client } from "pg";
import { randomBytes } from "node:crypto";

try {
  process.loadEnvFile();
} catch {
  // env provided by CI
}

/**
 * Seed helper for browser tests. Uses raw pg against the TEST database only
 * (never DATABASE_URL, which points at production in local .env files).
 */
export function testDbUrl(): string {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST is required for e2e seeding");
  return url;
}

export async function seedCheckRun(accountId: string, siteId: string): Promise<void> {
  const client = new Client({ connectionString: testDbUrl() });
  await client.connect();
  try {
    const runId = "cr" + randomBytes(12).toString("hex");
    await client.query(
      `INSERT INTO "CheckRun" ("id", "siteId", "accountId", "startedAt", "finishedAt", "status", "trigger")
       VALUES ($1, $2, $3, NOW(), NOW(), 'ok', 'seed')`,
      [runId, siteId, accountId]
    );
    const rows: Array<[string, string, string]> = [
      ["uptime", "pass", "HTTP 200"],
      ["ssl", "pass", "Valid, 200 days left"],
      ["domain", "pass", "500 days until expiry"],
      ["ttfb", "pass", "300 ms"],
      ["weight", "pass", "90 KB"],
      ["httpsRedirect", "pass", "Redirects to HTTPS"],
      ["headers", "pass", "5/5"],
      ["robots", "pass", "Found"],
      ["sitemap", "pass", "Found"],
      ["favicon", "pass", "Configured"],
      ["links", "pass", "10 links OK"],
    ];
    let i = 0;
    for (const [checkKey, status, value] of rows) {
      await client.query(
        `INSERT INTO "CheckResult" ("id", "runId", "checkKey", "status", "value", "detail")
         VALUES ($1, $2, $3, $4, $5, '')`,
        ["cre" + randomBytes(12).toString("hex") + i++, runId, checkKey, status, value]
      );
    }
  } finally {
    await client.end();
  }
}

export async function clearTestRateLimits(): Promise<void> {
  // e2e signs up repeatedly from one IP ("local"): keep those buckets clean in
  // the TEST database only, so limits remain meaningful in production.
  const client = new Client({ connectionString: testDbUrl() });
  await client.connect();
  try {
    await client.query(
      `DELETE FROM "RateLimit" WHERE "bucket" LIKE 'signup:%' OR "bucket" LIKE 'login:%' OR "bucket" LIKE 'waitlist:%'`
    );
  } finally {
    await client.end();
  }
}

export async function getAccountSites(accountId: string): Promise<Array<{ id: string }>> {
  const client = new Client({ connectionString: testDbUrl() });
  await client.connect();
  try {
    const r = await client.query<{ id: string }>(
      `SELECT "id" FROM "Site" WHERE "accountId" = $1 ORDER BY "createdAt" ASC`,
      [accountId]
    );
    return r.rows;
  } finally {
    await client.end();
  }
}

export async function getAccountIdByEmail(email: string): Promise<string | null> {
  const client = new Client({ connectionString: testDbUrl() });
  await client.connect();
  try {
    const r = await client.query<{ id: string }>(`SELECT "id" FROM "Account" WHERE "email" = $1`, [email]);
    return r.rows[0]?.id ?? null;
  } finally {
    await client.end();
  }
}
