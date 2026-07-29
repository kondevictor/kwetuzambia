import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rentalListingSchema } from "@/lib/schemas";
import { placementFeeForRental } from "@/lib/pricing";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const listings = await prisma.propertyListing.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ listings });
}

// NOTE: tenant pays the landlord DIRECTLY — this endpoint only handles the
// platform's flat placement fee, never rent itself. That is a deliberate
// decision to avoid holding float / tenancy-law exposure (see KWETU_SPEC.md).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = rentalListingSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const placementFeeMinor = placementFeeForRental(parsed.data.period);
  const listing = await prisma.propertyListing.create({
    data: { ...parsed.data, ownerId: (session.user as any).id, placementFeeMinor },
  });
  return NextResponse.json(listing, { status: 201 });
}
