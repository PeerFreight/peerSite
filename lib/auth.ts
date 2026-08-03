import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { magicLink, organization } from "better-auth/plugins";
import * as schema from "@/db/schema";
import { getDb } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { ADMIN_DOMAIN } from "@/lib/portal/roles";
import { baseUrl } from "@/lib/portal/urls";

export { ADMIN_DOMAIN, isAdmin } from "@/lib/portal/roles";

/**
 * Social sign-in is env-gated: a provider exists only when its OAuth
 * credentials are configured, so enabling Google/Microsoft later is just
 * setting env vars (redirect URI: ${BETTER_AUTH_URL}/api/auth/callback/<id>).
 * Pages read these flags server-side to decide which buttons to render.
 */
export function enabledSocialProviders() {
  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    microsoft: Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
  };
}

export type SocialProviderFlags = ReturnType<typeof enabledSocialProviders>;

function vercelTrustedOrigins() {
  return [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]
    .filter((host): host is string => Boolean(host))
    .map((host) => new URL(host.startsWith("http") ? host : `https://${host}`).origin);
}

async function makeAuth() {
  const db = await getDb();
  const social = enabledSocialProviders();
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    // Preview requests commonly use the stable branch alias, while VERCEL_URL
    // names the unique deployment. Trust only Vercel's exact system URLs.
    trustedOrigins: vercelTrustedOrigins(),
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      ...(social.google
        ? {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID!,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            },
          }
        : {}),
      ...(social.microsoft
        ? {
            microsoft: {
              clientId: process.env.MICROSOFT_CLIENT_ID!,
              clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
              tenantId: process.env.MICROSOFT_TENANT_ID ?? "common",
            },
          }
        : {}),
    },
    account: {
      accountLinking: {
        // Microsoft often omits email_verified in its profile; without
        // trusting these providers an existing email-password user gets
        // account_not_linked instead of signing in to the same account.
        trustedProviders: ["google", "microsoft"],
      },
    },
    // Serves double duty: signup verification (magic-link/social users are
    // verified by their flow already) and the change-email flow — without a
    // top-level sendVerificationEmail, /change-email 400s. Deliberately no
    // sendOnSignUp and no sendChangeEmailConfirmation: the change-email
    // verification link must go to the NEW address in one step.
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Verify your email for Peer Freight",
          text: `Confirm this email address for your Peer Freight portal account:\n\n${url}\n\nIf you did not request this, ignore this email.`,
        });
      },
    },
    user: {
      changeEmail: {
        enabled: true,
      },
    },
    databaseHooks: {
      user: {
        update: {
          // Admin = verified + @peer-freight.com (lib/portal/roles.ts), and
          // the change-email verify step lands here with emailVerified: true.
          // Without this hook a shipper could change their email onto the
          // founder domain and self-promote to admin.
          before: async (u) => {
            if (
              typeof u.email === "string" &&
              u.email.toLowerCase().endsWith(ADMIN_DOMAIN)
            ) {
              throw new APIError("FORBIDDEN", {
                message: "That email domain is reserved.",
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
      organization({
        sendInvitationEmail: async ({ id, email, organization: org, inviter }) => {
          await sendEmail({
            to: email,
            subject: `${inviter.user.name} invited you to ${org.name} on Peer Freight`,
            text: `${inviter.user.name} (${inviter.user.email}) invited you to join ${org.name} on the Peer Freight shipper portal.\n\nAccept the invitation:\n\n${baseUrl()}/invite/${id}\n\nThis invitation expires in 48 hours. If you were not expecting it, ignore this email.`,
          });
        },
      }),
      // Must stay last: without it, auth.api.* calls from server actions
      // drop their Set-Cookie headers (change-password would silently sign
      // the user out).
      nextCookies(),
    ],
  });
}

export type Auth = Awaited<ReturnType<typeof makeAuth>>;

const globalForAuth = globalThis as unknown as { __portalAuth?: Promise<Auth> };

export function getAuth(): Promise<Auth> {
  globalForAuth.__portalAuth ??= makeAuth();
  return globalForAuth.__portalAuth;
}
