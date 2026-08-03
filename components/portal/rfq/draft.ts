import type { RfqPrefill } from "./rfq-form";

/**
 * localStorage RFQ draft, the safety net for flows that leave the wizard's
 * DOM (magic-link and OAuth redirects from the guest quote page). Consumed
 * on read: one restore, then gone, so a stale draft can't shadow a fresh
 * form weeks later. 48h TTL matches the invite-link expiry.
 */

const KEY = "peer.rfq-draft.v1";
const TTL_MS = 48 * 60 * 60 * 1000;

export function saveRfqDraft(values: RfqPrefill) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), values }));
  } catch {
    // Storage full or blocked: the draft is best-effort only.
  }
}

/** Read and delete the draft; null when absent, expired, or unreadable. */
export function loadRfqDraft(): RfqPrefill | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    localStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as { savedAt?: number; values?: RfqPrefill };
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > TTL_MS) return null;
    return parsed.values ?? null;
  } catch {
    return null;
  }
}

export function clearRfqDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}
