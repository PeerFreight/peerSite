# Peer Freight — Website Copy & Content Spec (v1)

Source of truth for every word on the site. Copy is written to be **lean, concrete, and
differentiated** — reliability, communication, and transparency over "cheapest."
Grounded in `Broker Checklist.md` (esp. §5 how-we-pitch, §6 legitimacy markers, §12 call scripts).

> **Audience:** Shippers first (they hire us), carriers second (we recruit them).
> **We are the broker.** This is *our brokerage's* site.

---

## 0. Conventions & flags

Inline flags tell you what's safe to publish today:

- ⚠️ **`[GATE: AUTHORITY]`** — do **not** publish until FMCSA broker authority is **ACTIVE** (the gating item; we cannot legally broker a load until then).
- 🟡 **`[VERIFY]`** — factually true but confirm before shipping (e.g., YC backing, exact numbers).
- 🔧 **`[FILL]`** — a placeholder you need to supply (phone, email, address, niche).

Anything without a flag is honest for a brand-new brokerage and safe to publish now.

---

## 1. My rubric — what a credible broker site must have

I graded the copy against this. A freight broker's site earns trust when it:

1. **Says what you move and for whom in one sentence** — equipment + service, no vague "logistics solutions." → *Hero, Freight-we-move.*
2. **Leads with differentiation, never price** — reliability, communication, transparency. → *Hero, Why-Peer.*
3. **Broadcasts legitimacy loudly** — MC#/USDOT#, bonded, insured, TIA, clean SAFER. Fraud is rampant; most small brokers don't bother, so this is a real edge. → *Trust bar, Footer.*
4. **Serves both sides with a clear path each** — shippers (get a quote) and carriers (get paid fast). → *Nav, Carriers page.*
5. **Shows the service model concretely** — the load lifecycle, proactive updates, exception handling — not adjectives. → *How-we-run-a-load.*
6. **Names the fraud-screening rigor** — Highway / SAFER reassures both sides in a fraud-heavy market. → *Fraud-screened capacity.*
7. **Makes contact frictionless** — one primary CTA everywhere, founder-reachable, phone + email visible. → *Global CTAs, Contact.*
8. **Is honest and specific** — no fake tenure, no borrowed logos, no black-box claims. → *§3 guardrails + anti-list.*
9. **Loads fast, reads clean, works on a phone** — dispatchers check on mobile; scannable beats wordy. → *design constraint for build.*
10. **Has a trust-anchored footer** — legal name, MC#/USDOT#, address, ©, privacy. → *Footer.*

---

## 2. Positioning & voice

**One-liner (elevator):**
> Peer Freight is a truckload brokerage that gives shippers fast answers, fraud-screened carriers, and status before they ask — with a founder on every load.

**Voice:** Confident, plain, specific. Short lines. Active verbs. Numbers over adjectives
(*"paid in 24–48h"* beats *"fast pay"*). Sound like a founder who picks up the phone, not a
corporate 3PL.

**What we DON'T say** (anti-list, from checklist §12):
- ❌ "Cheapest rates" / lead with price.
- ❌ "You're one of our first customers" — reads risky.
- ❌ Fake case studies, testimonials, star ratings, or client/partner logos we don't have.
- ❌ "Years of reliability" / any invented tenure.
- ❌ Black-box pricing claims.
- ❌ Over-pitching a shipper dashboard/portal as the reason to choose us — it isn't why an SMB picks a broker.
- ❌ Any "licensed / bonded / insured / TIA member" claim before it's actually true (see §3).

---

## 3. Truth & compliance guardrails (read before go-live)

We are **pre-authority right now.** A public site that solicits loads while implying we're a
licensed, active broker is a problem. Two clean options:

- **Option A — build now, gate go-live:** write the full site today (this doc), preview it on
  Vercel, and only flip the credential trust-bar + "get a quote" language live once authority is
  **ACTIVE**. Recommended.
