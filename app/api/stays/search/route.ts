import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeCommissionOnTop } from "@/lib/pricing";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") || undefined;

  const properties = await prisma.property.findMany({
    where: city ? { city: { contains: city } } : {},
    include: { rooms: true },
  });

  return NextResponse.json({
    results: properties.map((p) => {
      const cheapest = p.rooms.reduce((min, r) => (r.ratePerNightMinor < min ? r.ratePerNightMinor : min), Infinity);
      const breakdown = Number.isFinite(cheapest) ? computeCommissionOnTop("ACCOMMODATION", cheapest) : null;
      return {
        id: p.id,
        name: p.name,
        city: p.city,
        verified: p.verified,
        description: p.description,
        fromBreakdown: breakdown,
      };
    }),
  });
}
