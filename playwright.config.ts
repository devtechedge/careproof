import { defineConfig } from "@playwright/test";

try {
  process.loadEnvFile();
} catch {
  // env provided by CI
}

const testDb = process.env.DATABASE_URL_TEST ?? "";
const testDbUnpooled = process.env.DATABASE_URL_TEST_UNPOOLED ?? "";
const port = Number(process.env.E2E_PORT ?? 3100);

if (!testDb || !testDbUnpooled) {
  throw new Error("Playwright needs DATABASE_URL_TEST and DATABASE_URL_TEST_UNPOOLED pointing at a dedicated test database.");
}

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  globalSetup: "./tests/e2e/global-setup.ts",
  webServer: {
    command: `npx next dev -p ${port}`,
    url: `http://localhost:${port}`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      DATABASE_URL: testDb,
      SESSION_PEPPER: process.env.SESSION_PEPPER ?? "e2e-pepper",
      NEXT_PUBLIC_SITE_URL: `http://localhost:${port}`,
    },
  },
});
