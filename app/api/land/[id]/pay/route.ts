import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runPlacementFeeCheckout } from "@/lib/checkout";
import { z } from "zod";

const bodySchema = z.object({
  method: z.enum(["AIRTEL_MONEY", "MTN_MONEY", "ZAMTEL_KWACHA", "CARD"]),
  msisdnOrCardRef: z.string().min(6),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const listing = await prisma.landListing.findUnique({ where: { id: params.id } });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await runPlacementFeeCheckout({
    userId: (session.user as any).id,
    feeMinor: listing.placementFeeMinor,
    method: parsed.data.method,
    msisdnOrCardRef: parsed.data.msisdnOrCardRef,
    idempotencyKey: `land-placement-${listing.id}`,
    description: `Land listing placement fee ${listing.id}`,
  });

  if (result.status === "SUCCEEDED") {
    await prisma.landListing.update({
      where: { id: listing.id },
      data: { paidUntil: new Date(Date.now() + 30 * 86400000) },
    });
  }

  return NextResponse.json(result);
}
