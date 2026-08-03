"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { saveRfqDraft } from "@/components/portal/rfq/draft";
import { DraftAwareRfqForm } from "@/components/portal/rfq/draft-aware-rfq-form";
import type { FieldErrors, RfqPrefill } from "@/components/portal/rfq/rfq-form";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { rfqFromFormData, type RfqFormState } from "@/lib/portal/rfq";
import { submitGuestRfq } from "./actions";

type Mode = "create" | "signin";

/**
 * The guest wizard: the shared RfqForm with an account step folded into
 * Review & submit. Creating the account IS submitting the request — the
 * form never navigates away, so nothing typed is ever lost; the
 * localStorage draft covers the one flow that must leave (magic link).
 */
export function GuestRfqForm() {
  const [mode, setMode] = useState<Mode>("create");
  return (
    <DraftAwareRfqForm
      action={submitGuestRfq}
      persistDraft
      submitLabel={mode === "create" ? "Create account & submit" : "Sign in & submit"}
      accountSection={({ errors, state, pending }) => (
        <GuestAccountSection
          mode={mode}
          setMode={setMode}
          errors={errors}
          state={state}
          pending={pending}
        />
      )}
    />
  );
}

type LinkFeedback = { tone: "success" | "error" | "info"; text: string } | null;

function GuestAccountSection({
  mode,
  setMode,
  errors,
  state,
  pending,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  errors: FieldErrors;
  state: RfqFormState;
  pending: boolean;
}) {
  const [sendingLink, setSendingLink] = useState(false);
  const [linkFeedback, setLinkFeedback] = useState<LinkFeedback>(null);

  // Server found an existing account for the email: flip to sign-in mode.
  // The inputs stay mounted (hidden, not removed), so nothing typed is lost.
  useEffect(() => {
    if (state?.accountExists) setMode("signin");
  }, [state, setMode]);

  const err = (name: string) => errors[name]?.[0];

  /** Magic-link is the escape hatch for password-less accounts. It leaves
   * the page, so the whole wizard is saved to the draft first; /quotes/new
   * restores it after the link signs them in. */
  async function sendMagicLink(e: React.MouseEvent<HTMLButtonElement>) {
    if (sendingLink) return;
    const form = e.currentTarget.form;
    const email = (form?.elements.namedItem("accountEmail") as HTMLInputElement | null)?.value
      .trim()
      .toLowerCase();
    if (!email) {
      setLinkFeedback({ tone: "info", text: "Enter your email first and we'll send you a one-time sign-in link." });
      return;
    }
    if (form) saveRfqDraft(rfqFromFormData(new FormData(form)) as RfqPrefill);
    setSendingLink(true);
    setLinkFeedback(null);
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: "/quotes/new",
    });
    setSendingLink(false);
    if (error) {
      setLinkFeedback({ tone: "error", text: error.message ?? "Could not send the link. Try again." });
    } else {
      setLinkFeedback({
        tone: "success",
        text: `Check your inbox: we sent a sign-in link to ${email}. Your answers here are saved and will be waiting after you sign in.`,
      });
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="section-label">
          {mode === "create" ? "Create your account to submit" : "Sign in to submit"}
        </h3>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "create" ? "signin" : "create");
            setLinkFeedback(null);
          }}
          className="text-sm font-bold text-navy hover:underline"
        >
          {mode === "create" ? "I already have an account" : "New here? Create an account"}
        </button>
      </div>
      <p className="text-sm text-muted">
        {mode === "create"
          ? "Your quote lands in your portal account: see the price, ask questions, book the load, and track it from one page."
          : "Welcome back. This request files under your company profile."}
      </p>
      <input type="hidden" name="accountMode" value={mode} />
      {/* Honeypot: unauthenticated write path. Humans never see this field. */}
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div hidden={mode !== "create"} className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="accountName" error={err("accountName")}>
          <Input
            id="accountName"
            name="accountName"
            autoComplete="name"
            aria-invalid={err("accountName") ? true : undefined}
          />
        </Field>
        <Field label="Company name" htmlFor="accountCompany" error={err("accountCompany")}>
          <Input
            id="accountCompany"
            name="accountCompany"
            autoComplete="organization"
            aria-invalid={err("accountCompany") ? true : undefined}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Work email" htmlFor="accountEmail" error={err("accountEmail")}>
          <Input
            id="accountEmail"
            name="accountEmail"
            type="email"
            autoComplete="email"
            aria-invalid={err("accountEmail") ? true : undefined}
          />
        </Field>
        <Field
          label="Password"
          htmlFor="accountPassword"
          hint={mode === "create" ? "At least 8 characters." : undefined}
          error={err("accountPassword")}
        >
          <PasswordInput
            id="accountPassword"
            name="accountPassword"
            autoComplete={mode === "create" ? "new-password" : "current-password"}
            aria-invalid={err("accountPassword") ? true : undefined}
          />
        </Field>
      </div>
      {mode === "signin" ? (
        <p className="text-sm">
          <button
            type="button"
            disabled={sendingLink || pending}
            onClick={sendMagicLink}
            className="font-bold text-muted hover:text-ink disabled:opacity-50"
          >
            {sendingLink
              ? "Sending your sign-in link..."
              : "No password? Email me a one-time sign-in link instead"}
          </button>
        </p>
      ) : null}
      {linkFeedback ? <Alert tone={linkFeedback.tone}>{linkFeedback.text}</Alert> : null}
    </Card>
  );
}
