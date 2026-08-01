"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { TRACKING_INTERVAL_OPTIONS } from "@/lib/portal/tracking";
import {
  recordManualPingAction,
  revokeTrackingLinkAction,
  sendTrackingLinkAction,
  startTrackingAction,
  stopTrackingAction,
  type AdminFormState,
} from "../../actions";

/** Start a session against the assigned carrier's driver phone. */
export function StartTrackingForm({ loadId }: { loadId: string }) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    startTrackingAction.bind(null, loadId),
    null,
  );
  return (
    <form action={formAction} className="space-y-3">
      <Field label="Ping interval" htmlFor="intervalMinutes" hint="MacroPoint bills per load, not per ping.">
        <Select id="intervalMinutes" name="intervalMinutes" defaultValue="30">
          {TRACKING_INTERVAL_OPTIONS.map((m) => (
            <option key={m} value={m}>
              Every {m} minutes
            </option>
          ))}
        </Select>
      </Field>
      {state?.formError ? <p className="text-sm font-bold text-red-700">{state.formError}</p> : null}
      {state?.ok ? <p className="text-sm font-bold text-green-800">Tracking started.</p> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Starting..." : "Start live tracking"}
      </Button>
    </form>
  );
}

export function StopTrackingForm({ loadId }: { loadId: string }) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    stopTrackingAction.bind(null, loadId),
    null,
  );
  return (
    <form action={formAction} className="inline">
      <Button type="submit" variant="danger" size="sm" disabled={pending}>
        {pending ? "Stopping..." : "Stop tracking"}
      </Button>
      {state?.formError ? <p className="mt-1 text-sm font-bold text-red-700">{state.formError}</p> : null}
    </form>
  );
}

/** Rotate the token: everyone holding the current link loses access now. */
export function RevokeLinkForm({ sessionId, loadId }: { sessionId: string; loadId: string }) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    revokeTrackingLinkAction.bind(null, sessionId, loadId),
    null,
  );
  return (
    <form action={formAction} className="inline">
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "..." : "Revoke link"}
      </Button>
      {state?.formError ? <p className="mt-1 text-sm font-bold text-red-700">{state.formError}</p> : null}
    </form>
  );
}

function SendLinkForm({ loadId }: { loadId: string }) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    sendTrackingLinkAction.bind(null, loadId),
    null,
  );
  return (
    <form action={formAction} className="inline">
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Sending..." : "Email link to shipper"}
      </Button>
      {state?.formError ? <p className="mt-1 text-sm font-bold text-red-700">{state.formError}</p> : null}
      {state?.ok ? <p className="mt-1 text-sm font-bold text-green-800">Link emailed.</p> : null}
    </form>
  );
}

/** The shareable public link with copy / email / revoke controls. */
export function TrackingLinkPanel({
  publicUrl,
  sessionId,
  loadId,
}: {
  publicUrl: string;
  sessionId: string;
  loadId: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input readOnly value={publicUrl} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SendLinkForm loadId={loadId} />
        <RevokeLinkForm sessionId={sessionId} loadId={loadId} />
      </div>
    </div>
  );
}

/** Desk fallback: key in a position from a driver check call. */
export function ManualPingForm({ loadId }: { loadId: string }) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    recordManualPingAction.bind(null, loadId),
    null,
  );
  const err = (name: string) => state?.fieldErrors?.[name]?.[0];
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Latitude" htmlFor="lat" error={err("lat")}>
          <Input id="lat" name="lat" placeholder="38.2324" required />
        </Field>
        <Field label="Longitude" htmlFor="lng" error={err("lng")}>
          <Input id="lng" name="lng" placeholder="-122.6367" required />
        </Field>
      </div>
      {state?.formError ? <p className="text-sm font-bold text-red-700">{state.formError}</p> : null}
      {state?.ok ? <p className="text-sm font-bold text-green-800">Position recorded.</p> : null}
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Recording..." : "Record manual position"}
      </Button>
    </form>
  );
}
