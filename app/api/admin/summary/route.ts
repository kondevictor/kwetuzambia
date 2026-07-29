import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionBalances } from "@/lib/ledger";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [payments, commissions, userCount, operatorCount, transactions] = await Promise.all([
    prisma.payment.findMany({ where: { status: "SUCCEEDED" } }),
    prisma.commission.findMany(),
    prisma.user.count(),
    prisma.operator.count(),
    prisma.ledgerTransaction.findMany({ include: { entries: true }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  const gmvMinor = payments.reduce((s, p) => s + p.amountMinor, 0);
  const revenueMinor = commissions.reduce((s, c) => s + c.commissionAmountMinor, 0);
  const vatMinor = commissions.reduce((s, c) => s + c.vatAmountMinor, 0);
  const takeRatePct = gmvMinor > 0 ? (revenueMinor / gmvMinor) * 100 : 0;

  const byVertical: Record<string, { gmv: number; revenue: number; count: number }> = {};
  for (const c of commissions) {
    byVertical[c.vertical] ??= { gmv: 0, revenue: 0, count: 0 };
    byVertical[c.vertical].gmv += c.totalAmountMinor;
    byVertical[c.vertical].revenue += c.commissionAmountMinor;
    byVertical[c.vertical].count += 1;
  }

  const reconciliationExceptions = transactions.filter((t) => !transactionBalances(t.entries));

  return NextResponse.json({
    gmvMinor,
    revenueMinor,
    vatMinor,
    takeRatePct,
    userCount,
    operatorCount,
    byVertical,
    reconciliationExceptionsCount: reconciliationExceptions.length,
    recentTransactions: transactions.slice(0, 10).map((t) => ({
      id: t.id,
      description: t.description,
      createdAt: t.createdAt,
      balanced: transactionBalances(t.entries),
      lines: t.entries.length,
    })),
  });
}
