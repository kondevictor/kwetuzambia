import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Itemized payout breakdown for the logged-in supplier: every confirmed
 * transaction across their bus/stays/events/services listings, showing what
 * the customer paid vs. what is payable to the supplier (base amount only —
 * Kwetu's commission and VAT are its own revenue, never the supplier's).
 *
 * NOTE: this reads directly from bookings/Commission rather than a
 * per-supplier ledger account — SUPPLIER_PAYABLE is currently a single
 * shared platform account, not split per supplier. This view is a
 * transparency read, not a live balance the ledger tracks per-supplier yet.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const [busBookings, stayBookings, eventTickets, serviceBookings] = await Promise.all([
    prisma.busBooking.findMany({
      where: { status: "CONFIRMED", trip: { route: { operator: { ownerId: userId } } } },
      include: { trip: { include: { route: true } }, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.stayBooking.findMany({
      where: { status: "CONFIRMED", room: { property: { ownerId: userId } } },
      include: { room: { include: { property: true } }, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.eventTicket.findMany({
      where: { status: "CONFIRMED", ticketTier: { event: { ownerId: userId } } },
      include: { ticketTier: { include: { event: true } }, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.serviceBooking.findMany({
      where: { status: { in: ["ACCEPTED", "COMPLETED"] }, listing: { ownerId: userId } },
      include: { listing: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  function payable(totalMinor: number, ratePct: number) {
    // Reverse the commission-on-top math: totalMinor = base*(1+ratePct*1.16)
    return Math.round(totalMinor / (1 + ratePct * 1.16));
  }

  const items = [
    ...busBookings.map((b) => ({
      vertical: "BUS",
      label: `${b.trip.route.origin} → ${b.trip.route.destination}`,
      customer: b.user.name,
      date: b.createdAt,
      totalPaidMinor: b.totalMinor,
      payableToYouMinor: payable(b.totalMinor, 0.07),
    })),
    ...stayBookings.map((b) => ({
      vertical: "ACCOMMODATION",
      label: b.room.property.name,
      customer: b.user.name,
      date: b.createdAt,
      totalPaidMinor: b.totalMinor,
      payableToYouMinor: payable(b.totalMinor, 0.115),
    })),
    ...eventTickets.map((t) => ({
      vertical: "EVENT",
      label: t.ticketTier.event.name,
      customer: t.user.name,
      date: t.createdAt,
      totalPaidMinor: t.totalMinor,
      payableToYouMinor: payable(t.totalMinor, 0.075),
    })),
    ...serviceBookings.map((b) => ({
      vertical: "SERVICE",
      label: b.listing.title,
      customer: b.user.name,
      date: b.createdAt,
      totalPaidMinor: b.totalMinor,
      payableToYouMinor: payable(b.totalMinor, 0.085),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPayableMinor = items.reduce((s, i) => s + i.payableToYouMinor, 0);

  return NextResponse.json({ items, totalPayableMinor, count: items.length });
}
