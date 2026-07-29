import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionBalances } from "@/lib/ledger";

/**
 * Reconciliation check: (a) every transaction's own entries balance
 * (debits == credits), and (b) platform-wide total debits == total credits
 * across all entries ever posted. Intended to be run nightly (e.g. via a
 * Vercel Cron hitting this route) as well as on-demand from the admin UI.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const transactions = await prisma.ledgerTransaction.findMany({ include: { entries: true }, orderBy: { createdAt: "desc" } });
  const exceptions = transactions.filter((t) => !transactionBalances(t.entries)).map((t) => ({ id: t.id, description: t.description, createdAt: t.createdAt }));

  const allEntries = await prisma.ledgerEntry.findMany();
  const totalDebits = allEntries.filter((e) => e.direction === "DEBIT").reduce((s, e) => s + e.amountMinor, 0);
  const totalCredits = allEntries.filter((e) => e.direction === "CREDIT").reduce((s, e) => s + e.amountMinor, 0);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    transactionsChecked: transactions.length,
    exceptions,
    platformWide: { totalDebits, totalCredits, balanced: totalDebits === totalCredits },
  });
}
