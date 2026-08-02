# Agent operations: the portal CLI

The portal UI is for the customer. Founders (and their AI agents) run the
desk headlessly through `npm run portal`, which drives the same typed
command layer (`lib/portal/admin-queries.ts`) and the same notification
module (`lib/portal/notify.ts`) as the admin web actions. The client gets
the identical email either way, and every mutation lands on the append-only
`events` timeline with `via: "agent"` in the payload (the founder stays the
actor; the agent is a channel).

## Setup

```bash
node scripts/dev-db.ts &        # local PGlite postgres on :5433
npm run db:migrate              # DATABASE_URL defaults are in .env / dev docs
npm run dev                     # only needed for the web portal, not the CLI
export PORTAL_ACTOR=admin@peer-freight.com
```

- Actor: `--as founder@peer-freight.com` or `PORTAL_ACTOR`. Must be a
  verified `@peer-freight.com` portal account (`lib/portal/roles.ts`).
- Database: `DATABASE_URL`, defaulting to the dev DB
  (`postgres://postgres:postgres@127.0.0.1:5433/postgres`).
- Auth is DB access, the same trust level as `scripts/migrate.ts`.
  Flagged: needs a real machine identity before any production deploy.
- Without `RESEND_API_KEY`, emails print to stdout as `[email:dev]`
  instead of sending. The CLI also echoes every composed email.

## Commands

`npm run portal -- help` prints the live list. All commands take `--json`.

Reads: `rfqs`, `rfq <id>`, `loads`, `load <ref>`, `timeline <ref>`, `orgs`.

Writes (each echoes the exact email the client received, when one is sent):

| Command | What happens |
| --- | --- |
| `send-quote <rfqId> --rate --service [--exclusions --valid-until --note]` | Quote sent + email; `--note` becomes the "How we priced it" paragraph |
| `needs-info <rfqId> --message` | One consolidated ask, emailed and logged |
| `book <quoteId>` | Books PEER-nnnn, emails the confirmation |
| `set-status <ref> <status> [--note]` | One legal lifecycle step; tracking link rides along when live |
| `add-doc <ref> --file --type [--share --note]` | Upload; `--share` posts it to the shipper and emails them |
| `share-doc <docId> [--hide]` | Flip visibility on an uploaded document |
| `assign-carrier <ref> --name [--mc --driver --phone --truck --trailer --share]` | Carrier card upsert |
| `set-delay <ref> --reason [--new-eta]` | Flags the exception, emails the shipper |
| `clear-delay <ref>` | Back on schedule, emailed |
| `create-invoice <ref> --due [--amount --file]` | Issues INV-nnnn (delivered → invoiced automatically); `--file` attaches the PDF as a shared document |
| `mark-paid <INV-nnnn>` | Records payment |
| `invite <email> --org <slug> [--role]` | Teammate invite with a 48-hour accept link |
| `send-update <ref> --subject --body` | Free-form update, emailed and recorded as `update_sent` |

## Conventions

- Read before you write: `rfqs` / `load <ref>` first, then act.
- Quote the PEER reference back in anything you tell a founder.
- Show the composed email (the CLI echoes it) so the founder sees exactly
  what the client received.
- Load references accept `PEER-1001`, `peer1001`, `1001`, or the uuid.
