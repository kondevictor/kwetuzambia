import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { busCheckoutSchema } from "@/lib/schemas";
import { runCheckout } from "@/lib/checkout";
import { randomUUID } from "crypto";

// Seat-lock guarantee: a held/booked seat must never be sellable to two people.
// We rely on the DB transaction + the (tripId, seatNo) unique constraint plus an
// explicit status check inside the transaction, so a concurrent second request
// racing for the same seat fails atomically instead of double-booking it.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = busCheckoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { tripId, seatNos, passengerName, method, msisdnOrCardRef } = parsed.data;

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const seats = await tx.seat.findMany({ where: { tripId, seatNo: { in: seatNos } } });
      if (seats.length !== seatNos.length) throw new Error("SEAT_NOT_FOUND");
      // Bookable if AVAILABLE, or HELD by (presumably) this same shopper and not yet expired —
      // the hold step (see app/api/bus/hold) exists to prevent two shoppers reaching this point
      // for the same seat; an expired hold is treated as unavailable until re-held.
      const now = new Date();
      const unavailable = seats.filter((s) => !(s.status === "AVAILABLE" || (s.status === "HELD" && s.heldUntil && s.heldUntil > now)));
      if (unavailable.length > 0) throw new Error("SEAT_TAKEN");

      const totalMinor = trip.basePriceMinor * seatNos.length;
      const newBooking = await tx.busBooking.create({
        data: {
          userId: (session.user as any).id,
          tripId,
          passengerName,
          totalMinor,
          status: "PENDING_PAYMENT",
        },
      });

      await tx.seat.updateMany({
        where: { id: { in: seats.map((s) => s.id) } },
        data: { status: "BOOKED", bookingId: newBooking.id },
      });

      return newBooking;
    });

    const idempotencyKey = `bus-${booking.id}`;
    const result = await runCheckout({
      userId: (session.user as any).id,
      vertical: "BUS",
      baseAmountMinor: trip.basePriceMinor * seatNos.length,
      method,
      msisdnOrCardRef,
      idempotencyKey,
      description: `Bus booking ${booking.id}: ${seatNos.join(", ")}`,
    });

    if (result.status === "SUCCEEDED") {
      await prisma.busBooking.update({
        where: { id: booking.id },
        data: { status: "CONFIRMED", paymentId: result.paymentId, feeWaived: result.feeWaived },
      });
    } else {
      // Payment failed: release the seats and mark cancelled.
      await prisma.seat.updateMany({
        where: { tripId, seatNo: { in: seatNos } },
        data: { status: "AVAILABLE", bookingId: null },
      });
      await prisma.busBooking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
    }

    return NextResponse.json({
      bookingId: booking.id,
      status: result.status,
      breakdown: result.breakdown,
      feeWaived: result.feeWaived,
      reference: result.reference,
    });
  } catch (err: any) {
    if (err.message === "SEAT_TAKEN") {
      return NextResponse.json({ error: "One or more selected seats were just taken. Please reselect." }, { status: 409 });
    }
    if (err.message === "SEAT_NOT_FOUND") {
      return NextResponse.json({ error: "Invalid seat selection" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
