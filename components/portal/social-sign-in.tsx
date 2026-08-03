"use client";

import { useEffect, useState } from "react";
import { preconnect } from "react-dom";
import { authClient } from "@/lib/auth-client";
import type { SocialProviderFlags } from "@/lib/auth";
import { Alert } from "@/components/ui/alert";
import { IconSpinner } from "@/components/ui/icons";

/**
 * "Continue with Google/Microsoft" buttons + the "or" divider. Renders
 * nothing until a provider's OAuth env vars exist (the server page passes
 * the flags), so shipping this dark is free and enabling a provider later
 * is only configuration. Brand marks are the official multicolor logos —
 * deliberately outside the stroke-icon system.
 */

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

type Provider = "google" | "microsoft";

const PROVIDER_LABELS: Record<Provider, string> = {
  google: "Google",
  microsoft: "Microsoft",
};

export function SocialSignIn({
  providers,
  callbackURL,
  errorCallbackURL,
}: {
  providers: SocialProviderFlags;
  callbackURL: string;
  errorCallbackURL: string;
}) {
  // The clicked button stays in its "Redirecting…" state through the
  // navigation to the provider — resetting on response would flash the idle
  // label while the browser is already leaving the page.
  const [redirecting, setRedirecting] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Coming Back from the provider can restore this page from the bfcache
  // with the button still stuck on "Redirecting…" — reset it.
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) setRedirecting(null);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  if (!providers.google && !providers.microsoft) return null;

  // Save the TLS handshake on the upcoming OAuth redirect.
  if (providers.google) preconnect("https://accounts.google.com");
  if (providers.microsoft) preconnect("https://login.microsoftonline.com");

  async function start(provider: Provider) {
    setRedirecting(provider);
    setError(null);
    // On success this navigates away to the provider; only an immediate
    // failure (network, misconfig) returns here.
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL,
      errorCallbackURL,
    });
    if (error) {
      setError("Social sign-in is temporarily unavailable. Try again in a moment or use email instead.");
      setRedirecting(null);
    }
  }

  function ProviderButton({ provider, mark }: { provider: Provider; mark: React.ReactNode }) {
    const active = redirecting === provider;
    return (
      <button
        type="button"
        disabled={redirecting !== null}
        aria-busy={active || undefined}
        onClick={() => start(provider)}
        className="flex w-full items-center justify-center gap-2.5 rounded-full border border-line bg-white px-4 py-2.5 text-[0.95rem] font-bold text-ink transition-opacity hover:bg-paper disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        {active ? <IconSpinner size={18} /> : mark}
        {active
          ? `Redirecting to ${PROVIDER_LABELS[provider]}…`
          : `Continue with ${PROVIDER_LABELS[provider]}`}
      </button>
    );
  }

  return (
    <div className="mt-6">
      <div className="space-y-2.5">
        {providers.google ? <ProviderButton provider="google" mark={<GoogleMark />} /> : null}
        {providers.microsoft ? (
          <ProviderButton provider="microsoft" mark={<MicrosoftMark />} />
        ) : null}
      </div>
      <div className="mt-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs font-bold uppercase tracking-wide text-muted">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      {error ? (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}

/**
 * OAuth failures come back on errorCallbackURL as ?error=<message>, where
 * the message is a human sentence with spaces flattened to underscores —
 * not a stable code — so parse defensively: map the one known code-ish
 * value, else stay generic.
 */
export function oauthErrorMessage(raw: string | null): string | null {
  if (!raw) return null;
  const text = raw.replace(/_/g, " ").trim();
  if (text.includes("account not linked")) {
    return "This email already has a Peer Freight login. Sign in with your email and password (or a sign-in link) instead.";
  }
  return "Sign-in with that provider failed. Try again, or use your email instead.";
}
