import type { DocumentType } from "@/db/schema";
import { DOCUMENT_TYPE_LABELS } from "@/lib/portal/documents";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "America/Los_Angeles",
});

export type DocumentRow = {
  id: string;
  type: DocumentType;
  filename: string;
  sizeBytes: number;
  createdAt: Date;
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Rows of downloadable documents; downloads go through the authorizing
 * /api/documents route, never a raw storage URL. `extra` renders per-row
 * admin controls (share/hide). */
export function DocumentList({
  documents,
  extra,
}: {
  documents: DocumentRow[];
  extra?: (doc: DocumentRow) => React.ReactNode;
}) {
  return (
    <ul className="divide-y divide-line">
      {documents.map((doc) => (
        <li key={doc.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">{DOCUMENT_TYPE_LABELS[doc.type]}</p>
            <p className="mt-0.5 truncate text-xs text-muted">
              {doc.filename} · {fmtSize(doc.sizeBytes)} · {dateFmt.format(doc.createdAt)}
            </p>
          </div>
          <a
            href={`/api/documents/${doc.id}`}
            className="text-sm font-bold text-navy hover:underline"
          >
            Download
          </a>
          {extra ? extra(doc) : null}
        </li>
      ))}
    </ul>
  );
}
