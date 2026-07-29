# Kwetu Zambia — Build Guide

This document is the detailed design/build/setup guide for the Kwetu v2 rebuild,
as required by `KWETU_SPEC.md`. It covers architecture, the data model, the
commission-on-top + ledger + VAT mechanics with a worked example, local setup
(web + mobile), the SQLite→Postgres and Mock→pawaPay swap paths, environment
variables, seed/demo accounts, deployment notes, and an IMP-01…IMP-24
traceability table.

## 1. Architecture

```
                       ┌─────────────────────────────┐
                       │        Next.js 14 App        │
                       │   (App Router, TypeScript)    │
                       │                               │
  Browser / PWA  ───▶  │  app/*        (pages, SSR)    │
                       │  app/api/*    (route handlers)│
                       │  src/lib/*    (shared engine)  │
                       └───────────────┬───────────────┘
                                       │ Prisma Client
                                       ▼
                       ┌─────────────────────────────┐
                       │     SQLite (dev.db)          │
                       │  Postgres-compatible schema   │
                       └─────────────────────────────┘

  mobile/ (Expo/React Native) ──▶ same REST API (app/api/*) over HTTP
```

Every vertical's API route handler funnels money movement through two shared
primitives in `src/lib/`:

- **`pricing.ts`** — the commission-on-top pricing engine (single source of
  truth for rates, VAT, placement fees, loyalty waiver).
- **`ledger.ts`** — the double-entry ledger service (`postLedgerTransaction`),
  the only write path for money movement anywhere in the app.
- **`checkout.ts`** — orchestrates a booking: charges the `PaymentProvider`,
  computes the price breakdown, posts the ledger transaction, and updates the
  wallet/loyalty counters. `runCheckout` is used by percentage-commission
  verticals (bus, stays, events, services, insurance); `runPlacementFeeCheckout`
  is used by the two flat-fee verticals (rentals, land).
- **`payments.ts`** — the `PaymentProvider` interface + `MockMoneyProvider`.
- **`schemas.ts`** — Zod schemas shared by API route handlers and client forms.

This structure is deliberate: the spec's "24 changes" analysis of the prior
prototype called out drift between client mock logic and (absent) backend
logic as a root cause of failure. Here there is exactly one implementation of
pricing and one implementation of ledger posting, imported everywhere.

## 2. Data model rationale

See `prisma/schema.prisma` for the full schema. Key decisions:

- **SQLite has no native enum type**, so all enum-like fields (`Role`,
  `BookingStatus`, `PaymentStatus`, `SeatStatus`, etc.) are modelled as plain
  `String` columns with the allowed values documented in a comment above each
  model, and as TypeScript union types in `src/lib/ledgerAccountTypes.ts` /
  inline in route handlers. This is what lets the schema move to Postgres
  later with zero model changes (Postgres enums are optional — the string
  columns work as-is, or you can layer `@db.VarChar` + a check constraint).
- **Every vertical has its own booking/listing model** (`BusBooking`,
  `StayBooking`, `EventTicket`, `ServiceBooking`, `PropertyListing`,
  `LandListing`, `InsurancePolicy`) rather than one polymorphic "Order" table.
  This keeps each vertical's domain fields (seat numbers, check-in dates,
  QR codes, plot size) strongly typed instead of stuffed into a JSON blob —
  directly addressing the "missing export / drift" failure mode called out in
  the spec.
- **`Seat` has a `@@unique([tripId, seatNo])` constraint** and is only ever
  transitioned `AVAILABLE → BOOKED` inside a single Prisma `$transaction` in
  `app/api/bus/checkout/route.ts`, which re-checks each seat's status inside
  the transaction before booking it. Two concurrent requests racing for the
  same seat: the loser's transaction throws `SEAT_TAKEN` and the client is
  told to reselect — this is the fix for UBZ Buses' overselling failure mode
  cited in the spec (1.9★ from double-selling seats).
- **`LedgerAccount` / `LedgerTransaction` / `LedgerEntry`** model a classic
  double-entry ledger: every `LedgerTransaction` has ≥2 `LedgerEntry` rows,
  debits must equal credits (enforced in `postLedgerTransaction`), and each
  entry carries a `runningBalance` snapshot for its account. Idempotency is
  enforced via a unique `idempotencyKey` on `LedgerTransaction` — replaying a
  checkout with the same key returns the existing transaction instead of
  double-posting.
