import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { LedgerAccountType } from "./ledgerAccountTypes";

export interface LedgerLine {
  accountId: string;
  direction: "DEBIT" | "CREDIT";
  amountMinor: number;
}

/**
 * Post a balanced double-entry transaction: total debits must equal total
 * credits. Idempotent by `idempotencyKey` — replays return the existing
 * transaction instead of double-posting.
 *
 * This is the single write path for all money movement in Kwetu: customer
 * payment, Kwetu commission, supplier payout, insurer premium, referral
 * payout, VAT.
 */
export async function postLedgerTransaction(
  tx: Prisma.TransactionClient | PrismaClient,
  params: {
    idempotencyKey: string;
    description: string;
    lines: LedgerLine[];
  }
) {
  const { idempotencyKey, description, lines } = params;

  const existing = await tx.ledgerTransaction.findUnique({
    where: { idempotencyKey },
    include: { entries: true },
  });
  if (existing) return existing;

  if (lines.length < 2) {
    throw new Error("A ledger transaction needs at least two lines");
  }
  const debits = lines.filter((l) => l.direction === "DEBIT").reduce((s, l) => s + l.amountMinor, 0);
  const credits = lines.filter((l) => l.direction === "CREDIT").reduce((s, l) => s + l.amountMinor, 0);
  if (debits !== credits) {
    throw new Error(`Unbalanced ledger transaction: debits=${debits} credits=${credits}`);
  }
  for (const l of lines) {
    if (l.amountMinor <= 0 || !Number.isInteger(l.amountMinor)) {
      throw new Error("Ledger line amounts must be positive integers (minor units)");
    }
  }

  const transaction = await tx.ledgerTransaction.create({
    data: { idempotencyKey, description },
  });

  for (const line of lines) {
    const account = await tx.ledgerAccount.findUniqueOrThrow({ where: { id: line.accountId } });
    const lastEntry = await tx.ledgerEntry.findFirst({
      where: { accountId: line.accountId },
      orderBy: { createdAt: "desc" },
    });
    const priorBalance = lastEntry?.runningBalance ?? 0;
    // Convention: CASH_CLEARING, USER_WALLET are asset-like (debit increases);
    // KWETU_REVENUE, KWETU_VAT_PAYABLE, SUPPLIER_PAYABLE, INSURER_PAYABLE,
    // REFERRAL_PAYABLE are liability/revenue-like (credit increases).
    const isAssetLike =
      account.type === LedgerAccountType.CASH_CLEARING || account.type === LedgerAccountType.USER_WALLET;
    const delta =
      line.direction === "DEBIT"
        ? isAssetLike
          ? line.amountMinor
          : -line.amountMinor
        : isAssetLike
        ? -line.amountMinor
        : line.amountMinor;
    const runningBalance = priorBalance + delta;

    await tx.ledgerEntry.create({
      data: {
        transactionId: transaction.id,
        accountId: line.accountId,
        direction: line.direction,
        amountMinor: line.amountMinor,
        runningBalance,
      },
    });
  }

  return tx.ledgerTransaction.findUniqueOrThrow({
    where: { id: transaction.id },
    include: { entries: true },
  });
}

/** Fetch or lazily create a singleton platform-level ledger account (revenue, VAT, clearing). */
export async function getOrCreatePlatformAccount(
  type: Exclude<LedgerAccountType, "USER_WALLET">,
  name: string
) {
  const existing = await prisma.ledgerAccount.findFirst({ where: { type, userId: null } });
  if (existing) return existing;
  return prisma.ledgerAccount.create({ data: { type, name } });
}

export async function getOrCreateUserWalletAccount(userId: string) {
  const existing = await prisma.ledgerAccount.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.ledgerAccount.create({
    data: { type: LedgerAccountType.USER_WALLET, name: `Wallet:${userId}`, userId },
  });
}

/** Sum of entries reconciles: debits == credits, per transaction. Used by tests/admin reconciliation view. */
export function transactionBalances(entries: { direction: string; amountMinor: number }[]): boolean {
  const debits = entries.filter((e) => e.direction === "DEBIT").reduce((s, e) => s + e.amountMinor, 0);
  const credits = entries.filter((e) => e.direction === "CREDIT").reduce((s, e) => s + e.amountMinor, 0);
  return debits === credits;
}
