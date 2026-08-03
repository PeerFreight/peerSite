"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { composeGuestWelcome, composeRfqTeamAlert, deliver } from "@/lib/portal/notify";
import { guestAccountFromFormData, guestAccountSchema } from "@/lib/portal/guest-account";
import {
  createOrganizationWithOwner,
  createQuoteRequest,
  listUserOrganizations,
} from "@/lib/portal/queries";
import { rfqFromFormData, rfqSchema, type RfqFormState } from "@/lib/portal/rfq";

/**
 * The public quote funnel's single submit: create (or sign in to) the
 * account, resolve the company, file the quote request, and land on its
 * detail page signed in. The nextCookies plugin in lib/auth.ts is what lets
 * signUpEmail/signInEmail set the session cookie from inside this action.
 */
export async function submitGuestRfq(
  _prev: RfqFormState,
  formData: FormData,
): Promise<RfqFormState> {
  // Honeypot: this unauthenticated write path needs a bot filter. Humans
  // never see the field; pretend success so bots stop probing.
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot !== "") return null;

  const rfqParsed = rfqSchema.safeParse(rfqFromFormData(formData));
  const accountParsed = guestAccountSchema.safeParse(guestAccountFromFormData(formData));
  if (!rfqParsed.success || !accountParsed.success) {
    return {
      fieldErrors: {
        ...(rfqParsed.success ? {} : z.flattenError(rfqParsed.error).fieldErrors),
        ...(accountParsed.success ? {} : z.flattenError(accountParsed.error).fieldErrors),
      },
      formError: "Fix the highlighted fields and resubmit.",
    };
  }
  const account = accountParsed.data;

  const auth = await getAuth();
  let user: { id: string; name: string; email: string };
  if (account.accountMode === "create") {
    try {
      const res = await auth.api.signUpEmail({
        body: {
          name: account.accountName,
          email: account.accountEmail,
          password: account.accountPassword,
        },
      });
      user = res.user;
    } catch (err) {
      // Better Auth throws APIError, but instanceof is unreliable across
      // its internal module copies — read the shape instead.
      const e = err as { message?: string; body?: { code?: string; message?: string } };
      const detail = [e?.body?.code, e?.body?.message, e?.message]
        .filter((v): v is string => typeof v === "string")
        .join(" ");
      if (/exist/i.test(detail)) {
        // Known email: flip the account step to sign-in with the DOM intact.
        return {
          fieldErrors: {},
          formError:
            "That email already has a Peer Freight account. Enter its password to sign in and submit.",
          accountExists: true,
        };
      }
      console.error("guest signup failed", err);
      return {
        fieldErrors: {},
        formError: e?.body?.message ?? "Could not create the account. Try again.",
      };
    }
  } else {
    try {
      const res = await auth.api.signInEmail({
        body: { email: account.accountEmail, password: account.accountPassword },
      });
      user = res.user;
    } catch {
      return {
        fieldErrors: {
          accountPassword: ["That email and password don't match."],
        },
        formError:
          "That email and password don't match. Check them, or use the one-time sign-in link.",
      };
    }
  }

  const db = await getDb();
  const orgs = await listUserOrganizations(db, user.id);
  const org =
    orgs[0] ??
    (await createOrganizationWithOwner(
      db,
      user.id,
      ("accountCompany" in account && account.accountCompany) || user.name,
    ));

  const requestId = await createQuoteRequest(db, user.id, org.id, rfqParsed.data);

  // Notifications are fire-and-forget: a send failure must not lose the
  // account or the submission.
  try {
    await deliver(
      composeRfqTeamAlert({
        orgName: org.name,
        requesterName: user.name,
        requesterEmail: user.email,
        requestId,
        rfq: rfqParsed.data,
        note:
          account.accountMode === "create"
            ? "New account created through the public quote page."
            : "Submitted through the public quote page.",
      }),
    );
  } catch (err) {
    console.error("guest rfq team alert failed", err);
  }
  if (account.accountMode === "create") {
    try {
      await deliver(composeGuestWelcome({ to: user.email, name: user.name, requestId }));
    } catch (err) {
      console.error("guest welcome email failed", err);
    }
  }

  redirect(`/quotes/${requestId}`);
}