- **`Commission`** stores the itemized breakdown (base / commission / VAT /
  total / rate) per `Payment`, independent of the ledger, so the admin console
  can report GMV/take-rate without re-deriving it from ledger entries.

## 3. Commission-on-top + ledger + VAT — worked example

Scenario: a bus operator sets a **base fare of ZMW 180.00** for a Lusaka→Ndola
seat. The bus vertical's commission rate is **7.0%**, and VAT (16%) applies to
the commission only.

```
baseAmountMinor        = 18000            (ZMW 180.00, minor units = ngwee)
commissionAmountMinor  = round(18000 * 0.07)  = 1260   (ZMW 12.60)
vatAmountMinor         = round(1260 * 0.16)   = 202    (ZMW 2.02)
totalAmountMinor       = 18000 + 1260 + 202   = 19462  (ZMW 194.62)
```

The customer sees this itemized breakdown at search-result level (not sprung
at checkout) — see the fare card in `app/bus/results/page.tsx` and
`app/bus/[id]/page.tsx`.

On successful mock payment, `runCheckout` posts one balanced ledger
transaction:

| Account            | Direction | Amount (ngwee) |
|--------------------|-----------|-----------------|
| Cash Clearing       | DEBIT     | 19462           |
| Supplier Payable    | CREDIT    | 18000           |
| Kwetu Revenue       | CREDIT    | 1260            |
| Kwetu VAT Payable   | CREDIT    | 202             |

Debits (19462) == Credits (19462+0) — reconcilable by construction. The admin
console (`/admin`) surfaces any transaction where this doesn't hold as a
"reconciliation exception" (should never happen given the code path, but the
check exists for defense-in-depth and to demonstrate the reconciliation view
the spec calls for).

**Loyalty fee waiver**: every 5th completed booking (`Wallet.completedBookingsCount`)
skips the commission + VAT lines entirely — the customer is charged only the
base amount, and only a `Cash Clearing (DEBIT) / Supplier Payable (CREDIT)`
pair is posted.

**Flat placement fees** (rentals, land — Verticals 5 & 6) don't use this
percentage engine at all: `runPlacementFeeCheckout` charges a flat,
VAT-inclusive fee that is 100% Kwetu revenue (tenant/buyer pays the
landlord/seller directly, never through Kwetu — see `KWETU_SPEC.md`).

## 4. Running locally

### Web app

```bash
npm install
npx prisma migrate dev   # creates prisma/dev.db, applies schema, runs the seed
npm run dev              # http://localhost:3000
```

`npm run build && npm start` runs a production build. `npm run test` runs the
Vitest suite (pricing engine + ledger double-entry tests), against a
disposable `test/test.db` (never your dev/demo database) — see the `pretest`
script in `package.json`.

### Mobile app (`mobile/`)

```bash
cd mobile
npm install
npx expo start
```

The Expo app talks to the same REST API. Set the API base URL for your
environment — on an Android emulator, `10.0.2.2` maps to the host machine's
`localhost`; on a physical device, use your machine's LAN IP; see
`mobile/api.ts`. It reuses the exact same NextAuth Credentials login as the
web app (one identity across web/mobile, per the spec's "unified identity"
requirement) and ships the core bus-booking flow (login, search, seat-map,
checkout) + wallet screen. Extending it to full parity with the web app means
adding the remaining verticals' screens against the same already-built API
routes — no backend work required.

## 5. Environment variables

| Variable | Purpose | Dev default |
|---|---|---|
| `DATABASE_URL` | Prisma datasource connection string | `file:./dev.db` |
| `NEXTAUTH_SECRET` | JWT signing secret for NextAuth | dev placeholder in `.env` — **replace in production** |
| `NEXTAUTH_URL` | Base URL NextAuth uses for callbacks | `http://localhost:3000` |

## 6. Swapping SQLite → Postgres

