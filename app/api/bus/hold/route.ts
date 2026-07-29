import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const HOLD_MINUTES = 10;

const bodySchema = z.object({ tripId: z.string(), seatNos: z.array(z.string()).min(1) });

/**
 * Inventory hold step (spec P3/FR-01..08): selecting a seat reserves it for a
 * bounded TTL before payment, so two shoppers can't both "select" the same
 * seat and only discover the conflict at checkout. Holds are released early
 * by DELETE, or lazily swept on read (see app/api/bus/trips/[id]/route.ts).
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { tripId, seatNos } = parsed.data;

  try {
    const heldUntil = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
    await prisma.$transaction(async (tx) => {
      const seats = await tx.seat.findMany({ where: { tripId, seatNo: { in: seatNos } } });
      if (seats.length !== seatNos.length) throw new Error("SEAT_NOT_FOUND");
      const unavailable = seats.filter((s) => s.status !== "AVAILABLE");
      if (unavailable.length > 0) throw new Error("SEAT_TAKEN");
      await tx.seat.updateMany({ where: { id: { in: seats.map((s) => s.id) } }, data: { status: "HELD", heldUntil } });
    });
    return NextResponse.json({ held: true, heldUntil });
  } catch (err: any) {
    if (err.message === "SEAT_TAKEN") return NextResponse.json({ error: "One or more seats were just taken." }, { status: 409 });
    if (err.message === "SEAT_NOT_FOUND") return NextResponse.json({ error: "Invalid seat selection" }, { status: 400 });
    return NextResponse.json({ error: "Could not hold seats" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { tripId, seatNos } = parsed.data;
  await prisma.seat.updateMany({ where: { tripId, seatNo: { in: seatNos }, status: "HELD" }, data: { status: "AVAILABLE", heldUntil: null } });
  return NextResponse.json({ released: true });
}
