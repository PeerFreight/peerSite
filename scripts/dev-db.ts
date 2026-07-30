// Throwaway local Postgres for portal development: PGlite behind a wire-
// protocol socket, so the app's normal pg/drizzle path works with
// DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres
// Run with `node scripts/dev-db.ts`. One client connection at a time —
// set PORTAL_DB_POOL_MAX=1 for dev against this server.
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const db = await PGlite.create("./.devdb");
const server = new PGLiteSocketServer({ db, port: 5433, host: "127.0.0.1" });
await server.start();
console.log("dev postgres (pglite) listening on 127.0.0.1:5433");
