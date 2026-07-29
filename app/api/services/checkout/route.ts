import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceCheckoutSchema } from "@/lib/schemas";
import { runCheckout } from "@/lib/checkout";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = serviceCheckoutSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { listingId, method, msisdnOrCardRef } = parsed.data;

  const listing = await prisma.serviceListing.findUnique({ where: { id: listingId } });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const booking = await prisma.serviceBooking.create({
    data: { userId: (session.user as any).id, listingId, totalMinor: listing.priceMinor, status: "REQUESTED" },
  });

  const result = await runCheckout({
    userId: (session.user as any).id,
    vertical: "SERVICE",
    baseAmountMinor: listing.priceMinor,
    method,
    msisdnOrCardRef,
    idempotencyKey: `service-${booking.id}`,
    description: `Service booking ${booking.id}: ${listing.title}`,
  });

  await prisma.serviceBooking.update({
    where: { id: booking.id },
    data: {
      status: result.status === "SUCCEEDED" ? "ACCEPTED" : "CANCELLED",
      paymentId: result.paymentId,
      feeWaived: result.feeWaived,
    },
  });

  return NextResponse.json({ bookingId: booking.id, status: result.status, breakdown: result.breakdown, feeWaived: result.feeWaived });
}
