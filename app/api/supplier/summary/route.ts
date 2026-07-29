import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const [operators, properties, events, serviceListings, rentalListings, landListings] = await Promise.all([
    prisma.operator.findMany({ where: { ownerId: userId }, include: { routes: { include: { trips: { include: { bookings: true } } } } } }),
    prisma.property.findMany({ where: { ownerId: userId }, include: { rooms: { include: { bookings: true } } } }),
    prisma.event.findMany({ where: { ownerId: userId }, include: { ticketTiers: true } }),
    prisma.serviceListing.findMany({ where: { ownerId: userId }, include: { bookings: true } }),
    prisma.propertyListing.findMany({ where: { ownerId: userId } }),
    prisma.landListing.findMany({ where: { ownerId: userId } }),
  ]);

  function sumConfirmed(bookings: { status: string; totalMinor: number }[]) {
    return bookings
      .filter((b) => b.status === "CONFIRMED" || b.status === "ACCEPTED" || b.status === "COMPLETED")
      .reduce((s, b) => s + b.totalMinor, 0);
  }

  const busBookings = operators.flatMap((o) => o.routes.flatMap((r) => r.trips.flatMap((t) => t.bookings)));
  const stayBookings = properties.flatMap((p) => p.rooms.flatMap((r) => r.bookings));
  const serviceBookings = serviceListings.flatMap((l) => l.bookings);

  return NextResponse.json({
    operators,
    properties,
    events,
    serviceListings,
    rentalListings,
    landListings,
    earnings: {
      bus: sumConfirmed(busBookings),
      stays: sumConfirmed(stayBookings),
      services: sumConfirmed(serviceBookings),
    },
  });
}
