# Kwetu Zambia — Build Spec (derived from the 3 strategy PDFs)

Product: "Kwetu — Everything You Need, Right Here." A Zambian multi-vertical digital
commerce platform (super-app). The user wants ALL verticals/phases built now (ignore
phased rollout gating — that was an investment/GTM sequencing recommendation, not a
technical constraint), a professional full-stack web + mobile app, all backend features
working, and a detailed design/build/setup guide.

## Verticals (all 8, all must be implemented end-to-end)
1. Intercity bus travel — operator/route/trip/seat-map booking, 7.0% commission-on-top.
2. Accommodation (hotels/lodges/apartments) — listings, room types, date-range booking, 11.5% commission-on-top.
3. Event ticketing (football, concerts, exhibitions) — events, ticket tiers, QR tickets, 7.5% fee.
4. Local services marketplace — independent providers list services, 8.5% commission on completed job.
5. Property rental placement — landlord lists property, tenant pays landlord DIRECTLY (never through platform — this is a deliberate, load-bearing decision from the source analysis to avoid holding float/tenancy-law exposure). Platform earns a flat placement fee per listing period (7/14/30 days).
6. Land sales listings — same flat placement-fee model, tiered by plot value.
7. Travel & micro-insurance — quote-bind-claim flow, embedded at bus/accommodation checkout as an add-on, 18% agency commission (highest margin line).
8. Partner referrals (rides/food/parcel, e.g. Yango) — outbound referral links/attribution, 4.0% referral commission.

