import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  venue: z.string().min(2),
  startsAt: z.string(),
  tierName: z.string().min(2),
  priceMinor: z.number().int().positive(),
  quantity: z.number().int().min(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const event = await prisma.event.create({
    data: { ownerId: userId, name: d.name, venue: d.venue, startsAt: new Date(d.startsAt) },
  });
  const tier = await prisma.ticketTier.create({
    data: { eventId: event.id, name: d.tierName, priceMinor: d.priceMinor, quantity: d.quantity },
  });

  return NextResponse.json({ event, tier }, { status: 201 });
}
