import path from "node:path";
import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile();
} catch {
  // no .env file (CI); DATABASE_URL must come from the environment
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
});
