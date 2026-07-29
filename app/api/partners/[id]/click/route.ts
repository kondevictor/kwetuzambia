import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Outbound referral attribution: log the click, then the client redirects to
// partner.outboundUrl. Kwetu earns a 4.0% referral commission on attributed
// conversions — reconciliation of actual conversions is out of scope for this
// simulated build (would require the partner's postback/webhook in production).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const partner = await prisma.referralPartner.findUnique({ where: { id: params.id } });
  if (!partner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.referralClick.create({
    data: { partnerId: partner.id, userId: (session?.user as any)?.id },
  });

  return NextResponse.json({ outboundUrl: partner.outboundUrl });
}
