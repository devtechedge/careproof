import path from "node:path";
import { defineConfig } from "vitest/config";

try {
  process.loadEnvFile();
} catch {
  // env must come from the environment in CI
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // tests hit a remote Postgres; sequential round trips need headroom
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL_TEST ?? "",
      SESSION_PEPPER: process.env.SESSION_PEPPER ?? "test-pepper",
    },
    globalSetup: ["tests/global-setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
