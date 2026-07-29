import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
  description: z.string().min(5),
  roomType: z.string().min(2),
  ratePerNightMinor: z.number().int().positive(),
  quantity: z.number().int().min(1).default(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const property = await prisma.property.create({
    data: { ownerId: userId, name: d.name, city: d.city, description: d.description },
  });
  const room = await prisma.room.create({
    data: { propertyId: property.id, type: d.roomType, ratePerNightMinor: d.ratePerNightMinor, quantity: d.quantity },
  });

  return NextResponse.json({ property, room }, { status: 201 });
}
