import { Connector, IpAddressTypes, type AuthClient } from "@google-cloud/cloud-sql-connector";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { ExternalAccountClient } from "google-auth-library";
import { Pool } from "pg";
import * as schema from "@/db/schema";

export type Db = NodePgDatabase<typeof schema>;

/**
 * Database access. Two paths:
 * - Deployed on Vercel: Cloud SQL Node connector authorized through Workload
 *   Identity Federation with Vercel's OIDC token (no service-account keys).
 *   Requires PORTAL_SQL_CONNECTION_NAME, PORTAL_GCP_WIF_AUDIENCE,
 *   PORTAL_GCP_SERVICE_ACCOUNT, PORTAL_DB_USER/NAME/PASSWORD.
 * - Local dev / fallback: plain DATABASE_URL.
 */
async function makePool(): Promise<Pool> {
  const connectionName = process.env.PORTAL_SQL_CONNECTION_NAME;
  if (connectionName) {
    const authClient = ExternalAccountClient.fromJSON({
      type: "external_account",
      audience: process.env.PORTAL_GCP_WIF_AUDIENCE!,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      token_url: "https://sts.googleapis.com/v1/token",
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${process.env.PORTAL_GCP_SERVICE_ACCOUNT}:generateAccessToken`,
      subject_token_supplier: {
        // Vercel injects the deployment's OIDC token into the runtime env.
        getSubjectToken: async () => {
          const token = process.env.VERCEL_OIDC_TOKEN;
          if (!token) throw new Error("VERCEL_OIDC_TOKEN is not available");
          return token;
        },
      },
    })!;
    const connector = new Connector({
      // The connector bundles its own google-auth-library, so the instance
      // types are structurally identical but nominally distinct.
      auth: authClient as unknown as AuthClient,
    });
    const clientOpts = await connector.getOptions({
      instanceConnectionName: connectionName,
      ipType: IpAddressTypes.PUBLIC,
    });
    return new Pool({
      ...clientOpts,
      user: process.env.PORTAL_DB_USER,
      password: process.env.PORTAL_DB_PASSWORD,
      database: process.env.PORTAL_DB_NAME,
      max: Number(process.env.PORTAL_DB_POOL_MAX ?? 5),
    });
  }
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.PORTAL_DB_POOL_MAX ?? 5),
  });
}

// Cached across hot reloads and route modules; the pool itself connects
// lazily on first query, so importing this module never opens a connection.
const globalForDb = globalThis as unknown as { __portalDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.__portalDb ??= makePool().then((pool) => drizzle(pool, { schema }));
  return globalForDb.__portalDb;
}