1. In `prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Set `DATABASE_URL` to a Postgres connection string (e.g. a managed Postgres
   instance, per Doc 2's recommendation).
3. Run `npx prisma migrate dev` to generate and apply a fresh Postgres
   migration (SQLite and Postgres migrations aren't binary-compatible, but the
   schema itself needs no field changes — see §2 on why enums were modelled as
   strings specifically to make this swap trivial).
4. Re-run the seed: `npm run seed`.

No application code changes are required — `src/lib/prisma.ts` is
datasource-agnostic.

## 7. Swapping Mock payments → pawaPay (or Zynle/Tingg/DPO/direct-MNO)

All payment charging goes through the `PaymentProvider` interface in
`src/lib/payments.ts`:

```ts
export interface PaymentProvider {
  name: string;
  charge(req: ChargeRequest): Promise<ChargeResult>;
}
```

To cut over to a real PSP:

1. Implement the interface, e.g. `class PawaPayProvider implements PaymentProvider`,
   calling pawaPay's deposit API and mapping its async status callback/webhook
   back to `"SUCCEEDED" | "FAILED"` (this will likely require making `charge`
   poll or wait on a webhook — the interface's `Promise<ChargeResult>` shape
   supports either).
2. Change the factory `getPaymentProvider()` at the bottom of `payments.ts` to
   return your new provider instead of `MockMoneyProvider`.
3. Nothing else in the codebase changes — `checkout.ts` and every API route
   that calls `runCheckout` / `runPlacementFeeCheckout` is provider-agnostic.

## 8. Seed / demo accounts

All seeded passwords are `password123`.

| Role | Email | Notes |
|---|---|---|
| Admin | `admin@kwetu.zm` | Cross-vertical admin console at `/admin` |
| Consumer | `chanda@example.com` | Has a wallet, can book/browse everything |
| Bus operator supplier | `ops@mazhandu.example.com` | Owns Mazhandu Family Bus + Power Tools routes |
| Lodge host supplier | `host@livingstonelodge.example.com` | Owns Zambezi View Lodge, Lusaka City Apartments |
| Event organiser supplier | `events@kuomboka.example.com` | Owns Kuomboka Ceremony, Copperbelt derby |
| Service provider supplier | `provider@fixit.example.com` | Electrician + cleaning listings |
| Landlord supplier | `landlord@example.com` | Kabulonga rental listing |
| Land seller supplier | `seller@example.com` | Chalala plot listing |

Seed data includes realistic Zambian routes (Lusaka–Ndola, Lusaka–Livingstone,
Lusaka–Kitwe), ZMW pricing, and Zambian-style operator/lodge/event names —
see `prisma/seed.ts`.

## 9. Deployment notes

- Set `NEXTAUTH_SECRET` to a strong random value and `NEXTAUTH_URL` to your
  production origin.
- Swap `DATABASE_URL` to a managed Postgres instance (§6) before going to
  production — SQLite is for local dev/demo only.
- Swap the payment provider (§7) before accepting real money — the
  `MockMoneyProvider` always succeeds deterministically and must never be used
  in production.
- The app is a PWA (`public/manifest.webmanifest`) — it's installable to a
  home screen on Android/iOS as-is; no separate mobile deployment is required
  for a "good enough" mobile experience beyond the native Expo app in `mobile/`.
- Standard Next.js hosting (Vercel, or any Node host) works; if self-hosting,
  run `npm run build && npm start` behind a reverse proxy.

## 10. Non-goals — explicitly simulated, not real, integrations

Per `KWETU_SPEC.md`'s "Non-goals" section, the following are **abstracted or
simulated**, not real, and must never be presented as real integrations:

- **Payments**: `MockMoneyProvider` deterministically succeeds (or fails for
  the sentinel MSISDN `0000000000`) — no real pawaPay/Zynle/Tingg/DPO/MNO call
  is made. See §7 for the swap path.
- **USSD**: `/api/ussd` + `/ussd` is a simulated in-app text-menu session
  demonstrating the interaction model (`*384*...#` style), not a real telco
  USSD gateway integration (e.g. Africa's Talking). Session state is
  in-memory and single-process — a production build needs Redis/DB-backed
  session state and a real gateway integration.
- **Regulatory registration**: no real BoZ, PIA, ZICTA, or ODPC registration
  has occurred; `verified` badges reflect demo seed data, not a real
  verification process.
- **E-invoicing**: no real Smart Invoice / ZRA e-invoicing integration exists;
  the VAT figures are computed and stored in the ledger/commission model only.

## 11. IMP-01…IMP-24 traceability

Mapping of the source analysis's numbered improvements to where they're
implemented in this codebase (improvements not directly about product/tech —
e.g. pure GTM/investment sequencing — are marked N/A for this build, per the
brief's instruction to ignore phased-rollout gating).

| ID | Improvement (from source analysis) | Where implemented |
|---|---|---|
| IMP-01 | Real backend, not a client-only mock | Entire `app/api/*` route handler layer + Prisma/SQLite persistence |
| IMP-02 | Shared typed schema to prevent drift | `src/lib/schemas.ts` (Zod), `prisma/schema.prisma`, consumed by both client forms and route handlers |
| IMP-03 | Real (simulated) persistence & payments, not fake success states | `src/lib/payments.ts` (`MockMoneyProvider`), `Payment`/`Commission` models |
| IMP-04 | Double-entry ledger as core primitive | `src/lib/ledger.ts`, `LedgerAccount`/`LedgerTransaction`/`LedgerEntry` models |
| IMP-05 | Commission-on-top pricing, itemized at search-result level | `src/lib/pricing.ts`, fare/rate cards in `app/bus/results`, `app/stays`, etc. |
| IMP-06 | Per-vertical commission rates exactly as specified | `COMMISSION_RATES` in `src/lib/pricing.ts` |
| IMP-07 | Wallet + loyalty (K-Cash) | `Wallet` model, `app/dashboard`, loyalty points accrual in `checkout.ts` |
| IMP-08 | Every-5th-booking fee waiver | `isLoyaltyFeeWaiver()` in `pricing.ts`, applied in `runCheckout` |
| IMP-09 | USSD/offline interaction model (simulated) | `/api/ussd`, `/ussd` |
| IMP-10 | Seat inventory integrity (no overselling) | `@@unique([tripId, seatNo])` + transactional check in `app/api/bus/checkout/route.ts` |
| IMP-11 | Payments abstracted behind swappable interface | `PaymentProvider` interface, `getPaymentProvider()` factory |
| IMP-12 | VAT on commission, not underlying price | `computeCommissionOnTop()`, worked example in §3 |
| IMP-13 | Multi-role, unified identity (consumer/supplier/admin) | `User.role`, `src/lib/auth.ts`, role-based nav in `src/components/Nav.tsx` |
| IMP-14 | Verified/trust badges on listings | `verified` boolean field across all listing models + `.badge-verified` UI |
| IMP-15 | Supplier consoles per vertical | `app/supplier/page.tsx` (tabbed console: bus/stays/events/services) |
| IMP-16 | Admin console — GMV, take-rate, reconciliation | `app/admin/page.tsx`, `app/api/admin/summary/route.ts` |
| IMP-17 | Property rental: tenant pays landlord directly | `PropertyListing` has no rent-collection path; only `placementFeeMinor` is charged via `runPlacementFeeCheckout` |
| IMP-18 | Land sales: same flat placement-fee model | `LandListing`, `placementFeeForLand()` |
| IMP-19 | Travel/micro-insurance quote-bind-claim flow | `app/api/insurance/quote`, `app/api/insurance/bind`, `app/insurance/page.tsx` |
| IMP-20 | Insurance embedded at checkout as add-on | Standalone flow demonstrated at `/insurance`; embed pattern documented for bus/stay checkout extension |
| IMP-21 | Partner referrals (rides/food/parcel) — outbound + attribution | `ReferralPartner`/`ReferralClick` models, `app/api/partners/[id]/click`, `app/partners/page.tsx` |
| IMP-22 | Low-data / lite, mobile-first UI | Minimal client JS (server components/route handlers), Tailwind mobile-first classes throughout |
| IMP-23 | PWA installability | `public/manifest.webmanifest`, `viewport`/`themeColor` in `app/layout.tsx` |
| IMP-24 | Native mobile client, not just responsive web | `mobile/` Expo app consuming the same REST API |

## 12. Testing

`npm run test` runs Vitest against:

- `test/pricing.test.ts` — commission-on-top math, VAT-on-commission-only,
  per-vertical rates, placement fee tiers, loyalty waiver cadence.
- `test/ledger.test.ts` — rejects unbalanced transactions, posts a balanced
  transaction with correct running balances (worked example from §3),
  idempotency (replay doesn't double-post), rejects single-line transactions.

Tests run against a disposable `test/test.db`, reset via `prisma db push
--force-reset` in the `pretest` script — they never touch `prisma/dev.db`.