## Core architectural requirements (directly from "the 24 changes", Section 12 of Doc 1, and Doc 2 Technical Specifications)
- Rebuild clean — no client-only mock. Real backend, real auth, real persistence, real (simulated in dev) payments.
- Shared typed schema (TypeScript types / Zod schemas) as single source of truth, consumed by API and UI, to prevent the prototype's "missing export" / drift failures.
- **Double-entry ledger service** as a core primitive, used by every vertical: every money movement (customer payment, Kwetu commission, supplier payout, insurer premium, referral payout, VAT) is an immutable posted ledger entry with a running balance, keyed by an idempotency key, reconcilable (debits == credits per transaction, per account).
- **Commission-on-top pricing engine**: supplier sets base price; platform adds its service fee ON TOP (never absorbed from supplier). Fee is shown itemized at search-result level, not sprung at checkout. Rates per vertical exactly as listed above.
- **Wallet**: every user has a Kwetu wallet (balance, loyalty points/K-Cash). Every 5th booking has its service fee waived (loyalty).
- Guarantee model for bus bookings: seat lock (inventory integrity — this was UBZ Buses' fatal flaw, 1.9★ from overselling). A held seat must not be sellable to two people; use a DB transaction / row lock or unique constraint per (trip, seat).
- Payments: abstract behind a `PaymentProvider` adapter interface (so pawaPay/Zynle/Tingg/DPO/direct-MNO are swappable by config). For this build, implement a `MockMoneyProvider` that simulates Airtel/MTN/Zamtel mobile money and card charges deterministically (succeeds, returns a reference), wired through the same adapter interface a real PSP would use later. Document how to swap in pawaPay.
- VAT: 16% VAT applies to the COMMISSION (Kwetu's fee), not the underlying supplier price. Model this in the ledger/pricing breakdown.
- Multi-role auth: consumer, supplier (bus operator / landlord / event organiser / service provider / lodge), admin/ops. One unified identity — a supplier account and consumer account are the same login with role-based dashboards.
- Supplier consoles: bus operator dispatch console (routes, trips, seat inventory, fares, bookings, payouts), accommodation manager (properties, rooms, rates, bookings), event organiser console, landlord/land-seller listing console, services-provider console — each shows their earnings and a reconciliation view sourced from the ledger.
- Admin console: cross-vertical view — GMV, take-rate, operator count, reconciliation exceptions, user/supplier management, risk/dispute queue.
- USSD/offline consideration: since a full telco USSD gateway can't be integrated in this build, implement a `/ussd` simulated endpoint + simple text-menu UI that mimics a USSD session (IMP-09) so the interaction model is demonstrated and pluggable into a real gateway (e.g. Africa's Talking) later. Note this clearly in docs as a simulation.
- Verified/trust badges on supplier listings (IMP-14): simple verification status field + badge in UI.
- Low-data / offline-friendly UI: keep payloads light, avoid heavy client bundles, support a "lite" mode.

## Tech stack decision (already chosen — do not re-litigate, just build)
- Monorepo not required; single Next.js 14+ (App Router, TypeScript) full-stack app is sufficient for "web and mobile" because it will be a fully responsive, installable PWA (works great as a mobile web app on Android/iOS home screen). Additionally scaffold a thin Expo/React Native app (`mobile/`) with a handful of core screens (login, bus search/results/seat-map/checkout, my bookings, wallet) that consumes the same REST API, to genuinely deliver a native mobile client — document how to extend it to full parity.
- Database: Prisma ORM. Use SQLite for zero-config local dev (file-based, works out of the box on Windows), but write the schema Postgres-compatible and document the one-line datasource swap to Postgres for production (per Doc 2's recommendation of managed Postgres).
- Auth: NextAuth (Credentials provider, email+password, bcrypt hash) with role field on User.
- Styling: Tailwind CSS. Professional, modern, "trustworthy fintech/travel" look — deep green (#0B5D3B-ish) + warm orange accent (matches the brand palette implied by the PDFs' green/orange document styling), clean cards, itemized pricing everywhere, mobile-first.
- State/data fetching: server components + server actions / route handlers; minimal client JS.
- Validation: Zod schemas shared between client forms and API route handlers (put them in `src/lib/schemas.ts`).
- Testing: add Vitest with a handful of real tests for the pricing engine and ledger (double-entry must balance) since that's explicitly what the source docs say the prototype lacked.

## Deliverables checklist
1. Working Next.js app in this directory (`Kwetu app v2/`), `npm install && npm run dev` boots it.
2. Prisma schema modelling: User, Wallet, LedgerEntry/LedgerAccount, Operator, Route, Trip, Seat, Booking(Bus), Property(Accommodation), Room, StayBooking, Event, TicketTier, EventTicket, ServiceListing, ServiceBooking, PropertyListing(rental), LandListing, InsurancePolicy, InsuranceQuote, ReferralPartner, ReferralClick, Payment, Commission.
3. Seed script with realistic Zambian sample data (routes like Lusaka–Ndola, Lusaka–Livingstone, operators Mazhandu/Power Tools/Shalom style names, ZMW pricing) so the app is demo-able immediately.
4. Full page set: landing/home (vertical hub), auth pages, bus search→results→seatmap→checkout→confirmation, accommodation search→results→property→checkout, events listing→ticket purchase, marketplace listing→booking, property/land listing pages + "list yours" flow, insurance add-on component reused at checkout, user dashboard (wallet, bookings, loyalty tier), supplier dashboards (one per vertical or a unified supplier console with tabs), admin dashboard.
5. API routes implementing all the above with the ledger + commission engine wired in, not just UI mockups.
6. `mobile/` Expo app with the core bus-booking flow + login + wallet screens hitting the same API (set API base URL via env).
7. `BUILD_GUIDE.md` — a genuinely detailed design/build/setup doc: architecture diagram (ascii/mermaid ok), data model rationale, how commission-on-top + ledger + VAT work with a worked example, how to run locally (web + mobile), how to swap SQLite→Postgres and Mock payments→pawaPay, environment variables, seed/demo accounts and credentials, deployment notes, and an explicit mapping table of "IMP-01..IMP-24 improvement → where it's implemented in this codebase" so the rebuild is traceable back to the source analysis.
8. `README.md` short quickstart pointing at BUILD_GUIDE.md.

## Non-goals / explicit simplifications to state in docs (be honest, don't fake)
- Real PSP integration (pawaPay etc.), real BoZ/PIA/ZICTA/ODPC registration, real Smart Invoice e-invoicing, and a production USSD gateway are NOT actually integrated — they're abstracted behind interfaces / simulated, with clear notes on what a production cutover requires. Do not claim these are "real" integrations anywhere in the UI or docs.
