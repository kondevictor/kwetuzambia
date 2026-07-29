import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const operators = await prisma.operator.findMany({
    include: { owner: { select: { name: true, email: true, phone: true } }, routes: { include: { trips: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    operators: operators.map((o) => ({
      id: o.id,
      name: o.name,
      verified: o.verified,
      owner: o.owner,
      routeCount: o.routes.length,
      tripCount: o.routes.reduce((s, r) => s + r.trips.length, 0),
      createdAt: o.createdAt,
    })),
  });
}
