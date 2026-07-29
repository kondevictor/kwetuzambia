import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({ operatorName: z.string().min(2), csv: z.string().min(1) });

/**
 * Bulk manifest upload — paste-CSV, no file storage required.
 * Expected columns (header row required): origin,destination,departAt,arriveAt,basePriceZmw,busPlate,totalSeats
 * departAt/arriveAt are ISO datetime strings (e.g. 2026-08-05T08:00).
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { operatorName, csv } = parsed.data;

  let operator = await prisma.operator.findFirst({ where: { ownerId: userId, name: operatorName } });
  if (!operator) operator = await prisma.operator.create({ data: { name: operatorName, ownerId: userId } });

  const lines = csv.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV needs a header row plus at least one data row" }, { status: 400 });
  }
  const header = lines[0].split(",").map((h) => h.trim());
  const required = ["origin", "destination", "departAt", "arriveAt", "basePriceZmw", "busPlate", "totalSeats"];
  const missing = required.filter((r) => !header.includes(r));
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing CSV columns: ${missing.join(", ")}` }, { status: 400 });
  }

  const created: { origin: string; destination: string; departAt: string }[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    header.forEach((h, idx) => (row[h] = cells[idx] ?? ""));
    try {
      const origin = row.origin;
      const destination = row.destination;
      const departAt = new Date(row.departAt);
      const arriveAt = new Date(row.arriveAt);
      const basePriceMinor = Math.round(Number(row.basePriceZmw) * 100);
      const busPlate = row.busPlate;
      const totalSeats = Number(row.totalSeats);
      if (!origin || !destination || isNaN(departAt.getTime()) || isNaN(arriveAt.getTime()) || !basePriceMinor || !busPlate || !totalSeats) {
        throw new Error("invalid row");
      }
      let route = await prisma.route.findFirst({ where: { operatorId: operator.id, origin, destination } });
      if (!route) route = await prisma.route.create({ data: { operatorId: operator.id, origin, destination } });
      const trip = await prisma.trip.create({
        data: { routeId: route.id, departAt, arriveAt, basePriceMinor, busPlate, totalSeats },
      });
      const seats = Array.from({ length: totalSeats }, (_, i2) => ({ tripId: trip.id, seatNo: String(i2 + 1).padStart(2, "0") }));
      await prisma.seat.createMany({ data: seats });
      created.push({ origin, destination, departAt: departAt.toISOString() });
    } catch {
      errors.push(`Row ${i + 1}: could not parse — check the columns match the header`);
    }
  }

  return NextResponse.json({ operator, createdCount: created.length, created, errors }, { status: 201 });
}
