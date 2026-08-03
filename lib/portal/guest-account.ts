import { z } from "zod";
import { ADMIN_DOMAIN } from "@/lib/portal/roles";

/**
 * The account step of the public guest quote page. Two modes: create (new
 * shipper, the default) and signin (they already have a portal login). The
 * founder domain is rejected outright — the auth layer's domain hook only
 * guards email *updates*, and admin accounts must never grow orgs through
 * the guest funnel.
 */

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid work email"))
  .refine((v) => !v.endsWith(ADMIN_DOMAIN), "That email domain is reserved.");

export const guestAccountSchema = z.discriminatedUnion("accountMode", [
  z.object({
    accountMode: z.literal("create"),
    accountName: z.string().trim().min(1, "Required").max(120),
    accountEmail: email,
    accountCompany: z.string().trim().min(1, "Required").max(120),
    accountPassword: z.string().min(8, "At least 8 characters").max(128),
  }),
  z.object({
    accountMode: z.literal("signin"),
    accountEmail: email,
    accountPassword: z.string().min(1, "Required").max(128),
    /** Hidden in sign-in mode but kept in the DOM; used as the org name if
     * this account has no company profile yet. */
    accountCompany: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((v) => v || null),
  }),
]);

export type GuestAccountInput = z.infer<typeof guestAccountSchema>;

/** Mirror of rfqFromFormData for the account step's fields. */
export function guestAccountFromFormData(fd: FormData): unknown {
  const text = (name: string) => {
    const v = fd.get(name);
    return typeof v === "string" ? v : "";
  };
  return {
    accountMode: text("accountMode"),
    accountName: text("accountName"),
    accountEmail: text("accountEmail"),
    accountCompany: text("accountCompany"),
    accountPassword: text("accountPassword"),
  };
}
