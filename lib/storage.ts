import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { Storage, type StorageOptions } from "@google-cloud/storage";
import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient } from "google-auth-library-storage";

/**
 * Document blob storage. Two backends behind one interface, chosen by env:
 * - Deployed on Vercel: the GCS documents bucket (PORTAL_DOCUMENTS_BUCKET),
 *   authorized through Workload Identity Federation with Vercel's OIDC token
 *   — same no-keys posture as lib/db.ts. Downloads are short-lived V4 signed
 *   URLs, so unsigned bucket URLs never work.
 * - Local dev / CI: a directory on disk (PORTAL_DOCS_DIR, default .devdocs),
 *   streamed back through the same authorizing API route.
 *
 * Callers never hand storage paths to the browser; every download goes
 * through /api/documents/[id], which checks membership and visibility first.
 */

export type DocumentDownload =
  | { kind: "url"; url: string }
  | { kind: "bytes"; bytes: Buffer; contentType: string };

export interface DocumentStorage {
  put(path: string, bytes: Buffer, contentType: string): Promise<void>;
  /** A way to hand the file to an authorized user, valid for ~60 seconds. */
  getDownload(path: string, filename: string, contentType: string): Promise<DocumentDownload>;
}

class GcsStorage implements DocumentStorage {
  private storage: Storage;
  constructor(private bucket: string) {
    const authClient = ExternalAccountClient.fromJSON({
      type: "external_account",
      audience: process.env.PORTAL_GCP_WIF_AUDIENCE!,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      token_url: "https://sts.googleapis.com/v1/token",
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${process.env.PORTAL_GCP_SERVICE_ACCOUNT}:generateAccessToken`,
      subject_token_supplier: {
        // Keep the token's Vercel team audience; see the matching DB supplier.
        getSubjectToken: () => getVercelOidcToken(),
      },
    })!;
    // V4 signing works without a private key: the auth library signs via the
    // IAM credentials API as the impersonated service account. The client
    // types are structurally identical but nominally distinct (same cast as
    // lib/db.ts makes for the Cloud SQL connector).
    this.storage = new Storage({
      projectId: process.env.PORTAL_GCP_PROJECT,
      authClient: authClient as unknown as NonNullable<StorageOptions["authClient"]>,
    });
  }

  async put(path: string, bytes: Buffer, contentType: string) {
    await this.storage.bucket(this.bucket).file(path).save(bytes, {
      contentType,
      resumable: false,
    });
  }

  async getDownload(path: string, filename: string): Promise<DocumentDownload> {
    const [url] = await this.storage
      .bucket(this.bucket)
      .file(path)
      .getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 60_000,
        responseDisposition: `attachment; filename="${filename.replaceAll('"', "")}"`,
      });
    return { kind: "url", url };
  }
}

class LocalDiskStorage implements DocumentStorage {
  constructor(private root: string) {}

  private resolve(path: string) {
    const full = normalize(join(this.root, path));
    if (!full.startsWith(normalize(this.root))) throw new Error("Path escapes storage root");
    return full;
  }

  async put(path: string, bytes: Buffer) {
    const full = this.resolve(path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, bytes);
  }

  async getDownload(path: string, _filename: string, contentType: string): Promise<DocumentDownload> {
    const bytes = await readFile(this.resolve(path));
    return { kind: "bytes", bytes, contentType };
  }
}

let cached: DocumentStorage | undefined;

export function getStorage(): DocumentStorage {
  if (!cached) {
    const bucket = process.env.PORTAL_DOCUMENTS_BUCKET;
    cached = bucket
      ? new GcsStorage(bucket)
      : new LocalDiskStorage(process.env.PORTAL_DOCS_DIR ?? ".devdocs");
  }
  return cached;
}

/** Object path for a new document: org/load scoped, unguessable, filename
 * reduced to a safe suffix. */
export function documentPath(orgId: string, loadId: string, docId: string, filename: string) {
  const safe = filename.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-80);
  const digest = createHash("sha256").update(docId).digest("hex").slice(0, 8);
  return `${orgId}/${loadId}/${docId.slice(0, 8)}-${digest}-${safe || "file"}`;
}
