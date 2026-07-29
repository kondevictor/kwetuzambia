import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runCheckout } from "@/lib/checkout";
import { z } from "zod";

const bindSchema = z.object({
  quoteId: z.string(),
  method: z.enum(["AIRTEL_MONEY", "MTN_MONEY", "ZAMTEL_KWACHA", "CARD"]),
  msisdnOrCardRef: z.string().min(6),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bindSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const quote = await prisma.insuranceQuote.findUnique({ where: { id: parsed.data.quoteId } });
  if (!quote) return NextResponse.json({ error: "Quote not found or expired" }, { status: 404 });

  const result = await runCheckout({
    userId: (session.user as any).id,
    vertical: "INSURANCE",
    baseAmountMinor: quote.premiumMinor,
    method: parsed.data.method,
    msisdnOrCardRef: parsed.data.msisdnOrCardRef,
    idempotencyKey: `insurance-${quote.id}`,
    description: `Insurance policy bind for quote ${quote.id}`,
  });

  let policy = null;
  if (result.status === "SUCCEEDED") {
    policy = await prisma.insurancePolicy.create({
      data: { userId: (session.user as any).id, quoteId: quote.id, status: "BOUND", paymentId: result.paymentId },
    });
  }

  return NextResponse.json({ status: result.status, policy, breakdown: result.breakdown });
}
