import { prisma } from "./prisma";
import { computeCommissionOnTop, COMMISSION_RATES, isLoyaltyFeeWaiver } from "./pricing";
import { getPaymentProvider, PaymentMethod } from "./payments";
import { postLedgerTransaction, getOrCreatePlatformAccount, getOrCreateUserWalletAccount } from "./ledger";
import { LedgerAccountType } from "./ledgerAccountTypes";

/**
 * Refunds always return to the payment's ORIGINATING method/reference — never
 * cross-instrument (e.g. never "refund to wallet" a card payment). The ledger
 * is corrected with a new reversing transaction, not by editing the original
 * entries — postings are append-only/immutable by convention throughout this
 * codebase (see ledger.ts).
 */
export async function runRefund(params: { paymentId: string; reason: string; idempotencyKey: string }) {
  const payment = await prisma.payment.findUnique({ where: { id: params.paymentId }, include: { commission: true } });
  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "SUCCEEDED") throw new Error("Only succeeded payments can be refunded");

  const provider = getPaymentProvider();
  const refundResult = await provider.refund({
    originalReference: payment.reference,
    amountMinor: payment.amountMinor,
    idempotencyKey: params.idempotencyKey,
  });

  const refund = await prisma.refund.create({
    data: {
      paymentId: payment.id,
      idempotencyKey: params.idempotencyKey,
      amountMinor: payment.amountMinor,
      reason: params.reason,
      status: refundResult.status,
      reference: refundResult.reference,
    },
  });

  if (refundResult.status === "SUCCEEDED") {
    const cashClearing = await getOrCreatePlatformAccount(LedgerAccountType.CASH_CLEARING, "Cash Clearing");
    const supplierPayable = await getOrCreatePlatformAccount(LedgerAccountType.SUPPLIER_PAYABLE, "Supplier Payable");
    const revenue = await getOrCreatePlatformAccount(LedgerAccountType.KWETU_REVENUE, "Kwetu Revenue");
    const vatPayable = await getOrCreatePlatformAccount(LedgerAccountType.KWETU_VAT_PAYABLE, "Kwetu VAT Payable");

    const c = payment.commission;
    const lines = c
      ? [
          { accountId: supplierPayable.id, direction: "DEBIT" as const, amountMinor: c.baseAmountMinor },
          { accountId: revenue.id, direction: "DEBIT" as const, amountMinor: c.commissionAmountMinor },
          { accountId: vatPayable.id, direction: "DEBIT" as const, amountMinor: c.vatAmountMinor },
          { accountId: cashClearing.id, direction: "CREDIT" as const, amountMinor: payment.amountMinor },
        ].filter((l) => l.amountMinor > 0)
      : [
          { accountId: revenue.id, direction: "DEBIT" as const, amountMinor: payment.amountMinor },
          { accountId: cashClearing.id, direction: "CREDIT" as const, amountMinor: payment.amountMinor },
        ];

    await postLedgerTransaction(prisma, {
      idempotencyKey: `refund-${params.idempotencyKey}`,
      description: `Refund for payment ${payment.id}: ${params.reason}`,
      lines,
    });
  }

  return refund;
}

export interface CheckoutParams {
  userId: string;
  vertical: keyof typeof COMMISSION_RATES;
  baseAmountMinor: number;
  method: PaymentMethod;
  msisdnOrCardRef: string;
  idempotencyKey: string;
  description: string;
}

export interface CheckoutResult {
  paymentId: string;
  status: "SUCCEEDED" | "FAILED";
  breakdown: ReturnType<typeof computeCommissionOnTop>;
  feeWaived: boolean;
  reference: string;
}

/**
 * Full checkout flow shared by every vertical:
 * 1. Look up wallet, decide loyalty fee waiver (every 5th completed booking).
 * 2. Compute commission-on-top + VAT breakdown.
 * 3. Charge via the PaymentProvider abstraction.
 * 4. On success, post the balanced double-entry ledger transaction and bump
 *    the wallet's completedBookingsCount + loyalty points.
 */