- **Option B — "launching" framing:** ship now with an honest *"Now onboarding our first shippers"*
  tone and a **Book a call** CTA (not "tender us a load today").

**Legitimacy-marker status** (drives the Trust bar + Footer):

| Marker | Status now | Publish when |
|---|---|---|
| Broker authority (MC#) | ⚠️ not authorized, no MC# yet | authority ACTIVE |
| USDOT 5766712 | active identifier | OK to show as ID; don't imply active authority until it is |
| $75K surety bond (BMC-84) | not posted yet | after posted |
| Insurance (contingent cargo & auto, GL, E&O, cyber) | pending COI | after COI in hand |
| TIA member (+ CTB if earned) | not joined yet | after joining — display the badge |
| Clean SAFER record | true (new, no crashes/complaints) | OK to reference lightly |
| Highway carrier screening | true once we're operating | when we actually screen each carrier |
| Backed by Y Combinator | 🟡 on current live site | keep only if genuinely true |

---

## 4. Site map

- **Home** (shipper-first) — Hero · Trust bar · How we run a load · Why Peer · Freight we move · Carriers teaser · Closing CTA
- **Carriers** — Hero · Why haul for Peer · Get set up · CTA
- **Contact** (or a booking modal) — reach a founder, book a call
- **Privacy** (light legal page)
- **Footer** (global) — credentials + links

Primary CTA sitewide: **Book a call** (shippers) / **Get set up** (carriers).
Reuse existing calendar link for booking.

---

## 5. THE COPY

### 5.1 Global — nav & footer

**Header nav**
- Brand: `Peer`  (full legal name *Peer Freight* used in footer/meta)
- Links: `How it works` · `Freight` · `For carriers`
- Button: `Book a call`

**Footer**
> **Peer Freight**
> A truckload brokerage built on fast answers and dependable coverage.
>
> **Shippers:** Book a call · **Carriers:** Get set up · Contact · Privacy
>
> ⚠️`[GATE: AUTHORITY]` MC# _pending_ · USDOT 5766712 · $75K bonded (BMC-84) · TIA member · Insured: contingent cargo & E&O
> 🔧`[FILL: business address]` · © 2026 Peer Freight

---

### 5.2 Home — Hero

- **H1:** Freight coverage, without the chase.
- **Sub:** A truckload brokerage that gives you fast answers, fraud-screened carriers, and status before you ask — with a founder on every load.
- **Primary CTA:** Book a call
- **Secondary CTA:** For carriers →
- **Badge:** 🟡 Backed by Y Combinator

*Alt H1 options:* "The broker that answers at 9 p.m." · "A broker that picks up the phone." · "Freight that gets covered — and stays covered."

---

### 5.3 Home — Trust bar (thin strip under hero)

One quiet line of legitimacy. ⚠️`[GATE: AUTHORITY]` — hold this strip until authority is active.

> MC# pending · USDOT 5766712 · $75K bonded · Contingent cargo & E&O insured · TIA member · Carriers verified through Highway

*(Until then, replace with a neutral strip:)* "Now onboarding our first shippers · Founder-run · Fraud-screened capacity"

---

### 5.4 Home — How we run a load

- **H2:** Every load, run the same way.
- **Sub:** No black box. Here's exactly what you get from quote to delivery.

| Step | Copy |
|---|---|
| **1. Quote** | A rate at or below market — with the comps behind it. |
| **2. Cover** | Capacity sourced fast, and every carrier identity-verified before they touch your freight. |
| **3. Track** | Updates at pickup, in transit, and delivery. You never chase us. |
| **4. Handle** | Late truck or a missed dock? We work the exception before it's your problem. |
| **5. Close** | A clean POD the same day, then an invoice that matches the quote. |

---

### 5.5 Home — Why Peer (differentiator cards)

- **H2:** Reliability beats "cheapest."

**Card 1 — Reach a founder, not a queue**
You get Felix and Aaron directly. If a truck falls through at 9 p.m., a founder is on it.

**Card 2 — Pricing you can see**
Your rate comes with the market comps behind it — current spot and contract on your lane.

**Card 3 — Fraud-screened capacity**
Every carrier is identity-verified through Highway. You're protected from double-brokering and cargo theft.

**Card 4 — Proactive, not reactive**
We watch weather, hours of service, and dock dwell — and flag a risk to your delivery before it's late.

*Supporting line (optional, below cards):* "We meet your team where you are — email or your TMS, whatever's easiest."

---

### 5.6 Home — Freight we move

- **H2:** Freight we move.
- **Body:** Dry van · Reefer · Flatbed · Tanker · Hazmat-capable · Time-sensitive truckload.
- **Niche line (optional, strong if true):** 🔧`[FILL: niche]` "We specialize in **[reefer / hazmat]** — that's the freight we run, so we know the carriers, lanes, and requirements cold."

---

### 5.7 Home — Carriers teaser

- **H2:** Carriers: get paid faster.
- **Body:** Quick-pay in 24–48 hours — skip your factor's fee on our loads. Detention, layover, and TONU honored in writing.
- **CTA:** Haul for Peer →

---

### 5.8 Home — Closing CTA

- **H2:** Start with one load.
- **Body:** Give us a single load and see how we run it — straight answers, fast coverage, and a team that follows through.
- **CTA:** Book a call

---

### 5.9 Carriers page

**Hero**
- **H1:** Get loaded. Get paid — fast.
- **Sub:** Peer Freight pays carriers in 24–48 hours, honors detention and TONU in writing, and runs accurate loads with no surprises at the dock.
- **CTA:** Get set up

**Why haul for Peer (cards)**
- **Fast pay** — Quick-pay in 24–48 hours, same-day option available. Skip your factor's fee on our loads.
- **Accessorials honored** — Detention, layover, and TONU paid when it's our or the shipper's fault — in writing on the rate con.
- **Accurate loads** — Real weights, real appointment times, no games at the dock.
- **Easy paperwork** — Upload your POD from your phone. No endless check calls.
- **A broker that doesn't ghost** — Active authority, bonded, and we pay on time.

**Get set up**
- **H2:** One packet, then you're ready.
- **Body:** Send it once — MC/DOT, W-9, COI (name Peer as certificate holder), and banking — and you're cleared for our loads.
- **CTA:** 🔧`[FILL]` Email `carriers@peer-freight.com`

---

### 5.10 Contact

- **H2:** Reach a founder directly.
- **Body:** No rep queue. Book a call, or reach us anytime.
- Book a call: *(calendar link)*
- Email: 🔧`[FILL]` `ops@peer-freight.com`
- Phone: 🔧`[FILL]` `[phone]`

---

## 6. Microcopy & CTA library

- Primary CTA (shipper): **Book a call**
- Alt shipper CTA (post-authority): **Get a quote**
- Carrier CTA: **Get set up** / **Haul for Peer**
- Nav button: **Book a call**
- Cross-link: **For carriers →** / **← For shippers**
- Form success: "Got it — a founder will reach out today."

---

## 7. SEO / meta

- **Title:** Peer Freight — Truckload Brokerage That Answers
- **Meta description:** Fraud-screened carriers, transparent pricing, and status before you ask — a truckload brokerage with a founder on every load. Dry van, reefer, flatbed, hazmat-capable.
- **OG title:** Peer Freight
- **OG description:** Freight coverage without the chase. Fast answers, fraud-screened carriers, updates before you ask.

---

## 8. Open questions for you

1. **Go-live timing** — Option A (build now, gate credentials until authority is active) or Option B ("launching" framing)? I've written for A.
2. **Do we have a niche** (reefer / hazmat / a lane) to lead with? Niche = more credible, not less.
3. **Contact details** — public phone? which email(s)? business address for the footer?
4. **Is the YC badge accurate** to keep?
5. **Founder names public** — OK to name "Felix and Aaron" on the site?
6. **Carriers**: full page (recommended) or a single home section for now?
