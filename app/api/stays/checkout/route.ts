import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stayCheckoutSchema } from "@/lib/schemas";
import { runCheckout } from "@/lib/checkout";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = stayCheckoutSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { roomId, checkIn, checkOut, method, msisdnOrCardRef } = parsed.data;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
  const baseAmountMinor = room.ratePerNightMinor * nights;

  const booking = await prisma.stayBooking.create({
    data: {
      userId: (session.user as any).id,
      roomId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      totalMinor: baseAmountMinor,
      status: "PENDING_PAYMENT",
    },
  });

  const result = await runCheckout({
    userId: (session.user as any).id,
    vertical: "ACCOMMODATION",
    baseAmountMinor,
    method,
    msisdnOrCardRef,
    idempotencyKey: `stay-${booking.id}`,
    description: `Stay booking ${booking.id}`,
  });

  await prisma.stayBooking.update({
    where: { id: booking.id },
    data: {
      status: result.status === "SUCCEEDED" ? "CONFIRMED" : "CANCELLED",
      paymentId: result.paymentId,
      feeWaived: result.feeWaived,
    },
  });

  return NextResponse.json({ bookingId: booking.id, status: result.status, breakdown: result.breakdown, feeWaived: result.feeWaived });
}
