// Entry for the agent command layer: `npm run portal -- <command> ...`.
// Runs under tsx (tsconfig "@/" paths). Auth is DB access: DATABASE_URL
// (defaulting to the dev DB) plus a verified founder account named by
// --as or PORTAL_ACTOR. Flag for later: before any production deploy this
// needs a real machine identity, not just DATABASE_URL possession.
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ZodError } from "zod";
import * as schema from "@/db/schema";
import { resolveActor, runCommand, usageText } from "@/lib/portal/cli";
import type { PortalDb } from "@/lib/portal/queries";

const DEV_DB_URL = "postgres://postgres:postgres@127.0.0.1:5433/postgres";

/** Pull `--flag` (boolean) or `--flag value` out of argv before command parsing. */
function pluck(argv: string[], flag: string, takesValue: boolean): string | boolean | null {
  const i = argv.indexOf(flag);
  if (i === -1) return null;
  if (!takesValue) {
    argv.splice(i, 1);
    return true;
  }
  const value = argv[i + 1];
  if (!value) throw new Error(`${flag} needs a value`);
  argv.splice(i, 2);
  return value;
}

async function main() {
  const argv = process.argv.slice(2);
  const asJson = pluck(argv, "--json", false) === true;
  const asEmail = (pluck(argv, "--as", true) as string | null) ?? process.env.PORTAL_ACTOR;

  if (argv.length === 0 || argv[0] === "help" || argv[0] === "--help") {
    console.log(usageText());
    return;
  }
  if (!asEmail) {
    throw new Error("Set the actor: --as founder@peer-freight.com or export PORTAL_ACTOR");
  }

  // Dev DB is a PGlite socket that takes one connection at a time.
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || DEV_DB_URL,
    max: Number(process.env.PORTAL_DB_POOL_MAX ?? 1),
  });
  try {
    const db = drizzle(pool, { schema }) as unknown as PortalDb;
    const admin = await resolveActor(db, asEmail);
    const result = await runCommand(db, admin, argv);
    if (asJson) {
      console.log(JSON.stringify({ ok: true, data: result.json, emails: result.emails }, null, 2));
    } else {
      console.log(result.text);
      for (const email of result.emails) {
        console.log(
          [
            "",
            `--- email sent to ${email.to} ---`,
            `Subject: ${email.subject}`,
            "",
            email.text,
            "--- end email ---",
          ].join("\n"),
        );
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  if (err instanceof ZodError) {
    for (const issue of err.issues) {
      console.error(`error: ${issue.path.join(".") || "input"}: ${issue.message}`);
    }
  } else {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
  }
  process.exit(1);
});
