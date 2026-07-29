/**
 * Commission-on-top pricing engine.
 *
 * Supplier sets a base price. Kwetu adds its service fee ON TOP (never absorbed
 * from the supplier). 16% VAT applies to the COMMISSION only, not the base price.
 * All amounts are in "minor units" (ngwee, i.e. ZMW cents) as integers to avoid
 * floating point drift.
 */

export const VAT_RATE = 0.16;

export const COMMISSION_RATES: Record<string, number> = {
  BUS: 0.07,
  ACCOMMODATION: 0.115,
  EVENT: 0.075,
  SERVICE: 0.085,
  INSURANCE: 0.18,
  REFERRAL: 0.04,
  // Rental & land use flat placement fees, not a % commission — see pricing.ts's
  // placementFeeForRental / placementFeeForLand below.
};

export interface PriceBreakdown {
  vertical: string;
  baseAmountMinor: number;
  ratePct: number;
  commissionAmountMinor: number;
  vatAmountMinor: number;
  totalAmountMinor: number;
}

function round(n: number): number {
  return Math.round(n);
}

/**
 * Given a supplier base price (minor units) and a vertical key, compute the
 * itemized commission-on-top breakdown that must be shown at search-result
 * level (not sprung at checkout).
 */
export function computeCommissionOnTop(
  vertical: keyof typeof COMMISSION_RATES,
  baseAmountMinor: number
): PriceBreakdown {
  if (baseAmountMinor < 0 || !Number.isFinite(baseAmountMinor)) {
    throw new Error("baseAmountMinor must be a non-negative finite integer");
  }
  const ratePct = COMMISSION_RATES[vertical];
  if (ratePct === undefined) {
    throw new Error(`Unknown vertical for commission-on-top pricing: ${vertical}`);
  }
  const commissionAmountMinor = round(baseAmountMinor * ratePct);
  const vatAmountMinor = round(commissionAmountMinor * VAT_RATE);
  const totalAmountMinor = baseAmountMinor + commissionAmountMinor + vatAmountMinor;

  return {
    vertical,
    baseAmountMinor,
    ratePct,
    commissionAmountMinor,
    vatAmountMinor,
    totalAmountMinor,
  };
}

/** Flat placement-fee schedule for property rental listings, tiered by period. */
export function placementFeeForRental(period: "DAYS_7" | "DAYS_14" | "DAYS_30"): number {
  const table: Record<string, number> = {
    DAYS_7: 5000, // ZMW 50.00 in ngwee
    DAYS_14: 8500, // ZMW 85.00
    DAYS_30: 15000, // ZMW 150.00
  };
  return table[period];
}

/** Flat placement-fee schedule for land listings, tiered by declared plot value. */
export function placementFeeForLand(priceMinor: number): number {
  // Tiered flat fee bands by plot value (ZMW).
  const priceZmw = priceMinor / 100;
  if (priceZmw < 50_000) return 10000; // ZMW 100.00
  if (priceZmw < 200_000) return 25000; // ZMW 250.00
  if (priceZmw < 500_000) return 50000; // ZMW 500.00
  return 100000; // ZMW 1,000.00
}

/** Every 5th completed booking has the service fee (commission) waived — loyalty. */
export function isLoyaltyFeeWaiver(completedBookingsCountBeforeThisOne: number): boolean {
  const nextBookingNumber = completedBookingsCountBeforeThisOne + 1;
  return nextBookingNumber % 5 === 0;
}
