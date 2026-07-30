import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { magicLink, organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { getDb } from "@/lib/db";
import { sendEmail } from "@/lib/email";

/** Founder/admin domain. Admin rights never attach to a customer domain. */
export const ADMIN_DOMAIN = "@peer-freight.com";

async function makeAuth() {
  const db = await getDb();
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    // Preview deploys serve from their own vercel.app origin.
    trustedOrigins: process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : [],
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
    },
    databaseHooks: {
      user: {
        create: {
          // Pre-authority posture: invite-only. A founder must seed
          // allowed_emails before an outside signup succeeds.
          before: async (u) => {
            const email = u.email.toLowerCase();
            if (email.endsWith(ADMIN_DOMAIN)) return { data: u };
            const allowed = await db
              .select()
              .from(schema.allowedEmails)
              .where(eq(schema.allowedEmails.email, email))
              .limit(1);
            if (allowed.length === 0) {
              throw new APIError("FORBIDDEN", {
                message:
                  "The portal is invite-only right now. Email team@peer-freight.com and we will set you up.",
              });
            }
            return { data: u };
          },
        },
      },
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          await sendEmail({
            to: email,
            subject: "Your Peer Freight sign-in link",
            text: `Sign in to the Peer Freight portal:\n\n${url}\n\nThis link expires shortly. If you did not request it, ignore this email.`,
          });
        },
      }),
      organization(),
    ],
  });
}

export type Auth = Awaited<ReturnType<typeof makeAuth>>;

const globalForAuth = globalThis as unknown as { __portalAuth?: Promise<Auth> };

export function getAuth(): Promise<Auth> {
  globalForAuth.__portalAuth ??= makeAuth();
  return globalForAuth.__portalAuth;
}

/** Portal admins are verified founder-domain accounts. */
export function isAdmin(user: { email: string; emailVerified: boolean }) {
  return user.emailVerified && user.email.toLowerCase().endsWith(ADMIN_DOMAIN);
}
