import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeCommissionOnTop } from "@/lib/pricing";

export async function GET() {
  const events = await prisma.event.findMany({ include: { ticketTiers: true }, orderBy: { startsAt: "asc" } });
  return NextResponse.json({
    events: events.map((e) => ({
      ...e,
      ticketTiers: e.ticketTiers.map((t) => ({
        ...t,
        remaining: t.quantity - t.sold,
        breakdown: computeCommissionOnTop("EVENT", t.priceMinor),
      })),
    })),
  });
}
