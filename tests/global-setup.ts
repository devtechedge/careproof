import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

export default function setup(): void {
  const tmpDir = path.resolve(process.cwd(), ".tmp");
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });
  execSync("npx prisma db push", {
    stdio: "pipe",
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: "file:./.tmp/test.db" },
  });
}
