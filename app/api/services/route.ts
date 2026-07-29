import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeCommissionOnTop } from "@/lib/pricing";

export async function GET() {
  const listings = await prisma.serviceListing.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({
    listings: listings.map((l) => ({ ...l, breakdown: computeCommissionOnTop("SERVICE", l.priceMinor) })),
  });
}
