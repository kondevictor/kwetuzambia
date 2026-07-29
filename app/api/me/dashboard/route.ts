import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const [wallet, busBookings, stayBookings, eventTickets, serviceBookings, policies] = await Promise.all([
    prisma.wallet.upsert({ where: { userId }, update: {}, create: { userId } }),
    prisma.busBooking.findMany({ where: { userId }, include: { trip: { include: { route: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.stayBooking.findMany({ where: { userId }, include: { room: { include: { property: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.eventTicket.findMany({ where: { userId }, include: { ticketTier: { include: { event: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.serviceBooking.findMany({ where: { userId }, include: { listing: true }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.insurancePolicy.findMany({ where: { userId }, include: { quote: true }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const untilNextReward = 5 - (wallet.completedBookingsCount % 5);

  return NextResponse.json({
    wallet: { ...wallet, untilNextReward: untilNextReward === 5 ? 0 : untilNextReward },
    busBookings,
    stayBookings,
    eventTickets,
    serviceBookings,
    policies,
  });
}
