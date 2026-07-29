import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ussdSchema } from "@/lib/schemas";
import { computeCommissionOnTop } from "@/lib/pricing";

/**
 * SIMULATED USSD endpoint. A real telco USSD gateway (e.g. Africa's Talking)
 * is not integrated in this build — this demonstrates the interaction model
 * (session-based, text-menu, *384*XX# style) so it's pluggable later.
 * Session state is kept in-memory keyed by sessionId (fine for a single dev
 * server; a production build would use Redis/DB-backed session state).
 */
const sessions = new Map<string, { step: number; origin?: string }>();

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = ussdSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { sessionId, text } = parsed.data;

  const parts = text.split("*").filter(Boolean);
  let response = "";
  let continueSession = true;

  if (parts.length === 0) {
    response = "CON Welcome to Kwetu\n1. Bus tickets\n2. My bookings\n3. Wallet balance";
  } else if (parts[0] === "1") {
    if (parts.length === 1) {
      response = "CON Bus tickets\nEnter route number:\n1. Lusaka-Ndola\n2. Lusaka-Livingstone\n3. Lusaka-Kitwe";
    } else if (parts.length === 2) {
      const routes = ["Lusaka-Ndola", "Lusaka-Livingstone", "Lusaka-Kitwe"];
      const idx = Number(parts[1]) - 1;
      const routeName = routes[idx] || "Lusaka-Ndola";
      const [origin, destination] = routeName.split("-");
      const trip = await prisma.trip.findFirst({
        where: { route: { origin, destination } },
        orderBy: { departAt: "asc" },
      });
      if (!trip) {
        response = "END No trips found for this route right now.";
        continueSession = false;
      } else {
        const breakdown = computeCommissionOnTop("BUS", trip.basePriceMinor);
        response = `CON ${routeName}\nDeparts: ${trip.departAt.toLocaleString()}\nFare: ZMW ${(
          breakdown.totalAmountMinor / 100
        ).toFixed(2)}\n1. Confirm (pay via mobile money on the app)\n0. Cancel`;
      }
    } else {
      response = "END To complete payment, please open the Kwetu app or dial back with a valid mobile money PIN flow (simulated).";
      continueSession = false;
    }
  } else if (parts[0] === "2") {
    response = "END Please check 'My bookings' in the Kwetu app for your full booking history.";
    continueSession = false;
  } else if (parts[0] === "3") {
    response = "END Please check 'Wallet' in the Kwetu app for your live balance.";
    continueSession = false;
  } else {
    response = "END Invalid option.";
    continueSession = false;
  }

  if (!continueSession) sessions.delete(sessionId);

  return NextResponse.json({ response, continueSession });
}
