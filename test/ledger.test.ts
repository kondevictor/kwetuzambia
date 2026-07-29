import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { postLedgerTransaction, getOrCreatePlatformAccount, transactionBalances } from "@/lib/ledger";
import { LedgerAccountType } from "@/lib/ledgerAccountTypes";

// This suite exercises the double-entry ledger against a disposable SQLite
// file (see test/setup.ts + the `pretest` script), so it's a real integration
// test of the core primitive the spec calls out: every money movement must be
// an immutable posted ledger entry, keyed by idempotency, and debits must
// equal credits per transaction.
const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.ledgerEntry.deleteMany();
  await prisma.ledgerTransaction.deleteMany();
  await prisma.ledgerAccount.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("postLedgerTransaction", () => {
  it("rejects an unbalanced transaction (debits must equal credits)", async () => {
    const cash = await getOrCreatePlatformAccount(LedgerAccountType.CASH_CLEARING, "Cash Clearing Test A");
    const revenue = await getOrCreatePlatformAccount(LedgerAccountType.KWETU_REVENUE, "Revenue Test A");

    await expect(
      postLedgerTransaction(prisma, {
        idempotencyKey: "test-unbalanced-1",
        description: "unbalanced",
        lines: [
          { accountId: cash.id, direction: "DEBIT", amountMinor: 1000 },
          { accountId: revenue.id, direction: "CREDIT", amountMinor: 900 },
        ],
      })
    ).rejects.toThrow(/Unbalanced/);
  });

  it("posts a balanced transaction and updates running balances correctly", async () => {
    const cash = await getOrCreatePlatformAccount(LedgerAccountType.CASH_CLEARING, "Cash Clearing Test B");
    const supplierPayable = await getOrCreatePlatformAccount(LedgerAccountType.SUPPLIER_PAYABLE, "Supplier Payable Test B");
    const revenue = await getOrCreatePlatformAccount(LedgerAccountType.KWETU_REVENUE, "Revenue Test B");
    const vat = await getOrCreatePlatformAccount(LedgerAccountType.KWETU_VAT_PAYABLE, "VAT Test B");

    // Worked example: ZMW 180.00 bus fare, 7% commission, 16% VAT on commission.
    const base = 18000; // ZMW 180.00
    const commission = Math.round(base * 0.07); // 1260
    const vatAmount = Math.round(commission * 0.16); // 202 (rounded)
    const total = base + commission + vatAmount;

    const tx = await postLedgerTransaction(prisma, {
      idempotencyKey: "test-balanced-1",
      description: "bus booking worked example",
      lines: [
        { accountId: cash.id, direction: "DEBIT", amountMinor: total },
        { accountId: supplierPayable.id, direction: "CREDIT", amountMinor: base },
        { accountId: revenue.id, direction: "CREDIT", amountMinor: commission },
        { accountId: vat.id, direction: "CREDIT", amountMinor: vatAmount },
      ],
    });

    expect(transactionBalances(tx.entries)).toBe(true);
    expect(tx.entries).toHaveLength(4);

    const cashEntry = tx.entries.find((e) => e.accountId === cash.id)!;
    expect(cashEntry.runningBalance).toBe(total); // asset-like account, debit increases balance

    const revenueEntry = tx.entries.find((e) => e.accountId === revenue.id)!;
    expect(revenueEntry.runningBalance).toBe(commission); // liability/revenue-like, credit increases balance
  });

  it("is idempotent: replaying the same idempotencyKey does not double-post", async () => {
    const cash = await getOrCreatePlatformAccount(LedgerAccountType.CASH_CLEARING, "Cash Clearing Test C");
    const revenue = await getOrCreatePlatformAccount(LedgerAccountType.KWETU_REVENUE, "Revenue Test C");

    const lines = [
      { accountId: cash.id, direction: "DEBIT" as const, amountMinor: 500 },
      { accountId: revenue.id, direction: "CREDIT" as const, amountMinor: 500 },
    ];

    const first = await postLedgerTransaction(prisma, { idempotencyKey: "test-idempotent-1", description: "first", lines });
    const second = await postLedgerTransaction(prisma, { idempotencyKey: "test-idempotent-1", description: "first", lines });

    expect(second.id).toBe(first.id);

    const allEntriesForKey = await prisma.ledgerEntry.findMany({ where: { transactionId: first.id } });
    expect(allEntriesForKey).toHaveLength(2); // not 4 — no double-post
  });

  it("rejects a transaction with fewer than two lines", async () => {
    const cash = await getOrCreatePlatformAccount(LedgerAccountType.CASH_CLEARING, "Cash Clearing Test D");
    await expect(
      postLedgerTransaction(prisma, {
        idempotencyKey: "test-single-line",
        description: "invalid",
        lines: [{ accountId: cash.id, direction: "DEBIT", amountMinor: 100 }],
      })
    ).rejects.toThrow();
  });
});
