"use client";

import { useActionState } from "react";
import type { LoadStatus } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { DOCUMENT_TYPE_OPTIONS } from "@/lib/portal/documents";
import { LOAD_STATUS_LABELS } from "@/lib/portal/loads";
import {
  assignCarrierAction,
  setDocumentVisibilityAction,
  setLoadStatusAction,
  uploadDocumentAction,
  type AdminFormState,
} from "../../actions";

/** One button per legal next status; each move emails the shipper. */
export function StatusStepForm({ loadId, next }: { loadId: string; next: LoadStatus }) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    setLoadStatusAction.bind(null, loadId, next),
    null,
  );
  const cancel = next === "cancelled";

  return (
    <form action={formAction} className="space-y-2">
      <Button type="submit" variant={cancel ? "danger" : "primary"} disabled={pending}>
        {pending
          ? "Updating..."
          : cancel
            ? "Cancel load"
            : `Mark ${LOAD_STATUS_LABELS[next].toLowerCase()}`}
      </Button>
      {state?.formError ? (
        <p className="text-sm font-bold text-red-700">{state.formError}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm font-bold text-green-800">Updated and shipper emailed.</p>
      ) : null}
    </form>
  );
}

/** Upload a document onto the load; sharing emails the shipper. */
export function UploadDocumentForm({ loadId }: { loadId: string }) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    uploadDocumentAction.bind(null, loadId),
    null,
  );
  const err = (name: string) => state?.fieldErrors?.[name]?.[0];

  return (
    <form action={formAction} className="space-y-4">
      <Field label="File" htmlFor="file" error={err("file")}>
        <Input id="file" name="file" type="file" required />
      </Field>
      <Field label="Type" htmlFor="type" error={err("type")}>
        <Select id="type" name="type" defaultValue="rate_confirmation">
          {DOCUMENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-sm font-bold text-ink">
        <input type="checkbox" name="visibleToShipper" defaultChecked />
        Share with the shipper now
      </label>
      {state?.formError ? <p className="text-sm font-bold text-red-700">{state.formError}</p> : null}
      {state?.ok ? <p className="text-sm font-bold text-green-800">Document posted.</p> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Uploading..." : "Upload"}
      </Button>
    </form>
  );
}

/** Share / hide toggle on an already-uploaded document. */
export function ToggleDocumentVisibilityForm({
  documentId,
  loadId,
  visible,
}: {
  documentId: string;
  loadId: string;
  visible: boolean;
}) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    setDocumentVisibilityAction.bind(null, documentId, loadId, !visible),
    null,
  );

  return (
    <form action={formAction} className="inline">
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "..." : visible ? "Hide" : "Share"}
      </Button>
      {state?.formError ? <p className="text-sm font-bold text-red-700">{state.formError}</p> : null}
    </form>
  );
}

type CarrierDefaults = {
  carrierName: string;
  mcNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  truckNumber: string | null;
  trailerNumber: string | null;
  trackingUrl: string | null;
  visibleToShipper: boolean;
} | null;

/** Assign or update the carrier. `suggestVisible` pre-checks sharing once the
 * load is dispatched (the runbook default). */
export function CarrierForm({
  loadId,
  carrier,
  suggestVisible,
}: {
  loadId: string;
  carrier: CarrierDefaults;
  suggestVisible: boolean;
}) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    assignCarrierAction.bind(null, loadId),
    null,
  );
  const err = (name: string) => state?.fieldErrors?.[name]?.[0];

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Carrier" htmlFor="carrierName" error={err("carrierName")}>
        <Input
          id="carrierName"
          name="carrierName"
          required
          defaultValue={carrier?.carrierName ?? ""}
          placeholder="Carrier legal name"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="MC number" htmlFor="mcNumber" hint="Optional" error={err("mcNumber")}>
          <Input id="mcNumber" name="mcNumber" defaultValue={carrier?.mcNumber ?? ""} placeholder="MC-123456" />
        </Field>
        <Field label="Driver" htmlFor="driverName" hint="Optional" error={err("driverName")}>
          <Input id="driverName" name="driverName" defaultValue={carrier?.driverName ?? ""} />
        </Field>
        <Field label="Driver phone" htmlFor="driverPhone" hint="Optional" error={err("driverPhone")}>
          <Input id="driverPhone" name="driverPhone" defaultValue={carrier?.driverPhone ?? ""} placeholder="(555) 555-0100" />
        </Field>
        <Field label="Truck #" htmlFor="truckNumber" hint="Optional" error={err("truckNumber")}>
          <Input id="truckNumber" name="truckNumber" defaultValue={carrier?.truckNumber ?? ""} />
        </Field>
        <Field label="Trailer #" htmlFor="trailerNumber" hint="Optional" error={err("trailerNumber")}>
          <Input id="trailerNumber" name="trailerNumber" defaultValue={carrier?.trailerNumber ?? ""} />
        </Field>
      </div>
      <Field
        label="Tracking link"
        htmlFor="trackingUrl"
        hint="Pasted MacroPoint / p44 / ELD share link. Optional."
        error={err("trackingUrl")}
      >
        <Input
          id="trackingUrl"
          name="trackingUrl"
          type="url"
          defaultValue={carrier?.trackingUrl ?? ""}
          placeholder="https://..."
        />
      </Field>
      <label className="flex items-center gap-2 text-sm font-bold text-ink">
        <input
          type="checkbox"
          name="visibleToShipper"
          defaultChecked={carrier?.visibleToShipper ?? suggestVisible}
        />
        Show carrier and tracking to the shipper
      </label>
      {state?.formError ? <p className="text-sm font-bold text-red-700">{state.formError}</p> : null}
      {state?.ok ? <p className="text-sm font-bold text-green-800">Carrier saved.</p> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving..." : carrier ? "Update carrier" : "Assign carrier"}
      </Button>
    </form>
  );
}
