import { execSync } from "node:child_process";

/**
 * Ensures the test database has the current schema and a seeded demo workspace
 * before browser smokes run. Never touches a database named "careproof"
 * (production): the seed script itself refuses that name without an override.
 */
export default async function globalSetup(): Promise<void> {
  const unPooled = process.env.DATABASE_URL_TEST_UNPOOLED;
  if (!unPooled) throw new Error("DATABASE_URL_TEST_UNPOOLED is required for e2e setup.");
  execSync("npx prisma db push", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: unPooled },
  });
  execSync("npx tsx scripts/seed-demo.ts", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST ?? "" },
  });
}
