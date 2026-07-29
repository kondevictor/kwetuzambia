import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { landListingSchema } from "@/lib/schemas";
import { placementFeeForLand } from "@/lib/pricing";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const listings = await prisma.landListing.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ listings });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = landListingSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const placementFeeMinor = placementFeeForLand(parsed.data.priceMinor);
  const listing = await prisma.landListing.create({
    data: { ...parsed.data, ownerId: (session.user as any).id, placementFeeMinor },
  });
  return NextResponse.json(listing, { status: 201 });
}
