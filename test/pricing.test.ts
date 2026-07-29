import { describe, it, expect } from "vitest";
import {
  computeCommissionOnTop,
  COMMISSION_RATES,
  VAT_RATE,
  placementFeeForRental,
  placementFeeForLand,
  isLoyaltyFeeWaiver,
} from "@/lib/pricing";

describe("computeCommissionOnTop", () => {
  it("adds the commission ON TOP of the supplier base price (never absorbed)", () => {
    const b = computeCommissionOnTop("BUS", 18000); // ZMW 180.00 fare
    expect(b.baseAmountMinor).toBe(18000);
    expect(b.ratePct).toBe(COMMISSION_RATES.BUS);
    expect(b.commissionAmountMinor).toBe(Math.round(18000 * 0.07));
    expect(b.totalAmountMinor).toBe(b.baseAmountMinor + b.commissionAmountMinor + b.vatAmountMinor);
  });

  it("applies 16% VAT to the commission only, never to the base price", () => {
    const b = computeCommissionOnTop("ACCOMMODATION", 100000);
    const expectedVat = Math.round(b.commissionAmountMinor * VAT_RATE);
    expect(b.vatAmountMinor).toBe(expectedVat);
    // VAT must not be applied to the base amount.
    expect(b.vatAmountMinor).not.toBe(Math.round(b.baseAmountMinor * VAT_RATE));
  });

  it("uses the exact per-vertical rates from the spec", () => {
    expect(COMMISSION_RATES.BUS).toBeCloseTo(0.07);
    expect(COMMISSION_RATES.ACCOMMODATION).toBeCloseTo(0.115);
    expect(COMMISSION_RATES.EVENT).toBeCloseTo(0.075);
    expect(COMMISSION_RATES.SERVICE).toBeCloseTo(0.085);
    expect(COMMISSION_RATES.INSURANCE).toBeCloseTo(0.18);
    expect(COMMISSION_RATES.REFERRAL).toBeCloseTo(0.04);
  });

  it("throws for an unknown vertical", () => {
    expect(() => computeCommissionOnTop("NOT_A_VERTICAL" as any, 1000)).toThrow();
  });

  it("throws for a negative base amount", () => {
    expect(() => computeCommissionOnTop("BUS", -1)).toThrow();
  });

  it("handles zero base amount without error", () => {
    const b = computeCommissionOnTop("BUS", 0);
    expect(b.totalAmountMinor).toBe(0);
  });
});

describe("placement fees (rental & land) — flat, not percentage-based", () => {
  it("tiers rental placement fee by period", () => {
    expect(placementFeeForRental("DAYS_7")).toBe(5000);
    expect(placementFeeForRental("DAYS_14")).toBe(8500);
    expect(placementFeeForRental("DAYS_30")).toBe(15000);
  });

  it("tiers land placement fee by declared plot value", () => {
    expect(placementFeeForLand(10_000 * 100)).toBe(10000);
    expect(placementFeeForLand(100_000 * 100)).toBe(25000);
    expect(placementFeeForLand(300_000 * 100)).toBe(50000);
    expect(placementFeeForLand(1_000_000 * 100)).toBe(100000);
  });
});

describe("loyalty fee waiver", () => {
  it("waives the fee on every 5th completed booking", () => {
    const results = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((count) => isLoyaltyFeeWaiver(count));
    // Booking numbers 1..10 (count is "before this booking"): waived on 5th and 10th.
    expect(results).toEqual([false, false, false, false, true, false, false, false, false, true]);
  });
});
