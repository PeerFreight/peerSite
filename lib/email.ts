import { Resend } from "resend";

const FROM = "Peer Freight <team@peer-freight.com>";

/**
 * Transactional email through Resend. Without RESEND_API_KEY (local dev,
 * preview before the account exists) it logs instead of sending, so auth
 * flows stay testable — the magic-link URL shows up in the server log.
 */
export async function sendEmail(opts: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email:dev] to=${opts.to} subject=${opts.subject}\n${opts.text}`);
    return;
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({ from: FROM, ...opts });
  if (error) {
    throw new Error(`Resend delivery failed: ${error.message}`);
  }
}
