import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { insuranceQuoteSchema } from "@/lib/schemas";
import { computeCommissionOnTop } from "@/lib/pricing";

// Simple deterministic premium model for the demo: 3% of trip cost, min ZMW 20.
export async function POST(req: Request) {
  const parsed = insuranceQuoteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { productType, tripCostMinor } = parsed.data;

  const premiumMinor = Math.max(2000, Math.round(tripCostMinor * 0.03));
  const quote = await prisma.insuranceQuote.create({
    data: {
      productType,
      premiumMinor,
      coverageSummary:
        productType === "TRAVEL"
          ? "Trip cancellation, medical emergency abroad, baggage loss — up to ZMW 50,000 cover."
          : "Accommodation booking protection — cancellation & property damage cover up to ZMW 20,000.",
    },
  });

  return NextResponse.json({ ...quote, breakdown: computeCommissionOnTop("INSURANCE", premiumMinor) });
}
