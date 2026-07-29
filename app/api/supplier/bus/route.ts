import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  operatorName: z.string().min(2),
  origin: z.string().min(2),
  destination: z.string().min(2),
  departAt: z.string(),
  arriveAt: z.string(),
  basePriceMinor: z.number().int().positive(),
  busPlate: z.string().min(3),
  totalSeats: z.number().int().min(4).max(80).default(44),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  let operator = await prisma.operator.findFirst({ where: { ownerId: userId, name: d.operatorName } });
  if (!operator) {
    operator = await prisma.operator.create({ data: { name: d.operatorName, ownerId: userId } });
  }
  const route = await prisma.route.create({ data: { operatorId: operator.id, origin: d.origin, destination: d.destination } });
  const trip = await prisma.trip.create({
    data: {
      routeId: route.id,
      departAt: new Date(d.departAt),
      arriveAt: new Date(d.arriveAt),
      basePriceMinor: d.basePriceMinor,
      busPlate: d.busPlate,
      totalSeats: d.totalSeats,
    },
  });
  const seats = Array.from({ length: d.totalSeats }, (_, i) => ({
    tripId: trip.id,
    seatNo: String(i + 1).padStart(2, "0"),
  }));
  await prisma.seat.createMany({ data: seats });

  return NextResponse.json({ operator, route, trip }, { status: 201 });
}
