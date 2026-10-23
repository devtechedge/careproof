/**
 * CI-only: creates or drops a per-run test database so concurrent CI runs
 * never share fixtures. Derives pooled/unpooled URLs from template URLs.
 *
 *   node scripts/ci-db.mjs create  -> writes pooled/unpooled to GITHUB_OUTPUT
 *   node scripts/ci-db.mjs drop    -> best-effort cleanup
 *
 * Environment: DB_TEMPLATE_POOLED, DB_TEMPLATE_UNPOOLED, RUN_TAG.
 */
import { Client } from "pg";

const mode = process.argv[2];
const pooled = process.env.DB_TEMPLATE_POOLED;
const unpooled = process.env.DB_TEMPLATE_UNPOOLED;
const tag = (process.env.RUN_TAG ?? "local").replace(/[^a-z0-9_-]/gi, "").slice(0, 40);

if (!pooled || !unpooled) {
  console.error("DB_TEMPLATE_POOLED and DB_TEMPLATE_UNPOOLED are required");
  process.exit(1);
}

const dbName = `careproof_ci_${tag}`;
const swap = (url) => url.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`);

const admin = new Client({ connectionString: unpooled });
await admin.connect();
try {
  if (mode === "create") {
    const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (exists.rowCount === 0) {
      await admin.query(`CREATE DATABASE ${dbName}`);
    }
    const outPooled = swap(pooled);
    const outUnpooled = swap(unpooled);
    const ghOut = process.env.GITHUB_OUTPUT;
    if (ghOut) {
      // mask the password portion in logs, then emit outputs
      const pw = (pooled.match(/:\/\/[^:]+:([^@]+)@/) ?? [])[1] ?? "";
      if (pw) console.log(`::add-mask::${pw}`);
      const fs = await import("node:fs");
      fs.appendFileSync(ghOut, `pooled=${outPooled}\nunpooled=${outUnpooled}\n`);
    } else {
      console.log(`created ${dbName}`);
    }
  } else if (mode === "drop") {
    await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
    console.log(`dropped ${dbName}`);
  } else {
    console.error("usage: ci-db.mjs create|drop");
    process.exit(1);
  }
} finally {
  await admin.end();
}
