import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeCommissionOnTop } from "@/lib/pricing";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const property = await prisma.property.findUnique({ where: { id: params.id }, include: { rooms: true } });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ...property,
    rooms: property.rooms.map((r) => ({ ...r, breakdown: computeCommissionOnTop("ACCOMMODATION", r.ratePerNightMinor) })),
  });
}
