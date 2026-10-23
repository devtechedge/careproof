import { execSync } from "node:child_process";

export default function setup(): void {
  try {
    process.loadEnvFile();
  } catch {
    // env must come from the environment in CI
  }
  const url = process.env.DATABASE_URL_TEST_UNPOOLED;
  if (!url) {
    throw new Error(
      "DATABASE_URL_TEST_UNPOOLED is required: point it at a dedicated throwaway Postgres database."
    );
  }
  execSync("npx prisma db push", {
    stdio: "pipe",
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url },
  });
}
