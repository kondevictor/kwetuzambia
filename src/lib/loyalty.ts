/** K-Cash loyalty tiers, driven off lifetime loyaltyPoints. Thresholds are a
 * reasonable starting point (1 point ≈ ZMW 10 spent — see checkout.ts), not
 * derived from any external spec. */
export type LoyaltyTier = "Bronze" | "Silver" | "Gold";

export const WELCOME_BONUS_POINTS = 50;

const TIERS: { tier: LoyaltyTier; minPoints: number }[] = [
  { tier: "Gold", minPoints: 500 },
  { tier: "Silver", minPoints: 100 },
  { tier: "Bronze", minPoints: 0 },
];

export function loyaltyTierFor(points: number): LoyaltyTier {
  return TIERS.find((t) => points >= t.minPoints)!.tier;
}

export function pointsToNextTier(points: number): { nextTier: LoyaltyTier; pointsNeeded: number } | null {
  const sorted = [...TIERS].sort((a, b) => a.minPoints - b.minPoints);
  const next = sorted.find((t) => points < t.minPoints);
  if (!next) return null;
  return { nextTier: next.tier, pointsNeeded: next.minPoints - points };
}
