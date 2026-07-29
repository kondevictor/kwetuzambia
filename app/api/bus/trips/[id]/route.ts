import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeCommissionOnTop } from "@/lib/pricing";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    include: {
      route: { include: { operator: true } },
      seats: { orderBy: { seatNo: "asc" } },
    },
  });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  // Release stale seat holds (older than 10 minutes) so they become bookable again.
  const now = new Date();
  await prisma.seat.updateMany({
    where: { tripId: trip.id, status: "HELD", heldUntil: { lt: now } },
    data: { status: "AVAILABLE", heldUntil: null },
  });
  const seats = await prisma.seat.findMany({ where: { tripId: trip.id }, orderBy: { seatNo: "asc" } });

  return NextResponse.json({
    id: trip.id,
    operator: trip.route.operator.name,
    operatorVerified: trip.route.operator.verified,
    origin: trip.route.origin,
    destination: trip.route.destination,
    departAt: trip.departAt,
    arriveAt: trip.arriveAt,
    busPlate: trip.busPlate,
    seats: seats.map((s) => ({ id: s.id, seatNo: s.seatNo, status: s.status })),
    priceBreakdown: computeCommissionOnTop("BUS", trip.basePriceMinor),
  });
}
