"use client";

import { useEffect, useState } from "react";
import { loadRfqDraft } from "./draft";
import { RfqForm, type RfqFormProps, type RfqPrefill } from "./rfq-form";

/**
 * RfqForm that hydrates a localStorage draft after mount (localStorage does
 * not exist during SSR). An explicit prefill (duplicate-previous) wins over
 * the draft; the key remount reseeds every defaultValue when a draft lands.
 */
export function DraftAwareRfqForm(props: RfqFormProps) {
  const [draft, setDraft] = useState<RfqPrefill | null>(null);
  useEffect(() => {
    if (!props.prefill) setDraft(loadRfqDraft());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <RfqForm
      key={draft ? "draft" : "blank"}
      {...props}
      prefill={props.prefill ?? draft ?? undefined}
    />
  );
}