export async function runCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  const wallet = await prisma.wallet.upsert({
    where: { userId: params.userId },
    update: {},
    create: { userId: params.userId },
  });

  const feeWaived = isLoyaltyFeeWaiver(wallet.completedBookingsCount);
  const breakdown = computeCommissionOnTop(params.vertical, params.baseAmountMinor);
  const chargeAmountMinor = feeWaived ? params.baseAmountMinor : breakdown.totalAmountMinor;

  const provider = getPaymentProvider();
  const chargeResult = await provider.charge({
    amountMinor: chargeAmountMinor,
    method: params.method,
    msisdnOrCardRef: params.msisdnOrCardRef,
    idempotencyKey: params.idempotencyKey,
  });

  const payment = await prisma.payment.create({
    data: {
      idempotencyKey: params.idempotencyKey,
      provider: provider.name,
      method: params.method,
      status: chargeResult.status,
      amountMinor: chargeAmountMinor,
      reference: chargeResult.reference,
    },
  });

  await prisma.commission.create({
    data: {
      paymentId: payment.id,
      vertical: params.vertical,
      baseAmountMinor: breakdown.baseAmountMinor,
      commissionAmountMinor: feeWaived ? 0 : breakdown.commissionAmountMinor,
      vatAmountMinor: feeWaived ? 0 : breakdown.vatAmountMinor,
      totalAmountMinor: chargeAmountMinor,
      ratePct: breakdown.ratePct,
    },
  });

  if (chargeResult.status === "SUCCEEDED") {
    const cashClearing = await getOrCreatePlatformAccount(LedgerAccountType.CASH_CLEARING, "Cash Clearing");
    const supplierPayable = await getOrCreatePlatformAccount(
      LedgerAccountType.SUPPLIER_PAYABLE,
      "Supplier Payable"
    );
    const revenue = await getOrCreatePlatformAccount(LedgerAccountType.KWETU_REVENUE, "Kwetu Revenue");
    const vatPayable = await getOrCreatePlatformAccount(
      LedgerAccountType.KWETU_VAT_PAYABLE,
      "Kwetu VAT Payable"
    );

    const lines = [
      { accountId: cashClearing.id, direction: "DEBIT" as const, amountMinor: chargeAmountMinor },
      { accountId: supplierPayable.id, direction: "CREDIT" as const, amountMinor: breakdown.baseAmountMinor },
    ];
    if (!feeWaived) {
      lines.push({
        accountId: revenue.id,
        direction: "CREDIT" as const,
        amountMinor: breakdown.commissionAmountMinor,
      });
      lines.push({
        accountId: vatPayable.id,
        direction: "CREDIT" as const,
        amountMinor: breakdown.vatAmountMinor,
      });
    }

    await postLedgerTransaction(prisma, {
      idempotencyKey: params.idempotencyKey,
      description: params.description,
      lines,
    });

    await prisma.wallet.update({
      where: { userId: params.userId },
      data: {
        completedBookingsCount: { increment: 1 },
        loyaltyPoints: { increment: Math.floor(chargeAmountMinor / 1000) }, // 1 point / ZMW10
      },
    });
  }

  return {
    paymentId: payment.id,
    status: chargeResult.status,
    breakdown,
    feeWaived,
    reference: chargeResult.reference,
  };
}

/**
 * Flat placement-fee checkout for rental/land listings (Verticals 5 & 6).
 * These are NOT commission-on-top — the platform never touches rent/sale
 * proceeds, only a flat listing fee, which is 100% Kwetu revenue (+ VAT).
 */
export async function runPlacementFeeCheckout(params: {
  userId: string;
  feeMinor: number;
  method: PaymentMethod;
  msisdnOrCardRef: string;
  idempotencyKey: string;
  description: string;
}) {
  const provider = getPaymentProvider();
  const chargeResult = await provider.charge({
    amountMinor: params.feeMinor,
    method: params.method,
    msisdnOrCardRef: params.msisdnOrCardRef,
    idempotencyKey: params.idempotencyKey,
  });

  const payment = await prisma.payment.create({
    data: {
      idempotencyKey: params.idempotencyKey,
      provider: provider.name,
      method: params.method,
      status: chargeResult.status,
      amountMinor: params.feeMinor,
      reference: chargeResult.reference,
    },
  });

  if (chargeResult.status === "SUCCEEDED") {
    const cashClearing = await getOrCreatePlatformAccount(LedgerAccountType.CASH_CLEARING, "Cash Clearing");
    const revenue = await getOrCreatePlatformAccount(LedgerAccountType.KWETU_REVENUE, "Kwetu Revenue");
    const vatPayable = await getOrCreatePlatformAccount(LedgerAccountType.KWETU_VAT_PAYABLE, "Kwetu VAT Payable");

    const vatAmountMinor = Math.round((params.feeMinor * 0.16) / 1.16); // fee is VAT-inclusive
    const netRevenueMinor = params.feeMinor - vatAmountMinor;

    await postLedgerTransaction(prisma, {
      idempotencyKey: params.idempotencyKey,
      description: params.description,
      lines: [
        { accountId: cashClearing.id, direction: "DEBIT", amountMinor: params.feeMinor },
        { accountId: revenue.id, direction: "CREDIT", amountMinor: netRevenueMinor },
        { accountId: vatPayable.id, direction: "CREDIT", amountMinor: vatAmountMinor },
      ],
    });
  }

  return { paymentId: payment.id, status: chargeResult.status, reference: chargeResult.reference };
}
