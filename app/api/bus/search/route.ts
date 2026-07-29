import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeCommissionOnTop } from "@/lib/pricing";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const origin = searchParams.get("origin") || undefined;
  const destination = searchParams.get("destination") || undefined;

  const trips = await prisma.trip.findMany({
    where: {
      route: {
        ...(origin ? { origin: { contains: origin } } : {}),
        ...(destination ? { destination: { contains: destination } } : {}),
      },
    },
    include: {
      route: { include: { operator: true } },
      seats: true,
    },
    orderBy: { departAt: "asc" },
  });

  const results = trips.map((t) => {
    const available = t.seats.filter((s) => s.status === "AVAILABLE").length;
    const breakdown = computeCommissionOnTop("BUS", t.basePriceMinor);
    return {
      id: t.id,
      operator: t.route.operator.name,
      operatorVerified: t.route.operator.verified,
      origin: t.route.origin,
      destination: t.route.destination,
      departAt: t.departAt,
      arriveAt: t.arriveAt,
      availableSeats: available,
      totalSeats: t.totalSeats,
      priceBreakdown: breakdown,
    };
  });

  return NextResponse.json({ results });
}
