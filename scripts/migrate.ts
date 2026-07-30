// Apply db/migrations. Run with `npm run db:migrate` and DATABASE_URL set —
// locally against the dev DB (scripts/dev-db.ts), and against Cloud SQL
// through `cloud-sql-proxy` (founder-run; the deployed app itself never
// migrates). Standalone on purpose: plain Node here, so no "@/" aliases.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PORTAL_DB_POOL_MAX ?? 1),
});
await migrate(drizzle(pool), { migrationsFolder: "./db/migrations" });
console.log("migrations applied");
await pool.end();
