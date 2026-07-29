import { randomUUID } from "crypto";

export type PaymentMethod = "AIRTEL_MONEY" | "MTN_MONEY" | "ZAMTEL_KWACHA" | "CARD";

export interface ChargeRequest {
  amountMinor: number;
  method: PaymentMethod;
  msisdnOrCardRef: string;
  idempotencyKey: string;
}

export interface ChargeResult {
  status: "SUCCEEDED" | "FAILED";
  reference: string;
  provider: string;
}

/**
 * PaymentProvider is the swap point for a real PSP (pawaPay / Zynle / Tingg / DPO
 * / direct MNO). Every caller in this codebase talks to this interface only —
 * never to a concrete provider — so production cutover means implementing this
 * interface against a real gateway and changing one factory function.
 *
 * See BUILD_GUIDE.md "Swapping Mock payments -> pawaPay".
 */
export interface RefundRequest {
  originalReference: string;
  amountMinor: number;
  idempotencyKey: string;
}

export interface RefundResult {
  status: "SUCCEEDED" | "FAILED";
  reference: string;
}

export interface PaymentProvider {
  name: string;
  charge(req: ChargeRequest): Promise<ChargeResult>;
  /** Refunds always return to the ORIGINATING instrument — never cross-instrument. */
  refund(req: RefundRequest): Promise<RefundResult>;
}

/**
 * Deterministic simulated mobile-money/card charge for local dev and demos.
 * Always succeeds (unless the sentinel MSISDN "0000000000" is used, to let us
 * demo/test the failure path deterministically too).
 */
export class MockMoneyProvider implements PaymentProvider {
  name = "MockMoneyProvider";

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const fails = req.msisdnOrCardRef.replace(/\D/g, "") === "0000000000";
    return {
      status: fails ? "FAILED" : "SUCCEEDED",
      reference: `MOCK-${randomUUID().slice(0, 8).toUpperCase()}`,
      provider: this.name,
    };
  }

  async refund(req: RefundRequest): Promise<RefundResult> {
    return { status: "SUCCEEDED", reference: `MOCK-RFD-${randomUUID().slice(0, 8).toUpperCase()}` };
  }
}

let providerInstance: PaymentProvider | null = null;

/** Factory — this is the single place a production build swaps in a real PSP. */
export function getPaymentProvider(): PaymentProvider {
  if (!providerInstance) providerInstance = new MockMoneyProvider();
  return providerInstance;
}
