import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const booking = await prisma.busBooking.findUnique({
    where: { id: params.id },
    include: { trip: { include: { route: { include: { operator: true } } } }, seats: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(booking);
}
