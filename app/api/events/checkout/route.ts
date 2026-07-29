import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventCheckoutSchema } from "@/lib/schemas";
import { runCheckout } from "@/lib/checkout";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = eventCheckoutSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { ticketTierId, quantity, method, msisdnOrCardRef } = parsed.data;

  const tier = await prisma.ticketTier.findUnique({ where: { id: ticketTierId } });
  if (!tier) return NextResponse.json({ error: "Ticket tier not found" }, { status: 404 });
  if (tier.sold + quantity > tier.quantity) {
    return NextResponse.json({ error: "Not enough tickets remaining" }, { status: 409 });
  }

  const baseAmountMinor = tier.priceMinor * quantity;
  const idempotencyKey = `event-${tier.id}-${randomUUID()}`;

  const result = await runCheckout({
    userId: (session.user as any).id,
    vertical: "EVENT",
    baseAmountMinor,
    method,
    msisdnOrCardRef,
    idempotencyKey,
    description: `Event ticket purchase ${tier.id} x${quantity}`,
  });

  const tickets = [];
  if (result.status === "SUCCEEDED") {
    await prisma.ticketTier.update({ where: { id: tier.id }, data: { sold: { increment: quantity } } });
    for (let i = 0; i < quantity; i++) {
      const ticket = await prisma.eventTicket.create({
        data: {
          userId: (session.user as any).id,
          ticketTierId: tier.id,
          qrCode: `KWETU-TIX-${randomUUID()}`,
          status: "CONFIRMED",
          totalMinor: baseAmountMinor / quantity,
          paymentId: result.paymentId,
          feeWaived: result.feeWaived,
        },
      });
      tickets.push(ticket);
    }
  }

  return NextResponse.json({ status: result.status, breakdown: result.breakdown, feeWaived: result.feeWaived, tickets });
}
