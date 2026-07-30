/**
 * Activation gates (preparation-versus-activation policy). In-portal quote
 * Accept ships disabled and stays disabled until broker authority is verified
 * active — re-check 10-launch/authority-readiness.md in the PeerFreight repo
 * before flipping this.
 */
export const AUTHORITY_ACTIVE = false;

export const ACCEPT_DISABLED_NOTE =
  "Online acceptance opens once our broker authority is active. To move on this quote now, reply to the quote email or write team@peer-freight.com.";
